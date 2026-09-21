/**
 * Window — the raised panel with a title bar, plus the recessed body inside it.
 */
import { createContext, use, useId } from "react";
import type { ComponentProps, ReactNode } from "react";

export interface WindowProps extends ComponentProps<"section"> {
  /** Shallower drop shadow, for a window nested inside another panel. */
  nested?: boolean;
}

const WindowContext = createContext({ titleId: "" });

export function Window({ nested, children, ...rest }: WindowProps) {
  const titleId = useId();
  return (
    <section
      {...rest}
      className={nested ? "dos-win dos-win--nested" : "dos-win"}
      aria-labelledby={titleId}
    >
      <WindowContext value={{ titleId }}>{children}</WindowContext>
    </section>
  );
}

export interface WindowBarProps {
  title: ReactNode;
  /** Right-hand slot: a close glyph, a tag list, whatever the window needs. */
  aside?: ReactNode;
}

export function WindowBar({ title, aside }: WindowBarProps) {
  const { titleId } = use(WindowContext);
  return (
    <div className="dos-win__bar">
      <span id={titleId}>{title}</span>
      {!!aside && <span>{aside}</span>}
    </div>
  );
}

export function WindowBody({ children }: { children?: ReactNode }) {
  return <div className="dos-win__body">{children}</div>;
}
