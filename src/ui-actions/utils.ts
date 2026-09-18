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
import type { DelegationRoot } from "../render/delegation";

/**
 * TEMPORARY instrumentation — counts and times each action kind so a slow
 * commit can be attributed. Call `takeDomActionStats()` after a commit.
 */
const stats = new Map<string, { n: number; ms: number }>();

export function takeDomActionStats(): string {
  const parts: string[] = [];
  for (const [kind, { n, ms }] of stats) parts.push(`${kind} x${n} ${ms.toFixed(1)}ms`);
  stats.clear();
  return parts.length ? parts.join("  |  ") : "(no actions)";
}

export function applyDomAction(action: UIAction, root: DelegationRoot) {
  const started = performance.now();
  let bucket = stats.get(action.type);
  if (!bucket) {
    bucket = { n: 0, ms: 0 };
    stats.set(action.type, bucket);
  }
  try {
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
      updateElementProps(slot.headNode, patch, root);
      break;
    }
  }
  } finally {
    bucket.n++;
    bucket.ms += performance.now() - started;
  }
}
