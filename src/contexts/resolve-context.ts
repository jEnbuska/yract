import type { ContextMap } from "../render/types";
import type { Context } from "./types";

export function resolveContext<T>(map: ContextMap | undefined, ctx: Context<T>): T {
  const handle = map?.get(ctx.id);
  return (handle?.ref.current as T) ?? ctx.ref.current;
}
