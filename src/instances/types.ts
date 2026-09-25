import { type PublicOf } from "../general-types";
import { type ComponentFiber } from "./component-fiber";
import type { AnyElement } from "../render/elements/namespaces";

export type Fiber = PublicOf<ComponentFiber>;
export type FieldValueMap = WeakMap<AnyElement, string | boolean>;
export type FieldSelectionMap = WeakMap<AnyElement, number | null>;
