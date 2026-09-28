import { type PublicOf } from "../general-types";
import { type ComponentFiber } from "./component-fiber";
import type { AnyElement } from "../render/elements/namespaces";

/** @internal */
export type Fiber = PublicOf<ComponentFiber>;
/** @internal */
export type FieldValueMap = WeakMap<AnyElement, string | boolean>;
/** @internal */
export type FieldSelectionMap = WeakMap<AnyElement, number | null>;
