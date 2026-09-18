import type { ElementSlotType, Slot } from "../../slots/slot";
import type { ElementPatch } from "../../render/element-props";
import type { ElementUpdateAction } from "../types";
import { UPDATE_UI_ACTION } from "../constants";

export function prepareUpdate(
  slot: Slot<ElementSlotType>,
  patch: ElementPatch,
): ElementUpdateAction {
  return {
    type: UPDATE_UI_ACTION,
    slot,
    before: null,
    node: undefined,
    ns: undefined,
    parentDom: undefined,
    patch,
  };
}
