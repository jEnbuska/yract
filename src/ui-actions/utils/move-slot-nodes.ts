import type { Slot } from "../../slots/slot";
import {
  componentSlotType,
  contextSlotType,
  elementSlotType,
  fragmentSlotType,
  textSlotType,
} from "../../slots/slot";
import { getMapValuesReversed } from "../../general";

type WithMoveBefore = Node & { moveBefore: (node: Node, child: Node | null) => void };

function moveBefore(parent: Node, node: Node, beforeNode: Node | null) {
  try {
    (parent as WithMoveBefore).moveBefore(node, beforeNode);
    return;
  } catch {
    parent.insertBefore(node, beforeNode);
  }
}

export function moveSlotNodes(slot: Slot, parentDom: Node, beforeNode: Node | null): void {
  switch (slot.type) {
    case componentSlotType:
    case contextSlotType: {
      const node = slot.tailNode;
      moveBefore(parentDom, node, beforeNode);
      beforeNode = node;
      if (slot.instance.slot) {
        moveSlotNodes(slot.instance.slot, parentDom, beforeNode);
        beforeNode = slot.instance.slot.headNode;
      }
      moveBefore(parentDom, slot.headNode, beforeNode);
      break;
    }
    case textSlotType:
    case elementSlotType:
      moveBefore(parentDom, slot.headNode, beforeNode);
      break;
    case fragmentSlotType: {
      const node = slot.tailNode;
      moveBefore(parentDom, node, beforeNode);
      beforeNode = node;
      for (const child of getMapValuesReversed(slot.slots)) {
        moveSlotNodes(child, parentDom, beforeNode);
        beforeNode = child.headNode;
      }
      moveBefore(parentDom, slot.headNode, beforeNode);
      break;
    }
  }
}
