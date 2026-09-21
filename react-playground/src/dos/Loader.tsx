/**
 * Loaders — one for each thing you might know about the wait.
 *
 * `LoaderTrain` when you do not know the total, `Clock` for a dial you point
 * yourself.
 */
import type { CSSProperties, ComponentProps } from "react";

export interface LoaderTrainProps extends ComponentProps<"div"> {
  /** What is being waited on. Announced in place of a percentage. */
  label: string;
}

/**
 * Indeterminate bar. A progressbar with no value is announced as such, which
 * is the honest thing to say when no total is known.
 */
export function LoaderTrain({ label, ...rest }: LoaderTrainProps) {
  return <div {...rest} className="dos-loader-train" role="progressbar" aria-label={label} />;
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
 * nothing to do with clocks. Decorative — put any wording in a label beside it.
 */
export function Clock({ tails, tailWidth = 0.02, size = "4rem", style, ...rest }: ClockProps) {
  return (
    <span
      {...rest}
      className="dos-clock"
      aria-hidden="true"
      style={{ "--dos-clock-size": size, ...style } as CSSProperties}
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
              style={
                {
                  "--dos-clock-degrees": `${degrees}deg`,
                  "--dos-clock-tail-opacity": `${clamp(opacity)}`,
                } as CSSProperties
              }
            />
          ) : (
            <span
              key={`tail-${index}`}
              className="dos-clock-tail"
              style={
                {
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
                } as CSSProperties
              }
            />
          ),
      )}
      {tails.map(({ degrees, width = tailWidth, label }, index) =>
        label ? (
          <span
            key={`label-${index}`}
            className="dos-clock-label"
            // Halfway along the wedge, so the text sits on what it measures.
            style={
              { "--dos-clock-degrees": `${degrees + (clamp(width) * 360) / 2}deg` } as CSSProperties
            }
          >
            {label}
          </span>
        ) : null,
      )}
    </span>
  );
}
