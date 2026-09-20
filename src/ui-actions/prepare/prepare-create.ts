import type { Intent } from "../../slots/intent";
import type {
  ElementSlotType,
  FragmentSlotType,
  ShallowSlotType,
  TextSlotType,
} from "../../slots/slot";
import type { TagNamespace } from "../../render/elements/namespaces";
import type {
  CreateElementAction,
  CreateFragmentAction,
  CreateShallowAction,
  CreateTextAction,
} from "../types";
import { CREATE_UI_ACTION } from "../constants";

export function prepareCreate(slot: Intent<ElementSlotType>, ns: TagNamespace): CreateElementAction;
export function prepareCreate(
  slot: Intent<FragmentSlotType>,
  ns: TagNamespace,
): CreateFragmentAction;
export function prepareCreate(slot: Intent<TextSlotType>): CreateTextAction;
export function prepareCreate(slot: Intent<ShallowSlotType>, ns: TagNamespace): CreateShallowAction;
export function prepareCreate(slot: any, ns?: TagNamespace) {
  return {
    type: CREATE_UI_ACTION,
    slot,
    before: null,
    node: undefined,
    ns,
    parentDom: undefined,
    patch: undefined,
  };
}
