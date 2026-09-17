/**
 * Loaders — one for each thing you might know about the wait.
 *
 * `Progress` when you know the total, `LoaderTrain` when you do not,
 * `Spinner` for a short pause, `Clock` for a dial you point yourself,
 * `Cursor` for a prompt still waiting on input.
 */
import { useContext } from "yract";
import type { Children, ComponentProps } from "yract";
import { FieldContext } from "./contexts";

export interface ProgressProps extends ComponentProps<"progress"> {
  value: number;
  max?: number;
}

/** Determinate bar. Label it with a `FieldLabel` inside a `Field`. */
export function* Progress({ value, max = 100, ...rest }: ProgressProps) {
  const { controlId, descriptionId } = yield* useContext(FieldContext);
  return (
    <progress
      aria-describedby={descriptionId}
      {...rest}
      className="dos-progress"
      id={controlId}
      value={value}
      max={max}
    />
  );
}

export interface LoaderTrainProps extends ComponentProps<"div"> {
  /** What is being waited on. Announced in place of a percentage. */
  label: string;
}

/**
 * Indeterminate bar. A progressbar with no value is announced as such, which
 * is the honest thing to say when no total is known.
 */
export function* LoaderTrain({ label, ...rest }: LoaderTrainProps) {
  return <div {...rest} className="dos-loader-train" role="progressbar" aria-label={label} />;
}

/**
 * The four-character spinner. The glyph is decorative; the surrounding text is
 * what gets announced, so wrap it in a live region with `Status`.
 */
export function* Spinner(props: ComponentProps<"span">) {
  return <span {...props} className="dos-spinner" aria-hidden="true" />;
}

export interface ClockTail {
  /** Where this tail points, in degrees clockwise from twelve o'clock. */
  degrees: number;
  /** 0-1, clamped. Defaults to fully opaque. */
  opacity?: number;
  /**
   * How wide this tail is, as a fraction of a full turn. Clamped to 0-1.
   * Falls back to the dial's `tailWidth`.
   */
  width?: number;
  /** Optional text, laid flat at the middle of the wedge. */
  label?: string;
  /**
   * Draw a dot at this angle instead of a wedge. It sits at
   * `--dos-clock-dot-radius` out from the centre, so on a banded dial it lands
   * in the middle of the band rather than sweeping the whole spoke.
   */
  dot?: boolean;
  /**
   * Narrow this one wedge to a slice of the dial's radius, as percentages of
   * it. Both default to the dial's own band, so a tail spans the full width
   * unless it asks not to.
   */
  innerRadius?: number;
  outerRadius?: number;
  /** Paint this one wedge in its own colour instead of the dial's. */
  color?: string;
}

export interface ClockProps extends ComponentProps<"span"> {
  /**
   * One wedge per entry, each placed, faded and sized independently. Spacing
   * them a width apart with falling opacity reads as a comet trail, but
   * nothing requires that — they may sit anywhere on the dial.
   */
  tails: readonly ClockTail[];
  /** Default width for tails that do not carry their own. A hairline. */
  tailWidth?: number;
  /** Diameter of the dial, as any CSS length. */
  size?: string;
}

const clamp = (value: number): number => Math.min(Math.max(value, 0), 1);

/**
 * Clock face with tails sweeping out from its centre.
 *
 * It holds no state and runs no animation of its own: the caller places every
 * tail, so the same dial can track elapsed time, progress, or a value that has
 * nothing to do with clocks. Decorative, like `Spinner` — put the words in a
 * `Status` beside it.
 */
export function* Clock({ tails, tailWidth = 0.02, size = "4rem", style, ...rest }: ClockProps) {
  return (
    <span
      {...rest}
      className="dos-clock"
      aria-hidden="true"
      style={{ "--dos-clock-size": size, ...style }}
    >
      {tails.map(
        (
          { degrees, opacity = 1, width = tailWidth, dot, innerRadius, outerRadius, color },
          index,
        ) =>
          dot ? (
            <span
              key={`tail-${index}`}
              className="dos-clock-dot"
              style={{
                "--dos-clock-degrees": `${degrees}deg`,
                "--dos-clock-tail-opacity": `${clamp(opacity)}`,
              }}
            />
          ) : (
            <span
              key={`tail-${index}`}
              className="dos-clock-tail"
              style={{
                "--dos-clock-degrees": `${degrees}deg`,
                "--dos-clock-tail-opacity": `${clamp(opacity)}`,
                "--dos-clock-tail-width": `${clamp(width)}`,
                ...(innerRadius === undefined
                  ? {}
                  : { "--dos-clock-inner-radius": `${innerRadius}%` }),
                ...(outerRadius === undefined
                  ? {}
                  : { "--dos-clock-outer-radius": `${outerRadius}%` }),
                ...(color === undefined ? {} : { color }),
              }}
            />
          ),
      )}
      {tails.map(({ degrees, width = tailWidth, label }, index) =>
        label ? (
          <span
            key={`label-${index}`}
            className="dos-clock-label"
            // Halfway along the wedge, so the text sits on what it measures.
            style={{ "--dos-clock-degrees": `${degrees + (clamp(width) * 360) / 2}deg` }}
          >
            {label}
          </span>
        ) : null,
      )}
    </span>
  );
}

/** Blinking block, for a prompt awaiting input. Decorative. */
export function* Cursor(props: ComponentProps<"span">) {
  return <span {...props} className="dos-cursor" aria-hidden="true" />;
}

/** Polite live region — announces its content when it changes. */
export function* Status({ children, ...rest }: ComponentProps<"p">) {
  return (
    <p {...rest} className="dos-text" role="status">
      {children}
    </p>
  );
}

export type BadgeTone = "neutral" | "info" | "ok" | "warn" | "error";

const badgeClass: Record<BadgeTone, string> = {
  neutral: "dos-badge",
  info: "dos-badge dos-badge--info",
  ok: "dos-badge dos-badge--ok",
  warn: "dos-badge dos-badge--warn",
  error: "dos-badge dos-badge--error",
};

/** State pill. The tone is a duplicate of the text, never a substitute for it. */
export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
}

export function* Badge({ tone = "neutral", children, ...rest }: BadgeProps) {
  return (
    <span {...rest} className={badgeClass[tone]}>
      {children}
    </span>
  );
}

export interface AlertProps extends ComponentProps<"div"> {
  children: Children;
  /**
   * `alert` interrupts the screen reader, so keep it for something that just
   * went wrong. Anything standing on the page at load should stay `status`.
   */
  urgent?: boolean;
}

export function* Alert({ children, urgent, ...rest }: AlertProps) {
  return (
    <div {...rest} className="dos-alert" role={urgent ? "alert" : "status"}>
      {children}
    </div>
  );
}
