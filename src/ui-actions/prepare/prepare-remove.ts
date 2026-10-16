import type { RemoveSlotAction } from "../types";
import { REMOVE_UI_ACTION } from "../constants";
import type { Slot } from "../../slots/types";

export function prepareRemove(slot: Slot): RemoveSlotAction {
  return {
    type: REMOVE_UI_ACTION,
    slot,
    before: null,
    node: undefined,
    ns: undefined,
    parentDom: undefined,
    patch: undefined,
  };
}
