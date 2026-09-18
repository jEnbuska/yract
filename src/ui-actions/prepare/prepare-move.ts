import type { Slot } from "../../slots/slot";
import type { MoveAction } from "../types";
import { MOVE_UI_ACTION } from "../constants";

export function prepareMove(parentDom: Node, slot: Slot, before: Node | null): MoveAction {
  return {
    type: MOVE_UI_ACTION,
    slot,
    before,
    node: undefined,
    ns: undefined,
    parentDom,
    patch: undefined,
  };
}
