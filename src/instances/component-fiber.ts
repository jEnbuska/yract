import { resolveContext } from "../context";
import type { Component } from "../jsx";
import type { ContextMap, HookState, RenderContext } from "../render/types";
import { mountFiber, reconcilerFiber } from "../reconciler/reconciler";
import { PROPS_REASON, UNMOUNT } from "../reasons";
import type { ComponentSlotType, ContextSlotType, Slot } from "../slots/slot";
import type { WeakRefLike } from "../render/element-props";
import type { AnyElement, TagNamespace } from "../render/elements/namespaces";
import type { DependencyList, DraftBy } from "../general-types";
import { depsChanged, shallowEqual, stripFrameworkProps } from "../general";
import { DeferContext } from "../hooks/defer";
import { resolveComponentGenerator } from "../render/resolve-component-generator";
import type { UIAction } from "../ui-actions/types";
import { INSERT_UI_ACTION } from "../ui-actions/constants";
import type { Fiber } from "./types";

/**
 * The document fragments a fiber is about to insert. A node inside one of these
 * is still being staged and may be rearranged freely; a node anywhere else is
 * either live or belongs to a commit that is not ours to fold into.
 */
function stagingFragments(uiActions: ReadonlyArray<UIAction>): Set<Node> | undefined {
  let fragments: Set<Node> | undefined;
  for (const action of uiActions) {
    if (action.type !== INSERT_UI_ACTION) continue;
    const { node } = action;
    if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) continue;
    (fragments ??= new Set<Node>()).add(node);
  }
  return fragments;
}

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
  readonly rctx: RenderContext;
  instances?: Map<string, Fiber> = undefined;
  prevInstances?: Map<string, Fiber> = undefined;
  hookStates: HookState[] = [];
  renderReasons = new Set<symbol>();
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
    rctx: RenderContext,
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
    this.rctx = rctx;
    this.props = intent.props as TProps;
    this.deps = intent.props.deps;
    this.depth = (parent?.depth ?? -1) + 1;
    this.ns = ns;
    this.confidentIteration = this.rctx.scheduler.renderIteration;
  }

  isDeferred() {
    return resolveContext(this.ctx, DeferContext);
  }

  scheduleRender(reason: symbol): void {
    this.renderReasons.add(reason);
    this.rctx.scheduler.scheduleRender(this);
  }

  cancelRender(reason: symbol): void {
    const { renderReasons } = this;
    if (!renderReasons.delete(reason)) return;
    if (!renderReasons.size) {
      this.rctx.scheduler.cancelRender(this);
    }
  }

  scheduleStateResolve(reason: symbol): void {
    if (this.resolveReasons?.has(reason)) return;
    (this.resolveReasons ??= new Set()).add(reason);
    this.rctx.scheduler.scheduleStateResolve(this);
  }

  cancelStateResolve(reason: symbol): void {
    const { resolveReasons } = this;
    resolveReasons?.delete(reason);
    if (resolveReasons?.size === 0) {
      this.rctx.scheduler.cancelStateResolve(this);
    }
  }

  schedulePostCommit(reason: symbol): void {
    if (this.postCommitReasons?.has(reason)) return;
    (this.postCommitReasons ??= new Set()).add(reason);
    this.rctx.scheduler.schedulePostCommit(this);
  }

  cancelPostCommit(reason: symbol): void {
    if (!this.postCommitReasons?.delete(reason)) return;
    if (this.postCommitReasons.size) return;
    this.rctx.scheduler.cancelPostCommit(this);
  }

  render() {
    const scheduler = this.rctx.scheduler;
    if (!this.propsPrepared) {
      this.props = stripFrameworkProps<any>(this.props);
      this.propsPrepared = true;
    }
    const generator = this.component(this.props);
    const child = resolveComponentGenerator(generator, this);
    if (!this.slot) {
      if (!this.initialMounted && this.parent) {
        scheduler.schedulePrepareCommit(this.parent);
        this.rendered = true;
      }
      this.pendingSlot = mountFiber(this, child);
    } else {
      this.pendingSlot = reconcilerFiber(this, child);
    }
    const { prevInstances } = this;

    if (prevInstances?.size) {
      for (const child of prevInstances.values()) {
        scheduler.ensureUnmount(child);
        if (child.rendered) child.schedulePostCommit(UNMOUNT);
      }
    }
    this.prevInstances = undefined;
    scheduler.scheduleCommit(this);
    this.renderReasons.clear();
  }

  /**
   * `reconcile` walks children in reverse and hands each new slot the NEXT
   * sibling's head marker as its boundary, so a run of consecutive new slots
   * produces consecutive inserts whose boundaries are internal to the run: the
   * one for slot 7 points at a marker sitting in the fragment of the one for
   * slot 8. Whenever that holds the later fragment absorbs the earlier one and
   * the action disappears — new slots at 3..8 collapse to a single insert.
   */
  private chunkInserts(): void {
    const actions = this.uiActions;
    if (!actions || actions.length < 2) return;
    const merged: UIAction[] = [];
    let chunk: Node | undefined;
    for (const action of actions) {
      if (action.type !== INSERT_UI_ACTION) {
        // An intervening action has to keep its position relative to the
        // inserts around it, so it ends a run.
        chunk = undefined;
        merged.push(action);
        continue;
      }
      const { before, node } = action;
      if (chunk && before && before.parentNode === chunk) {
        chunk.insertBefore(node, before);
        continue;
      }
      chunk = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node : undefined;
      merged.push(action);
    }
    if (merged.length !== actions.length) this.uiActions = merged;
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
    this.chunkInserts();
    const { instances, pendingSlot, uiActions } = this;
    // Nothing of ours is waiting to commit, so there is no fragment to fold
    // anything into. `uiActions` can still hold the actions of an earlier
    // render, and those fragments are committed and empty.
    if (!instances || !pendingSlot || !uiActions?.length) return;
    const staging = stagingFragments(uiActions);
    if (!staging) return;
    const deferred = this.isDeferred();
    for (const child of instances.values()) {
      if (child.initialMounted) continue;
      // A child in the other render group commits in a different batch, so its
      // content must not be made to depend on our insert.
      if (child.isDeferred() !== deferred) continue;
      const { uiActions: childActions, tailNode } = child;
      if (childActions?.length !== 1) continue;
      const action = childActions[0]!;
      if (action.type !== INSERT_UI_ACTION || action.before !== tailNode) continue;
      // Only ever splice into a fragment of ours that has not committed. Every
      // other root — the document, or a detached subtree built by an earlier
      // commit — belongs to someone else, and the child does its own insert.
      if (!staging.has(tailNode.getRootNode())) continue;
      tailNode.parentNode!.insertBefore(action.node, tailNode);
      // Emptied rather than dropped: the child still has to reach the commit so
      // `slot` catches up with `pendingSlot` and the prepared-node cache clears.
      // Emptying is also what makes the fold idempotent — a repeat pass sees
      // zero actions and skips.
      childActions.length = 0;
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
    this.confidentIteration = this.rctx.scheduler.renderIteration;
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
