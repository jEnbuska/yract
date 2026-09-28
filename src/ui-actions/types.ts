import type { TagNamespace } from "../render/elements/namespaces";
import type { ElementPatch } from "../render/element-props";
import type { Intent } from "../slots/intent";
import type { ElementSlotType, Slot, TextSlotType } from "../slots/slot";
import type {
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
/** @internal */
export type MoveAction = Delegated<{
  before: Node | null;
  node: undefined;
  ns: undefined;
  parentDom: Node;
  patch: undefined;
  slot: Slot;
  type: typeof MOVE_UI_ACTION;
}>;
/** @internal */
export type InsertAction = Delegated<{
  before: Node | null;
  node: Node;
  ns: undefined;
  parentDom: Node;
  patch: undefined;
  slot: undefined;
  type: typeof INSERT_UI_ACTION;
}>;
/** @internal */
export type ElementUpdateAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: ElementPatch;
  slot: Slot<ElementSlotType>;
  type: typeof UPDATE_UI_ACTION;
}>;
/** @internal */
export type TextChangeAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: undefined;
  slot: Slot<TextSlotType>;
  type: typeof TEXT_UI_ACTION;
}>;
/** @internal */
export type RemoveSlotAction = Delegated<{
  before: null;
  node: undefined;
  ns: undefined;
  parentDom: undefined;
  patch: undefined;
  slot: Slot;
  type: typeof REMOVE_UI_ACTION;
}>;

/** @internal */
export type UIAction =
  | InsertAction
  | MoveAction
  | TextChangeAction
  | ElementUpdateAction
  | RemoveSlotAction;
