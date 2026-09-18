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
import type { Fiber } from "./types";

export class ComponentFiber<TProps extends Record<string, unknown> = Record<string, any>> {
  public renders: number = 0;
  public readonly ns: TagNamespace;
  public preparedSlots: Map<string, Slot> | undefined = undefined;
  public confidentIteration: number;
  unmounted: boolean | undefined = undefined;
  readonly component: Component<any>;
  readonly depth: number;
  readonly parent: Fiber | null;
  parentDom: Node;
  uiActions?: Array<UIAction> | undefined = undefined;
  ctx: ContextMap;
  readonly rctx: RenderContext;
  instances?: Map<string, Fiber> = undefined;
  unmountInstances?: Map<string, Fiber> = undefined;
  hookStates: HookState[] = [];
  renderReasons = new Set<symbol>();
  resolveReasons?: Set<symbol> = undefined;
  postRenderCallbackReasons?: Set<symbol> = undefined;
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

  queueRender(reason: symbol, deferred?: boolean): void {
    this.renderReasons.add(reason);
    this.rctx.scheduler.queueRender(this, deferred);
  }

  cancelRender(reason: symbol, deferred?: boolean): void {
    const { renderReasons } = this;
    if (!renderReasons.delete(reason)) return;
    if (!renderReasons.size) {
      this.rctx.scheduler.cancelRender(this, deferred);
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

  schedulePostRenderCallback(reason: symbol): void {
    if (this.postRenderCallbackReasons?.has(reason)) return;
    (this.postRenderCallbackReasons ??= new Set()).add(reason);
    this.rctx.scheduler.schedulePostRenderCallback(this);
  }

  cancelPostRenderCallback(reason: symbol): void {
    if (!this.postRenderCallbackReasons?.delete(reason)) return;
    if (this.postRenderCallbackReasons.size) return;
    this.rctx.scheduler.schedulePostRenderCallback(this);
  }

  stack(): string {
    let str = this.parent?.stack() ?? "";
    str += "\t".repeat(this.depth);
    str += `<${this.component.name}>`;
    str += "\n";
    return str;
  }

  render() {
    if (!this.propsPrepared) {
      this.props = stripFrameworkProps<any>(this.props);
      this.propsPrepared = true;
    }
    const generator = this.component(this.props);
    const child = resolveComponentGenerator(generator, this);
    if (!this.slot) {
      this.pendingSlot = mountFiber(this, child);
    } else {
      this.pendingSlot = reconcilerFiber(this, child);
    }
    const { unmountInstances, rctx } = this;
    const { scheduler } = rctx;

    if (unmountInstances?.size) {
      for (const child of unmountInstances.values()) {
        child.unmounted = true;
        if (!child.renders) continue;
        unmountInstances.delete(child.path);
        child.schedulePostRenderCallback(UNMOUNT);
      }
    }
    // Always: even a render that changed nothing has to reach the commit, or
    // `slot` never catches up with `pendingSlot` and the prepared-node cache
    // outlives the render that filled it.
    scheduler.scheduleCommit(this);
    this.renderReasons.clear();
    this.renders++;
  }

  // Rename and flip to isMounted
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
