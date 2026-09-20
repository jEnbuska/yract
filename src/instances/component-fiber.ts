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

  queueRender(reason: symbol): void {
    this.renderReasons.add(reason);
    this.rctx.scheduler.queueRender(this);
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
        scheduler.queuePreCommit(this.parent);
        this.rendered = true;
      }
      this.pendingSlot = mountFiber(this, child);
    } else {
      this.pendingSlot = reconcilerFiber(this, child);
    }
    const { prevInstances } = this;

    if (prevInstances?.size) {
      for (const child of prevInstances.values()) {
        prevInstances.delete(child.path);
        scheduler.ensureUnmount(child);
        if (child.rendered) {
          child.schedulePostCommit(UNMOUNT);
        }
      }
      this.prevInstances = undefined;
    }


    // Always: even a render that changed nothing has to reach the commit, or
    // `slot` never catches up with `pendingSlot` and the prepared-node cache
    // outlives the render that filled it.
    scheduler.scheduleCommit(this);
    // Nothing of ours is in the document yet, so our parent can fold our whole
    // staging fragment into its own and spare us an insert. A parent that has
    // not mounted either queues ITS parent when it renders, so the collapse
    // cascades up to the highest ancestor that is still mounting.
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
   * Runs after render, before commit. A child mounting for the first time emits
   * exactly one action: its own staging fragment inserted before its own tail
   * marker. While that marker is still out of the document the content can be
   * spliced in ahead of it instead — same final position, but it rides along on
   * whichever insert eventually commits the fragment holding it.
   */
  preCommit(): void {
    const __g: any = globalThis as any;
    const __T = (__g.__trace ??= []);
    const __W = (n: any) => ["PersonTableBody", "Defer", "Table"].includes(String(n));
    const __rec = (m: string) => { if (__T.length < 4000) __T.push(`${__T.length} ${m}`); };
    if (__W(this.component?.name))
      __rec(`preCommit ${this.component?.name} d=${this.depth} deferred=${this.isDeferred()} own=${this.uiActions?.length} kids=${this.instances?.size}`);
    this.chunkInserts();
    const { instances } = this;
    if (!instances) return;
    for (const child of instances.values()) {
      const __t = __W(child.component?.name);
      if (child.initialMounted) { if (__t) __rec(`skip ${this.component?.name}->${child.component?.name} initialMounted`); continue; }
      const { uiActions, tailNode } = child;
      if (uiActions?.length !== 1) { if (__t) __rec(`skip ${this.component?.name}->${child.component?.name} actions=${uiActions?.length}`); continue; }
      const action = uiActions[0]!;
      if (action.type !== INSERT_UI_ACTION || action.before !== tailNode) { if (__t) __rec(`skip ${this.component?.name}->${child.component?.name} notOwnTailInsert`); continue; }
      // Already live: the child must do its own insert. Being out of the
      // document covers both a pending fragment and the detached element
      // subtree a nested child sits in.
      if (tailNode.isConnected) { if (__t) __rec(`skip ${this.component?.name}->${child.component?.name} tailConnected`); continue; }
      if (__t) __rec(`HOIST ${this.component?.name}(d=${this.depth}) <- ${child.component?.name}(d=${child.depth}) fragKids=${(action.node as any).childNodes?.length}`);
      tailNode.parentNode!.insertBefore(action.node, tailNode);
      // Emptied rather than dropped: the child still has to reach the commit so
      // `slot` catches up with `pendingSlot` and the prepared-node cache clears.
      uiActions.length = 0;
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
    this.queueRender(PROPS_REASON);
  }
}
