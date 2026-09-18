import type { Slot, TextSlotType } from "../../slots/slot";
import type { TextChangeAction } from "../types";
import { TEXT_UI_ACTION } from "../constants";

export function prepareText(slot: Slot<TextSlotType>): TextChangeAction {
  return {
    type: TEXT_UI_ACTION,
    slot,
    before: null,
    node: undefined,
    ns: undefined,
    parentDom: undefined,
    patch: undefined,
  };
}
