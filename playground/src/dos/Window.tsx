/**
 * Window — the raised panel with a title bar, plus the two recessed surfaces
 * that live inside it.
 *
 * Pass `labelledBy` an id you also give the title, so the section is named for
 * assistive tech without inventing a heading the design does not show.
 */
import type { Children, ComponentProps, PropsWithChildren } from "yract";
import { createContext, useContext, useId, useRef } from "yract";

export interface WindowProps extends ComponentProps<"section"> {
  /** Shallower drop shadow, for a window nested inside another panel. */
  nested?: boolean;
}

export function* Window({ nested, children, ...rest }: WindowProps) {
  const titleId = yield* useId();
  const ctx = yield* useRef({ titleId });
  return (
    <section
      {...rest}
      className={nested ? "dos-win dos-win--nested" : "dos-win"}
      aria-labelledby={titleId}
    >
      <WindowContext value={ctx.current}>{children}</WindowContext>
    </section>
  );
}

const WindowContext = createContext({ titleId: "" });

export interface WindowBarProps {
  title: Children;
  /** Right-hand slot: a close glyph, a tag list, whatever the window needs. */
  aside?: Children;
}

export function* WindowBar({ title, aside }: WindowBarProps) {
  const { titleId } = yield* useContext(WindowContext);
  return (
    <div className="dos-win__bar">
      <span id={titleId}>{title}</span>
      {!!aside && <span>{aside}</span>}
    </div>
  );
}

export function* WindowBody({ children }: PropsWithChildren) {
  return <div className="dos-win__body">{children}</div>;
}
