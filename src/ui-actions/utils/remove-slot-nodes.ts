import type { ShallowSlotType, Slot } from "../../slots/slot";
import { shallowSlotType } from "../../slots/slot";
import {
  type ComponentSlotType,
  type ContextSlotType,
  elementSlotType,
  type FragmentSlotType,
  fragmentSlotType,
  textSlotType,
} from "../../slots/slot";
import { getMapValuesReversed } from "../../general";

export function removeSlotNodes(slot: Slot) {
  switch (slot.type) {
    case textSlotType:
    case elementSlotType:
      slot.headNode.remove();
      break;
    case shallowSlotType:
    case fragmentSlotType:
      removeFragmentNodes(slot);
      break;
    default:
      removeInstanceNodes(slot);
  }
}

function removeInstanceNodes(slot: Slot<ContextSlotType | ComponentSlotType>) {
  const { headNode, tailNode, instance } = slot;
  headNode.remove();
  if (instance.slot) removeSlotNodes(instance.slot);
  tailNode.remove();
}

function removeFragmentNodes({
  tailNode,
  slots,
  headNode,
}: Slot<FragmentSlotType | ShallowSlotType>) {
  tailNode.remove();
  const reversed = getMapValuesReversed(slots);
  for (let i = 0; i < reversed.length; i++) {
    const child = reversed[i]!;
    removeSlotNodes(child);
  }
  headNode.remove();
}
