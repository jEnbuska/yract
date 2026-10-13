import { getMapValuesReversed } from "../../general";
import { elementSlotType, fragmentSlotType, textSlotType } from "../../slots/constants";
import type { ComponentSlotType, ContextSlotType, FragmentSlotType, Slot } from "../../slots/types";

export function removeSlotNodes(slot: Slot) {
  switch (slot.type) {
    case textSlotType:
    case elementSlotType:
      slot.headNode.remove();
      break;
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

function removeFragmentNodes({ tailNode, slots, headNode }: Slot<FragmentSlotType>) {
  tailNode.remove();
  const reversed = getMapValuesReversed(slots);
  for (let i = 0; i < reversed.length; i++) {
    const child = reversed[i]!;
    removeSlotNodes(child);
  }
  headNode.remove();
}
