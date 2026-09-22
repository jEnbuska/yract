import { Scheduler } from "../scheduler/Scheduler";
import { createFiber } from "../instances/create-fiber";
import type { Child } from "../jsx";
import { ComponentFiber } from "../instances/component-fiber";
import { nodeNameSpace } from "./elements/namespaces";
import type { DraftBy } from "../general-types";
import type { ComponentSlotType, Slot } from "../slots/slot";
import { componentSlotType } from "../slots/slot";
import { emptyMap } from "../general";

import { registerCreateInstance } from "../instances/utils";

// Just a hack to fix circular imports
registerCreateInstance(createFiber);

export class Root {
  readonly container: Element;
  private readonly scheduler: Scheduler;
  private readonly rootInstance: RootInstance;

  constructor(container: Element) {
    this.container = container;
    this.scheduler = new Scheduler();
    this.rootInstance = new RootInstance(this.scheduler, container);
  }

  render(child: Child) {
    this.rootInstance.run(child);
  }

  /** Tear down the root and clean up event listeners. */
  unmount(): void {
    this.container.textContent = "";
  }
}

class RootInstance extends ComponentFiber {
  child: Child = null;
  constructor(scheduler: Scheduler, container: Element) {
    const headNode = document.createComment("<Root>");
    const tailNode = document.createComment("</Root>");
    const ns = nodeNameSpace(container);
    const intent: DraftBy<Slot<ComponentSlotType>, "instance" | "prevProps"> = {
      _key: undefined,
      children: undefined,
      component: function* Root() {
        return getChild();
      },
      context: undefined,
      element: undefined,
      headNode,
      index: 0,
      instance: undefined,
      key: "root",
      stable: undefined,
      path: "",
      prevProps: undefined,
      prevText: undefined,
      props: {},
      slots: emptyMap,
      tailNode: tailNode,
      text: undefined,
      type: componentSlotType,
    };
    super(intent, new Map(), null, scheduler, container, ns);
    const getChild = () => this.child;
  }

  run(child: Child) {
    this.child = child;
    this.parentDom.appendChild(this.headNode);
    this.parentDom.appendChild(this.tailNode);
    this.scheduleRender(Symbol("MOUNT"));
  }
}
