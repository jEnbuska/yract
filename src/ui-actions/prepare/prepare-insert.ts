import type { InsertAction } from "../types";
import { INSERT_UI_ACTION } from "../constants";

export function prepareInsert(parentDom: Node, node: Node, before: Node | null): InsertAction {
  return {
    type: INSERT_UI_ACTION,
    slot: undefined,
    before,
    node,
    ns: undefined,
    parentDom,
    patch: undefined,
  };
}
