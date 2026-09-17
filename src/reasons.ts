import { $CONTEXT, $STATE } from "./hooks/constants";

export const PROPS_REASON = Symbol("$PROPS");
export const MOUNT_REASON = Symbol("$MOUNT");
export const UNMOUNT = Symbol("$UNMOUNT");

export function createStateReason() {
  return Symbol($STATE);
}

export function createContextReason() {
  return Symbol($CONTEXT);
}
