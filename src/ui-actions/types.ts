import type { TagNamespace } from "../render/elements/namespaces";
import type { ElementPatch } from "../render/element-props";
import type { Intent } from "../slots/intent";
import type {
  ElementSlotType,
  FragmentSlotType,
  ShallowSlotType,
  Slot,
  TextSlotType,
} from "../slots/slot";
import type {
  CREATE_UI_ACTION,
  INSERT_UI_ACTION,
  MOVE_UI_ACTION,
  REMOVE_UI_ACTION,
  TEXT_UI_ACTION,
  UPDATE_UI_ACTION,
} from "./constants";

type UIActionShape = {
  before: Node | null;
  node: Node | undefined;
  ns: TagNamespace | undefined;
  parentDom: Node | undefined;
  patch: undefined | ElementPatch;
  slot: Intent | undefined;
  type: string;
};
type Delegated<T extends UIActionShape> = Pick<T, keyof UIActionShape>;
export type CreateElementAction = Delegated<{
  before: null;
  node: undefined;
  ns: TagNamespace;
  parentDom: undefined;
  patch: undefined;
  slot: Intent<ElementSlotType>;
  type: typeof CREATE_UI_ACTION;
}>;
export type CreateFragmentAction = Delegated<{
  before: null;
  node: undefined;
  ns: TagNamespace;
  parentDom: undefined;
  patch: undefined;
  slot: Intent<FragmentSlotType>;
  type: typeof CREATE_UI_ACTION;
}>;
export type CreateShallowAction = Delegated<{
  before: null;
  node: undefined;
  ns: TagNamespace;
  parentDom: undefined;
  patch: undefined;
  slot: Intent<ShallowSlotType>;
  type: typeof CREATE_UI_ACTION;
}>;
export type CreateTextAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: undefined;
  slot: Intent<TextSlotType>;
  type: typeof CREATE_UI_ACTION;
}>;
export type MoveAction = Delegated<{
  before: Node | null;
  node: undefined;
  ns: undefined;
  parentDom: Node;
  patch: undefined;
  slot: Slot;
  type: typeof MOVE_UI_ACTION;
}>;
export type InsertAction = Delegated<{
  before: Node | null;
  node: Node;
  ns: undefined;
  parentDom: Node;
  patch: undefined;
  slot: undefined;
  type: typeof INSERT_UI_ACTION;
}>;
export type ElementUpdateAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: ElementPatch;
  slot: Slot<ElementSlotType>;
  type: typeof UPDATE_UI_ACTION;
}>;
export type TextChangeAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: undefined;
  slot: Slot<TextSlotType>;
  type: typeof TEXT_UI_ACTION;
}>;
export type RemoveSlotAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: undefined;
  slot: Slot;
  type: typeof REMOVE_UI_ACTION;
}>;

export type UIAction =
  | InsertAction
  | MoveAction
  | TextChangeAction
  | ElementUpdateAction
  | RemoveSlotAction;
