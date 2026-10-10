import type { Component } from "../jsx";
import type { ContextMap } from "../render/types";
import { mountFiber, reconcilerFiber } from "../reconciler/reconciler";
import type { ComponentSlotType, ContextSlotType, Slot } from "../slots/slot";
import type { TagNamespace } from "../render/elements/namespaces";
import type { DependencyList, DraftBy } from "../general-types";
import { depsChanged, shallowEqual, stripFrameworkProps } from "../general";
import { resolveComponentGenerator } from "../render/resolve-component-generator";
import type { UIAction } from "../ui-actions/types";
import type { Fiber } from "./types";
import type { Scheduler } from "../scheduler/Scheduler";
import { chunkInserts, foldSubtreeIntoStaging } from "./utils";
import type { HookState } from "../hooks/hook-states";

/** @internal */
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
  deferred: boolean = false;
  prevInstances?: Map<string, Fiber> = undefined;
  hookStates?: HookState[] = undefined;
  slot?: Slot = undefined;
  pendingSlot?: Slot = undefined;
  protected props: TProps;
  protected preparedProps: TProps | undefined = undefined;
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

  render() {
    const { scheduler, deferred } = this;
    const props = (this.preparedProps = stripFrameworkProps<any>(this.props));
    const generator = this.component(props);
    const child = resolveComponentGenerator(generator, this);
    if (!this.slot) {
      // Not mounted yet
      this.pendingSlot = mountFiber(this, child);
      if (this.parent?.slot) {
        // Parent is mounted
        scheduler.schedulePrepareChunk(this.parent, deferred /* TODO .. or parent.deferred?*/);
      }
    } else {
      // Is mounted (re-render)
      this.pendingSlot = reconcilerFiber(this, child);
      if (this.uiActions?.length) {
        scheduler.scheduleCommit(this, deferred);
      } else {
        scheduler.cancelCommit(this, deferred);
      }
    }
    const { prevInstances } = this;

    if (prevInstances?.size) {
      for (const child of prevInstances.values()) {
        child.unmounted = true;
        if (!this.slot && !this.pendingSlot) {
          scheduler.cancelRender(child, deferred);
          continue;
        }
        scheduler.ensureUnmount(child, deferred);
      }
    }
    this.prevInstances = undefined;
  }

  /** Build the new child components subtree of screen, before commit phase.
   * Entry point. Only ever called for a mounted parent with newly mounting children.*/
  prepareChunk(): void {
    this.uiActions = chunkInserts(this.uiActions);
    const { instances } = this;
    if (!instances) return;
    for (const child of instances.values()) {
      if (child.slot) continue; // Mounted: its content is live.
      foldSubtreeIntoStaging(child);
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
  ): boolean {
    this.confidentIteration = this.scheduler.renderIteration;
    const { deps } = intent.props;
    if (!depsChanged(this.deps, deps)) return false;
    this.deps = deps;
    const { props } = intent;
    if (shallowEqual(this.props, props)) return false;
    this.props = props as TProps;
    this.preparedProps = undefined;
    return true;
  }
}
