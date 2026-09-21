/**
 * Screen — the kit root.
 *
 * Every other component reads its palette and font from the `.dos` custom
 * properties declared here, so a DOS interface must live inside one of these.
 *
 * Props extend the element each component returns, so anything the DOM accepts
 * passes straight through. `...rest` is spread first, so the props the kit owns
 * (className, role, aria-*) always win over a caller trying to override them.
 */
import { createContext, use, useId } from "react";
import type { ComponentProps, ReactNode } from "react";

export interface ScreenProps extends ComponentProps<"div"> {
  skipLabel?: string;
  children?: ReactNode;
}

const ScreenContext = createContext({ mainId: "" });

export function Screen({ skipLabel = "Skip to content", children, ...rest }: ScreenProps) {
  const mainId = useId();
  return (
    <div {...rest} className="dos">
      {!!skipLabel && (
        <a className="dos-skip" href={`#${mainId}`}>
          {skipLabel}
        </a>
      )}
      <ScreenContext value={{ mainId }}>{children}</ScreenContext>
    </div>
  );
}

/**
 * The content pane. It carries the id the skip link points at, so a `Screen`
 * needs exactly one of these and nothing else around it.
 */
export function ShellMain({ children, ...rest }: ComponentProps<"div">) {
  const { mainId } = use(ScreenContext);
  return (
    <div {...rest} className="dos-shell__main" id={mainId}>
      {children}
    </div>
  );
}
