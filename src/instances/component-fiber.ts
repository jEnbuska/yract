import { resolveContext } from "../context";
import type { Component } from "../jsx";
import type { ContextMap, HookState } from "../render/types";
import { mountFiber, reconcilerFiber } from "../reconciler/reconciler";
import { PROPS_REASON } from "../reasons";
import type { ComponentSlotType, ContextSlotType, Slot } from "../slots/slot";
import type { WeakRefLike } from "../render/element-props";
import type { AnyElement, TagNamespace } from "../render/elements/namespaces";
import type { DependencyList, DraftBy } from "../general-types";
import { depsChanged, shallowEqual, stripFrameworkProps } from "../general";
import { DeferContext } from "../hooks/defer";
import { resolveComponentGenerator } from "../render/resolve-component-generator";
import type { InsertAction, UIAction } from "../ui-actions/types";
import type { Fiber } from "./types";
import type { Scheduler } from "../scheduler/Scheduler";
import { chunkInserts, stagingFragments } from "./utils";

export class ComponentFiber<TProps extends Record<string, unknown> = Record<string, any>> {
  public rendered: boolean = false;
  public readonly ns: TagNamespace;
  public confidentIteration: number;
  initialMounted = false;
  unmounted: boolean | undefined = undefined;
  readonly component: Component<any>;
  readonly depth: number;
  readonly parent: Fiber | null;
  parentDom: Node;
  uiActions?: Array<UIAction> | undefined = undefined;
  ctx: ContextMap;
  readonly scheduler: Scheduler;
  instances?: Map<string, Fiber> = undefined;
  prevInstances?: Map<string, Fiber> = undefined;
  hookStates?: HookState[] = undefined;
  renderReasons?: Set<symbol> = undefined;
  resolveReasons?: Set<symbol> = undefined;
  postCommitReasons?: Set<symbol> = undefined;
  refsToAssign?: Map<WeakRefLike, AnyElement> = undefined;
  slot?: Slot = undefined;
  pendingSlot?: Slot = undefined;
  protected props: TProps;
  protected propsPrepared = false;
  readonly headNode: Comment;
  readonly tailNode: Comment;
  deps?: DependencyList;
  readonly path: string;

  constructor(
    intent: Omit<DraftBy<Slot<ComponentSlotType>, "instance" | "prevProps">, "type">,
    ctx: ContextMap,
    parent: Fiber | null,
    scheduler: Scheduler,
    parentDom: Node,
    ns: TagNamespace,
  ) {
    this.headNode = intent.headNode;
    this.tailNode = intent.tailNode;
    this.path = intent.path;
    this.component = intent.component;
    this.parent = parent;
    this.ctx = ctx;
    this.parentDom = parentDom;
    this.scheduler = scheduler;
    this.props = intent.props as TProps;
    this.deps = intent.props.deps;
    this.depth = (parent?.depth ?? -1) + 1;
    this.ns = ns;
    this.confidentIteration = scheduler.renderIteration;
  }

  isDeferred() {
    return resolveContext(this.ctx, DeferContext);
  }

  scheduleRender(reason: symbol): void {
    (this.renderReasons ??= new Set<symbol>()).add(reason);
    this.scheduler.scheduleRender(this);
  }

  cancelRender(reason: symbol): void {
    const { renderReasons } = this;
    if (!renderReasons?.delete(reason)) return;
    if (!renderReasons.size) {
      this.scheduler.cancelRender(this);
    }
  }

  scheduleStateResolve(reason: symbol): void {
    if (this.resolveReasons?.has(reason)) return;
    (this.resolveReasons ??= new Set()).add(reason);
    this.scheduler.scheduleStateResolve(this);
  }

  cancelStateResolve(reason: symbol): void {
    const { resolveReasons } = this;
    resolveReasons?.delete(reason);
    if (resolveReasons?.size === 0) {
      this.scheduler.cancelStateResolve(this);
    }
  }

  schedulePostCommit(reason: symbol): void {
    if (this.postCommitReasons?.has(reason)) return;
    (this.postCommitReasons ??= new Set()).add(reason);
    this.scheduler.schedulePostCommit(this);
  }

  cancelPostCommit(reason: symbol): void {
    if (!this.postCommitReasons?.delete(reason)) return;
    if (this.postCommitReasons.size) return;
    this.scheduler.cancelPostCommit(this);
  }

  render() {
    const { scheduler } = this;
    if (!this.propsPrepared) {
      this.props = stripFrameworkProps<any>(this.props);
      this.propsPrepared = true;
    }
    const generator = this.component(this.props);
    const child = resolveComponentGenerator(generator, this);
    if (!this.slot) {
      if (!this.initialMounted && this.parent?.initialMounted) {
        scheduler.schedulePrepareCommit(this.parent);
      }
      this.rendered = true;
      this.pendingSlot = mountFiber(this, child);
    } else {
      this.pendingSlot = reconcilerFiber(this, child);
    }
    const { prevInstances } = this;

    if (prevInstances?.size) {
      for (const child of prevInstances.values()) {
        child.unmounted = true;
        if (!child.rendered) {
          scheduler.cancelRender(child);
          continue;
        }
        scheduler.ensureUnmount(child);
      }
    }
    this.prevInstances = undefined;
    scheduler.scheduleCommit(this);
    this.renderReasons?.clear();
  }

  /**
   * Runs between render and commit and rewrites this fiber's `uiActions` so the
   * commit that eventually applies them touches the live DOM as few times as
   * possible. It is purely an optimisation — never a correctness step — and two
   * invariants keep it that way:
   *
   * 1. **It never updates live DOM.** The only nodes it moves are ones sitting
   *    inside a staging fragment this fiber produced during a render that has
   *    not committed yet. Anything already in the document, and any detached
   *    subtree an earlier commit built, is left alone, so a prepare pass is
   *    never observable — no layout, no paint, no measurable difference.
   *
   * 2. **It is interruptible.** Deferred rendering gives no guarantee about who
   *    runs this or when: a fiber may be skipped entirely, a child may be
   *    prepared long after its parent, a parent long after its child, and a
   *    pass may be abandoned part-way through the queue. So every step is
   *    optional and idempotent — running it zero times, once, or repeatedly, in
   *    any order, has to leave the same DOM behind. Skipping a fiber only costs
   *    extra DOM operations at commit.
   *
   * The optimisation itself: a child mounting for the first time emits exactly
   * one action — its own staging fragment inserted before its own tail marker.
   * While that marker is still sitting in a fragment of ours, the content can
   * be spliced in ahead of it instead, reaching the same final position but
   * riding along on our insert. A child that already committed once, or that
   * belongs to the other render group and so commits in a different batch, must
   * keep its own insert: folding it into our fragment would tie its content to
   * a commit that happens later, or never.
   */
  prepareCommit(): void {
    this.uiActions = chunkInserts(this.uiActions);
    const { instances, pendingSlot, uiActions } = this;
    // Nothing of ours is waiting to commit, so there is no fragment to fold
    // anything into. `uiActions` can still hold the actions of an earlier
    // render, and those fragments are committed and empty.
    if (!instances || !pendingSlot || !uiActions?.length) return;
    const staging = stagingFragments(uiActions);
    if (!staging) return;
    for (const child of instances.values()) {
      child.prepareCommit();
      if (child.initialMounted) continue;

      // A child in the other render group commits in a different batch, so its
      // content must not be made to depend on our insert.
      const { uiActions: childActions, tailNode } = child;
      const action = childActions![0]! as InsertAction;
      // Only ever splice into a fragment of ours that has not committed. Every
      // other root — the document, or a detached subtree built by an earlier
      // commit — belongs to someone else, and the child does its own insert.
      if (!staging.has(tailNode.getRootNode())) continue;
      tailNode.parentNode!.insertBefore(action.node, tailNode);
      // Emptied rather than dropped: the child still has to reach the commit so
      // `slot` catches up with `pendingSlot` and the prepared-node cache clears.
      // Emptying is also what makes the fold idempotent — a repeat pass sees
      // zero actions and skips.
      childActions!.length = 0;
      child.prepareCommit();
    }
  }

  isUnmounted(renderIteration: number): boolean {
    if (this.unmounted) return true;
    if (this.confidentIteration === renderIteration) return false;
    // Walking up the parent chain has to start somewhere, and the cursor is
    // reassigned on every step.
    // oxlint-disable-next-line typescript/no-this-alias
    let parent = this.parent;
    while (parent) {
      if (parent.unmounted) return true;
      if (parent.confidentIteration === renderIteration) return false;
      parent = parent.parent;
    }
    return false;
  }

  setProps(
    intent: Omit<
      DraftBy<Slot<ComponentSlotType | ContextSlotType>, "instance" | "prevProps">,
      "type"
    >,
  ): void {
    this.confidentIteration = this.scheduler.renderIteration;
    const { deps } = intent.props;
    if (!depsChanged(this.deps, deps)) return;
    this.deps = deps;
    const { props } = intent;
    if (shallowEqual(this.props, props)) return;
    this.props = props as TProps;
    this.propsPrepared = false;
    this.scheduleRender(PROPS_REASON);
  }
}
