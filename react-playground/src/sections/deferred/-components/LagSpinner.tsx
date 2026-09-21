import { Clock } from "../../../dos";
import type { ClockTail } from "../../../dos";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

const clamp = (value: number): number => Math.min(Math.max(value, 0), 1);

/**
 * Stops of the lag ramp: green, yellow, red, then black at the worst.
 *
 * Lightness rises into the yellow and falls away again, because yellow is
 * intrinsically light and red is not — hold it constant and the ramp comes out
 * salmon at one end and olive in the middle. Past red it keeps climbing by
 * draining lightness, since red is already the loudest hue on offer: a stall
 * bad enough to reach the top reads as a hole in the dial, which is about
 * right.
 */
const LAG_RAMP = [
  { at: 0, lightness: 72, chroma: 0.17, hue: 145 },
  { at: 0.25, lightness: 86, chroma: 0.17, hue: 87 },
  { at: 0.55, lightness: 58, chroma: 0.22, hue: 29 },
  { at: 1, lightness: 12, chroma: 0.04, hue: 29 },
];

const mix = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;

/** The ramp's OKLCH components at a point along it. */
function lagRampAt(ratio: number): { lightness: number; chroma: number; hue: number } {
  const position = clamp(ratio);
  const found = LAG_RAMP.findIndex((stop) => stop.at >= position);
  const index = found <= 0 ? 1 : found;
  const from = LAG_RAMP[index - 1]!;
  const to = LAG_RAMP[index]!;
  const within = (position - from.at) / (to.at - from.at);
  return {
    lightness: mix(from.lightness, to.lightness, within),
    chroma: mix(from.chroma, to.chroma, within),
    hue: mix(from.hue, to.hue, within),
  };
}

/** The ramp itself, over 0-1, interpolated between the stops in OKLCH. */
function lagColorAt(ratio: number): string {
  const { lightness, chroma, hue } = lagRampAt(ratio);
  return `oklch(${lightness}% ${chroma} ${hue})`;
}

/**
 * Ink that stays legible on the ramp at this point.
 *
 * Blending the text against the ramp does not work: `difference` on a
 * mid-luminance backdrop returns a mid-luminance colour, and orange came out
 * at 1.3:1. OKLCH lightness is perceptual, so thresholding it picks the right
 * ink outright — black on the greens and yellows, white once the red starts
 * going dark.
 */
function lagInkAt(ratio: number): string {
  return lagRampAt(ratio).lightness >= 62 ? "#000000" : "#ffffff";
}

/** One revolution, per ring. Fastest first — which is also outermost first. */
const SPEEDS = [1000, 2000, 4000, 8000, 16_000, 32_000] as const;

/**
 * One entry per ring, outermost first, stepping evenly down the lag ramp.
 *
 * The rings share the bar chart's scale rather than a hue sweep of their own:
 * one language of colour across both, green at the quick end and black at the
 * slow. A separate sweep put a fluorescent pink in the middle of the dial that
 * meant nothing to anyone, and the ramp ends black anyway, which is where the
 * half-minute ring wanted to be.
 */
const RINGS = SPEEDS.map((turnMs, index) => ({
  turnMs,
  color: lagColorAt(index / (SPEEDS.length - 1)),
}));
const SLOWEST_MS = Math.max(...RINGS.map((ring) => ring.turnMs));
/** At or below this gap the arc is invisible; at LAGGY_MS it is fully opaque. */
const SMOOTH_MS = 50;
const LAGGY_MS = 1500;
/** Where the colour ramp bottoms out: at or past this a lag is drawn black. */
const LAG_BLACK_MS = 16_000;
/** The head: a dot at the current position, always solid. */
/** A short wake behind the hand, so a still frame still reads as turning. */
const WAKE_DEGREES = 15;
const WAKE_STEPS = 6;
const WAKE_OPACITY = 0.55;
/** How much of the band the wake gives up on each side, keeping it a thread. */
const WAKE_INSET = 0.15;
/** Below this the chart ignores a gap — at 60fps every frame would be a bar. */
const CHART_FROM_MS = 80;
/** The chart's own span. The dial's slowest ring is longer; the chart is not. */
const CHART_WINDOW_MS = 16_000;
/** The y axis spans this by default, and stretches if something worse lands. */
const CHART_SCALE_MS = 16_000;
/** Fallbacks until the element has been measured. */
const CHART_WIDTH = 560;
const CHART_HEIGHT = 500;
const CHART_PAD = 28;
/** Wider on the left: the y labels and the colour key live there. */
const CHART_PAD_LEFT = 62;
/** The colour key fills the label gutter, leaving this margin at each end. */
const KEY_MARGIN = 4;
/** How far the key runs past the plot, so end labels sit fully on it. */
const KEY_OVERHANG = 10;
/** A tick closer than this to the last one kept is dropped as unreadable. */
const MIN_TICK_GAP_PX = 18;
/** Stalls at least this long get their own number in the key gutter. */
const CHART_CALLOUT_FROM_MS = 200;
/** Reserved below the plot for the time axis. */
const CHART_AXIS_AREA = 28;

const DIAL_SIZE = "16rem";
/** Fastest ring on the outside; the innermost band stops here, leaving a hub. */
const INNERMOST_RADIUS = 32;
const RING_BAND = (100 - INNERMOST_RADIUS) / RINGS.length;

/**
 * The bar chart's colour scale. The dial does not use it: every mark there
 * stays its ring's own colour, so hue means speed on the dial and duration on
 * the chart, and neither has to be read two ways.
 *
 * Green for a short lag through yellow to red for a long one — a continuous
 * ramp, not the dial's five steps: two lags a few milliseconds apart should
 * differ by a few degrees of hue, not land on the same swatch.
 *
 * Interpolated in OKLCH rather than HSL. Equal steps of HSL hue are not equal
 * steps to the eye — it loiters around blue and lurches through green — which
 * makes a linear ramp read as a handful of bands. OKLCH is built so that a
 * constant step looks constant, which is the whole point here.
 *
 * Anything at or past LAGGY_MS is red; that is the same ceiling the dial fades
 * against, so a solid arc there and a red bar here say the same thing.
 */
function lagColor(gap: number): string {
  return lagColorAt(logRatio(gap, LAG_BLACK_MS));
}

/**
 * Drop ticks that would collide, keeping the floor and the top whatever else
 * goes. A log axis crowds towards the top of each decade — 7s and 8s land a
 * few pixels apart — and two labels overprinting read as neither.
 */
function thinTicks<T extends { y: number }>(candidates: readonly T[]): T[] {
  const kept: T[] = [];
  for (const tick of candidates) {
    const last = kept.at(-1);
    if (!last || Math.abs(last.y - tick.y) >= MIN_TICK_GAP_PX) kept.push(tick);
  }
  const top = candidates.at(-1);
  if (!top || kept.at(-1) === top) return kept;
  if (Math.abs(kept.at(-1)!.y - top.y) < MIN_TICK_GAP_PX) kept.pop();
  kept.push(top);
  return kept;
}

/**
 * Where a duration sits on the axis, 0 at the floor and 1 at the top.
 *
 * Logarithmic, because the interesting range spans two decades: a linear axis
 * spends nine tenths of its height on stalls that never happen and squashes
 * every ordinary hiccup into the bottom few pixels. On a log axis a 100ms and
 * a 1000ms lag are as far apart as a 1000ms and a 10000ms one, which is how
 * they actually differ in kind.
 */
function logRatio(ms: number, maxMs: number): number {
  const floor = Math.log(CHART_FROM_MS);
  return clamp((Math.log(ms) - floor) / (Math.log(maxMs) - floor));
}

/**
 * Ticks per decade, plus the top of the scale.
 *
 * The floor itself goes unlabelled: the axis starts at CHART_FROM_MS because
 * a log scale has no zero, not because 80ms is interesting. Marking it would
 * invite reading it as a value rather than as the baseline it stands in for,
 * so the labels start at the first round number above it.
 */
const TICK_MULTIPLES = [1, 1.5, 2, 3, 5, 7];

function logTicks(maxMs: number): number[] {
  const ticks: number[] = [];
  for (let exponent = Math.floor(Math.log10(CHART_FROM_MS)); 10 ** exponent <= maxMs; exponent++) {
    for (const multiple of TICK_MULTIPLES) {
      const value = multiple * 10 ** exponent;
      if (value > CHART_FROM_MS && value < maxMs) ticks.push(value);
    }
  }
  return [...ticks, maxMs];
}

/** Every tick in milliseconds, so the whole axis reads in one unit. */
function tickLabel(ms: number): string {
  return `${Math.round(ms)}`;
}

/**
 * One ring of the stack, at one speed.
 *
 * Each consecutive pair of frame stamps becomes an arc: it starts where the
 * earlier frame landed and is exactly as wide as the gap to the next, so the
 * arcs meet edge to edge. Frames that arrived on time are transparent and
 * dropped entirely, so a ring stays empty while the thread keeps up and every
 * stall burns a mark whose width is its duration. That mark then fades with
 * distance from the hand — full strength as the hand leaves it, gone by the
 * time the hand comes back round. The hand is the only thing always drawn: it
 * marks where this ring is right now, so its speed is readable on a clean face.
 */
const SpeedRing = memo(function SpeedRing({
  stamps,
  start,
  turnMs,
  color,
  band,
  ringStyle,
}: {
  stamps: readonly number[];
  start: number;
  turnMs: number;
  color: string;
  band: { inner: number; outer: number };
  ringStyle: Record<string, string>;
}) {
  const tails = useMemo(() => {
    const all = stamps;
    const from = start;
    const turn = turnMs;
    const bandEdges = band;
    {
      const now = all.at(-1) ?? from;
      const position = (((now - from) % turn) / turn) * 360;
      const window = all.filter((stamp) => stamp >= now - turn);

      const arcs: ClockTail[] = window
        .slice(0, -1)
        .map((stamp, index) => {
          const gap = window[index + 1]! - stamp;
          const degrees = (((stamp - from) % turn) / turn) * 360;
          // How far the hand has swept past this arc: 0 right at the hand,
          // approaching 360 a full lap behind it.
          const behind = (((position - degrees) % 360) + 360) % 360;
          return {
            degrees,
            width: gap / turn,
            opacity: clamp((gap - SMOOTH_MS) / (LAGGY_MS - SMOOTH_MS)) * (1 - behind / 360),
          };
        })
        // An on-time frame draws nothing; skip the node rather than an
        // invisible one, or a slow ring carries a thousand of them.
        .filter(({ opacity }) => opacity > 0);

      // The wake, furthest segment first so the brightest ends up on top, then
      // the hand over all of it. A fixed angle rather than a fixed duration:
      // it is there to show which way the ring is going, not to measure.
      const step = WAKE_DEGREES / WAKE_STEPS;
      const inset = (bandEdges.outer - bandEdges.inner) * WAKE_INSET;
      for (let back = WAKE_STEPS; back >= 1; back--) {
        arcs.push({
          degrees: position - back * step,
          width: step / 360,
          opacity: WAKE_OPACITY * (1 - (back - 1) / WAKE_STEPS),
          innerRadius: bandEdges.inner + inset,
          outerRadius: bandEdges.outer - inset,
        });
      }
      arcs.push({ degrees: position, opacity: 1, dot: true });
      return arcs;
    }
  }, [stamps, start, turnMs, band]);

  return <Clock tails={tails} size={DIAL_SIZE} style={{ color, ...ringStyle } as CSSProperties} />;
});

/**
 * Five speeds on one face, stacked, green through blue to red. A stall paints a wide
 * mark on the fast rings and a narrow one on the slow, so the same hitch is
 * legible at whichever scale suits it — and the five hands fan apart, which
 * is what makes the speeds tell themselves apart at a glance.
 */
const LagDial = memo(function LagDial({
  stamps,
  start,
}: {
  stamps: readonly number[];
  start: number;
}) {
  return (
    <div>
      <span
        className="dos-clock-stack"
        style={
          {
            "--dos-clock-size": DIAL_SIZE,
            // Mostly opaque, so bars passing behind the dial cannot be mistaken
            // for marks on it — but still letting a tall one show through.
            background: "rgb(255 255 255 / 0.2)",
          } as CSSProperties
        }
      >
        {RINGS.map(({ turnMs, color }, index) => (
          <SpeedRing
            key={`ring-${turnMs}`}
            stamps={stamps}
            start={start}
            turnMs={turnMs}
            color={color}
            band={{ inner: 100 - (index + 1) * RING_BAND, outer: 100 - index * RING_BAND }}
            ringStyle={{
              // Fastest on the outside, each slower ring a band further in.
              "--dos-clock-outer-radius": `${100 - index * RING_BAND}%`,
              "--dos-clock-inner-radius": `${100 - (index + 1) * RING_BAND}%`,
              // The head rides the middle of the band. Radii are percentages
              // of the dial's radius, so halve them to get a share of its size.
              "--dos-clock-dot-radius": `${(100 - (index + 0.5) * RING_BAND) / 200}`,
              "--dos-clock-dot-size": `${(RING_BAND / 200) * 0.85}`,
            }}
          />
        ))}
      </span>
    </div>
  );
});

/**
 * The same sixteen seconds the slowest ring covers, unrolled onto a time axis.
 *
 * A bar starts where its stall began and is as wide as the stall lasted, so
 * width is duration on both axes — height for the eye, width for the honesty.
 * The scale floors at CHART_SCALE_MS so a quiet stretch does not magnify a
 * 90ms hiccup into a tower, and grows past it when something worse turns up.
 */
function LagChart({ stamps, now }: { stamps: readonly number[]; now: number }) {
  // Draw in real pixels. Scaling a fixed viewBox to fit would squash the text
  // along with the bars, so the chart measures itself instead.
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: CHART_WIDTH, height: CHART_HEIGHT });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;

  const bars = useMemo(() => {
    const from = now - CHART_WINDOW_MS;
    return stamps
      .slice(0, -1)
      .map((stamp, index) => ({ stamp, gap: stamps[index + 1]! - stamp }))
      .filter(({ stamp, gap }) => gap >= CHART_FROM_MS && stamp >= from);
  }, [stamps, now]);

  const scaleMs = Math.max(CHART_SCALE_MS, ...bars.map(({ gap }) => gap));
  const plotWidth = width - CHART_PAD_LEFT - CHART_PAD;
  const plotHeight = Math.max(1, height - CHART_PAD - CHART_AXIS_AREA);
  // Sampled finely enough that the strip reads as one sweep, not as stops.
  // Sampled up the axis, not across the ramp: each stop takes the colour of a
  // bar that tall, so the key reads off the same scale the gridlines do.
  const ramp = Array.from({ length: 21 }, (_, step) => step / 20).map((position) => ({
    position,
    color: lagColor(Math.exp(mix(Math.log(CHART_FROM_MS), Math.log(scaleMs), position))),
  }));
  const atHeight = (ms: number) => ({
    ms,
    y: CHART_PAD + plotHeight * (1 - logRatio(ms, scaleMs)),
    ink: lagInkAt(logRatio(ms, LAG_BLACK_MS)),
  });
  const gridlines = thinTicks(logTicks(scaleMs).map(atHeight));
  /*
   * The stalls themselves, named in the key gutter at the height they reached.
   * Ascending, so thinning keeps the worst one — the number most worth reading
   * is the one at the top.
   */
  const callouts = thinTicks(
    bars
      .map(({ gap }) => gap)
      .filter((gap) => gap >= CHART_CALLOUT_FROM_MS)
      .sort((a, b) => a - b)
      .map(atHeight),
  );
  /*
   * A callout is something that happened; a tick is only the scale. When the
   * two land on top of each other the tick gives up its number and keeps its
   * line, rather than both printing into the same pixels.
   */
  const tickHasRoom = (y: number) =>
    !callouts.some((callout) => Math.abs(callout.y - y) < MIN_TICK_GAP_PX);

  return (
    <div
      ref={boxRef}
      // Full width, at least 500px tall but never taller than the viewport.
      style={{ width: "100%", height: `min(${CHART_HEIGHT}px, 100vh)` }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Lags over the last ${CHART_WINDOW_MS / 1000} seconds`}
      >
        <defs>
          {/*
           * Pinned to the plot in user space, not to the rectangle it fills,
           * so the key can overhang the plot without dragging the ramp out of
           * step with the gridlines. Past either end it pads with the end
           * colour, which is what the overhang wants anyway.
           */}
          <linearGradient
            id="dos-lag-ramp"
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1={CHART_PAD + plotHeight}
            y2={CHART_PAD}
          >
            {ramp.map(({ position, color }) => (
              <stop key={`stop-${position}`} offset={`${position * 100}%`} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <rect
          x={KEY_MARGIN}
          y={CHART_PAD - KEY_OVERHANG}
          width={CHART_PAD_LEFT - KEY_MARGIN * 2}
          height={plotHeight + KEY_OVERHANG * 2}
          fill="url(#dos-lag-ramp)"
        />
        {gridlines.map(({ ms, y, ink }) => (
          <g key={`grid-${ms}`}>
            <line
              x1={CHART_PAD_LEFT}
              x2={width - CHART_PAD}
              y1={y}
              y2={y}
              stroke="var(--dos-screen-muted)"
              strokeDasharray="2 4"
            />
            {tickHasRoom(y) && (
              <text
                x={CHART_PAD_LEFT - KEY_MARGIN * 2}
                y={y + 4}
                fontSize="12"
                textAnchor="end"
                fill={ink}
              >
                {tickLabel(ms)}
              </text>
            )}
          </g>
        ))}
        {callouts.map(({ ms, y, ink }) => (
          // Bold so a measured stall is not mistaken for a gridline's number.
          // Same gutter and the same contrast-picked ink as the scale, so it
          // stays legible wherever the ramp puts it.
          <text
            key={`callout-${ms}`}
            x={CHART_PAD_LEFT - KEY_MARGIN * 2}
            y={y + 4}
            fontSize="12"
            fontWeight="bold"
            textAnchor="end"
            fill={ink}
          >
            {tickLabel(ms)}
          </text>
        ))}
        {bars.map(({ stamp, gap }) => {
          const height = logRatio(gap, scaleMs) * plotHeight;
          return (
            <rect
              key={`bar-${stamp}`}
              x={CHART_PAD_LEFT + ((now - stamp - gap) / CHART_WINDOW_MS) * plotWidth}
              y={CHART_PAD + plotHeight - height}
              width={Math.max(2, (gap / CHART_WINDOW_MS) * plotWidth)}
              height={height}
              fill={lagColor(gap)}
            />
          );
        })}
        <text
          x={CHART_PAD_LEFT}
          y={CHART_PAD + plotHeight + 16}
          fontSize="12"
          fill="var(--dos-screen-fg)"
        >
          now
        </text>
        <text
          x={width - CHART_PAD}
          y={CHART_PAD + plotHeight + 16}
          fontSize="12"
          textAnchor="end"
          fill="var(--dos-screen-fg)"
        >
          -{CHART_WINDOW_MS / 1000}s
        </text>
      </svg>
    </div>
  );
}

export default function LagSpinner() {
  const start = useRef(Date.now());
  const [stamps, setStamps] = useState<number[]>([]);

  useEffect(() => {
    let handle = requestAnimationFrame(function animate() {
      setStamps((current) => {
        const now = Date.now();
        const next = [...current, now];
        // Keep one turn of the slowest ring; older stamps would lap it.
        const first = next.findIndex((stamp) => stamp >= now - SLOWEST_MS);
        return first > 0 ? next.slice(first - 1) : next;
      });
      handle = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    // The dial rides in the chart's top-right corner, clear of the y axis and
    // of the recent bars, which grow from the left.
    <div style={{ position: "relative" }}>
      <LagChart stamps={stamps} now={stamps.at(-1) ?? start.current} />
      <div style={{ position: "absolute", top: "0", right: "0", pointerEvents: "none" }}>
        <LagDial stamps={stamps} start={start.current} />
      </div>
    </div>
  );
}
