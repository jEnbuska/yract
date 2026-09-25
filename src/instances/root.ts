import { Scheduler } from "../scheduler/Scheduler";
import { createFiber } from "./create-fiber";
import type { Child } from "../jsx";
import { ComponentFiber } from "./component-fiber";
import { nodeNameSpace } from "../render/elements/namespaces";
import type { DraftBy } from "../general-types";
import type { ComponentSlotType, Slot } from "../slots/slot";
import { componentSlotType } from "../slots/slot";
import { emptyMap } from "../general";

import { registerCreateInstance } from "./utils";
import type { FieldSelectionMap, FieldValueMap } from "./types";

// Just a hack to fix circular imports
registerCreateInstance(createFiber);

export class Root {
  readonly container: Element;
  private readonly scheduler: Scheduler;
  private readonly rootInstance: RootInstance;
  private readonly valueMap: FieldValueMap = new WeakMap();
  private readonly selectionMap: FieldSelectionMap;

  constructor(container: Element) {
    this.container = container;
    this.selectionMap = new WeakMap();
    this.scheduler = new Scheduler(this.selectionMap, this.valueMap);
    this.rootInstance = new RootInstance(this.scheduler, container);
    this.setupStoreClickableFormValuesBeforeChange();
    this.setupStoreTextValuesOnBeforeChange();
    this.setupStoreCursorPositionAndRestoreValueOnChange();
    this.setupSetSelectStoredValueOnMount();
  }

  render(child: Child) {
    this.rootInstance.run(child);
  }

  private setupStoreClickableFormValuesBeforeChange() {
    const { valueMap } = this;
    this.container.addEventListener(
      "focus",
      function onFocusCapture(e) {
        if (e.target instanceof HTMLSelectElement) {
          const target = e.target;
          valueMap.set(target, target.value ?? "");
        } else if (e.target instanceof HTMLInputElement) {
          const target = e.target;
          switch (e.target.type) {
            case "checkbox":
            case "radio": {
              valueMap.set(target, Boolean(target.checked));
              break;
            }
          }
        }
      },
      { capture: true },
    );

    this.container.addEventListener(
      "mousedown",
      function onMouseDown(e) {
        if (!(e.target instanceof HTMLInputElement)) return;
        const target = e.target;
        if (e.target.type !== "range") return;
        console.log("target.value", target.value);
        valueMap.set(target, target.value);
      },
      { capture: true },
    );
  }

  private setupStoreTextValuesOnBeforeChange() {
    const { block } = this.scheduler;
    const { valueMap } = this;
    this.container.addEventListener(
      "beforeinput",
      function onBeforeInputCapture(e) {
        block();
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        valueMap.set(target, target.value ?? "");
      },
      { capture: true },
    );
  }

  private setupStoreCursorPositionAndRestoreValueOnChange() {
    const { valueMap, selectionMap, scheduler } = this;
    this.container.addEventListener("input", function onChange(e) {
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const { type } = target;
      if (type === "checkbox" || type === "radio") {
        const el = target as HTMLInputElement;
        el.checked = Boolean(valueMap.get(el));
      } else {
        if (target.localName !== "select") {
          const el = target as HTMLInputElement | HTMLTextAreaElement;
          selectionMap.set(el, el.selectionStart);
        }
        target.value = `${valueMap.get(target) ?? ""}`;
      }
      scheduler.unBlock();
    });
  }

  /** Select component's might be added to the tree during DOM creation before it's <option>'s, at-least chrome resets the selects value to empty
   * in this case automatically, that's why we need to ensure after render that the select actually keeps it's value after UI commit */
  setupSetSelectStoredValueOnMount() {
    const { valueMap } = this;
    function setSelectsInitialValue(select: HTMLSelectElement) {
      select.value = `${valueMap.get(select)}`;
    }
    const observer = new MutationObserver(function mutationCallback(mutations) {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches("select")) setSelectsInitialValue(node as HTMLSelectElement);
          else node.querySelectorAll("select").forEach(setSelectsInitialValue);
        }
      }
    });
    observer.observe(this.container, { childList: true, subtree: true });
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
