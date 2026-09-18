import type { Fiber } from "../instances/types";
import { updateElementProps } from "../render/element-props";
import type { UIAction } from "./types";
import {
  INSERT_UI_ACTION,
  MOVE_UI_ACTION,
  REMOVE_UI_ACTION,
  TEXT_UI_ACTION,
  UPDATE_UI_ACTION,
} from "./constants";
import { removeSlotNodes } from "./utils/remove-slot-nodes";
import { moveSlotNodes } from "./utils/move-slot-nodes";
import { insertNode } from "./utils/insert-node";

export function applyDomAction(action: UIAction, fiber: Fiber) {
  switch (action.type) {
    case MOVE_UI_ACTION: {
      moveSlotNodes(action.slot, action.parentDom, action.before);
      break;
    }
    case REMOVE_UI_ACTION:
      removeSlotNodes(action.slot);
      break;
    case INSERT_UI_ACTION:
      insertNode(action.parentDom, action.node, action.before);
      break;
    case TEXT_UI_ACTION: {
      const { slot } = action;
      slot.headNode.textContent = slot.text;
      break;
    }
    case UPDATE_UI_ACTION: {
      const { slot, patch } = action;
      updateElementProps(slot.headNode, patch, fiber.rctx.delegationRoot);
      break;
    }
  }
}
