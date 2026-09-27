import { resolveContext } from "../context";
import type { Component } from "../jsx";
import type { ContextMap, HookState } from "../render/types";
import { mountFiber, reconcilerFiber } from "../reconciler/reconciler";
import { PROPS_REASON } from "../reasons";
import type { ComponentSlotType, ContextSlotType, Slot } from "../slots/slot";
import type { TagNamespace } from "../render/elements/namespaces";
import type { DependencyList, DraftBy } from "../general-types";
import { depsChanged, shallowEqual, stripFrameworkProps } from "../general";
import { DeferContext } from "../hooks/defer";
import { resolveComponentGenerator } from "../render/resolve-component-generator";
import type { UIAction } from "../ui-actions/types";
import type { Fiber } from "./types";
import type { Scheduler } from "../scheduler/Scheduler";
import { chunkInserts, foldIntoStaging, prepareMountChunk } from "./utils";

export class ComponentFiber<TProps extends Record<string, unknown> = Record<string, any>> {
  public readonly ns: TagNamespace;
  public confidentIteration: number;
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

  render() {
    const { scheduler } = this;
    if (!this.propsPrepared) {
      this.props = stripFrameworkProps<any>(this.props);
      this.propsPrepared = true;
    }
    const generator = this.component(this.props);
    const child = resolveComponentGenerator(generator, this);
    if (!this.slot) {
      // Not mounted yet
      this.pendingSlot = mountFiber(this, child);
      if (this.parent?.slot) {
        // Parent is mounted
        scheduler.schedulePrepareChunk(this.parent);
      }
    } else {
      // Is mounted (re-render)
      this.pendingSlot = reconcilerFiber(this, child);
      if (this.uiActions?.length) {
        scheduler.scheduleCommit(this);
      } else {
        scheduler.cancelCommit(this);
      }
    }
    const { prevInstances } = this;

    if (prevInstances?.size) {
      for (const child of prevInstances.values()) {
        child.unmounted = true;
        if (!this.slot && !this.pendingSlot) {
          scheduler.cancelRender(child);
          continue;
        }
        scheduler.ensureUnmount(child);
      }
    }
    this.prevInstances = undefined;
    this.renderReasons?.clear();
  }

  /** Build the new child components subtree of screen, before commit phase.
   * Entry point. Only ever called for a mounted parent with newly mounting children.*/
  prepareChunk(): void {
    this.uiActions = chunkInserts(this.uiActions);
    const { instances } = this;
    if (!instances) return;
    for (const child of instances.values()) {
      if (child.slot) continue; // Mounted: its content is live.
      if (child.isDeferred() !== this.isDeferred()) continue; // Commits in the other group.
      prepareMountChunk(child);
    }
  }

  isUnmounted(renderIteration: number): boolean {
    if (this.unmounted) return true;
    if (this.confidentIteration === renderIteration) return false;
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
