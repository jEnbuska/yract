import { $CONTEXT, $STATE } from "./hooks/constants";

/** @internal */
export const PROPS_REASON = Symbol("$PROPS");
/** @internal */
export const MOUNT_REASON = Symbol("$MOUNT");

/** @internal */
export function createStateReason() {
  return Symbol($STATE);
}

/** @internal */
export function createContextReason() {
  return Symbol($CONTEXT);
}
