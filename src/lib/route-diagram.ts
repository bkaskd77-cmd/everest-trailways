import type { ItineraryDay } from "../content/departures.ts";

/**
 * The geometry behind the route diagram.
 *
 * Separated from the component because the thing worth checking about this
 * drawing is arithmetic, not markup: whether any two labels land on top of
 * each other. As a pure function it can be run over all nineteen departures by
 * a guard without rendering anything, which is the only practical way to know
 * that a diagram nobody has opened is still legible.
 *
 * Relative imports with extensions throughout — the guards run under Node's
 * TypeScript stripping, which cannot resolve the `@/` alias.
 */

export const W = 760;
export const H = 440;
const PAD = 78;

/** 12px labels. Enough to reserve space without measuring text. */
const CHAR = 6.3;
const LINE = 15;

export type Stop = {
  place: string;
  nights: number;
  x: number;
  y: number;
  isStart: boolean;
  isEnd: boolean;
  isAcclimatisation: boolean;
  /** Where the label text is anchored. */
  labelX: number;
  labelY: number;
  anchor: "start" | "end";
  /** The box the label occupies, for the overlap check. */
  box: Box;
};

export type Box = { x1: number; y1: number; x2: number; y2: number };

const overlaps = (a: Box, b: Box) =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/**
 * Equirectangular, with longitude squeezed by the cosine of the mean latitude,
 * then stretched to fill the frame — by at most three to one.
 *
 * At Nepal's latitude a degree of longitude is about 88km against 111km for a
 * degree of latitude, so plotting raw lat/lon plays every east-west trek out
 * sideways by a quarter. That correction is one multiplication.
 *
 * The stretch is the part that needed rethinking. Preserving the aspect ratio
 * exactly meant a route that runs mostly north-south — Langtang, where a long
 * road day to Syabrubesi dwarfs the walking — collapsed into a narrow column
 * using about a seventh of the canvas, with every label stacked in it. The
 * drawing is explicitly a schematic with no scale and the caption says so, so
 * filling the frame is fair; distorting it without limit is not, because the
 * shape is the one thing the diagram is for. Three to one is the compromise:
 * enough to make a narrow route readable, bounded enough that a walk out and
 * back still looks like a walk out and back.
 */
const MAX_ANISOTROPY = 3;

function project(days: ItineraryDay[]) {
  const withCoords = days.filter((d) => d.coords);
  if (!withCoords.length) return [];

  const lats = withCoords.map((d) => d.coords![0]);
  const lons = withCoords.map((d) => d.coords![1]);
  const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const squeeze = Math.cos((meanLat * Math.PI) / 180);

  const xs = lons.map((lon) => lon * squeeze);
  const ys = lats;

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  // A trek that walks out and back covers almost no ground in one axis, so the
  // span is floored — without it the line is scaled into a meaningless zigzag.
  const spanX = Math.max(Math.max(...xs) - minX, 0.02);
  const spanY = Math.max(Math.max(...ys) - minY, 0.02);

  let scaleX = (W - PAD * 2) / spanX;
  let scaleY = (H - PAD * 2) / spanY;
  const smaller = Math.min(scaleX, scaleY);
  scaleX = Math.min(scaleX, smaller * MAX_ANISOTROPY);
  scaleY = Math.min(scaleY, smaller * MAX_ANISOTROPY);

  const offsetX = (W - spanX * scaleX) / 2;
  const offsetY = (H - spanY * scaleY) / 2;

  return withCoords.map((day, i) => ({
    day,
    x: offsetX + (xs[i] - minX) * scaleX,
    // Latitude increases northward, y increases downward.
    y: H - offsetY - (ys[i] - minY) * scaleY,
  }));
}

/**
 * Place every label so that none of them overlap.
 *
 * The old rule alternated sides by index, which separates consecutive stops
 * and nothing else — so Kyanjin Gompa and Langtang village, two places a few
 * hundred metres apart on the drawing, printed straight through each other.
 * Alternation cannot fix that because the collision has nothing to do with
 * order.
 *
 * This tries real positions instead: right of the dot, then left, then the
 * same two nudged up and down in fifteen-pixel steps. The first candidate that
 * clears every label already placed, and every dot, wins. Stops are placed
 * from the outside of the drawing inwards, so the crowded middle is what ends
 * up displaced rather than the endpoints — which are the two labels a reader
 * looks for first.
 *
 * If nothing clears, the least-overlapping candidate is used rather than
 * giving up: a slightly crowded label is still better than a hidden one, and
 * the guard will say so.
 */
export function layoutRoute(itinerary: ItineraryDay[]): Stop[] {
  const points = project(itinerary);
  if (points.length < 2) return [];

  /* One dot per place, not one per night. An out-and-back sleeps at Namche
     three times and the drawing should show one Namche with three nights. */
  const seen = new Map<string, { point: (typeof points)[0]; nights: number }>();
  for (const point of points) {
    const existing = seen.get(point.day.toPlace);
    if (existing) existing.nights += 1;
    else seen.set(point.day.toPlace, { point, nights: 1 });
  }

  const first = points[0];
  const last = points[points.length - 1];
  const entries = [...seen.values()];

  const dots: Box[] = entries.map(({ point }) => ({
    x1: point.x - 8,
    y1: point.y - 8,
    x2: point.x + 8,
    y2: point.y + 8,
  }));

  const centreX = W / 2;
  const centreY = H / 2;
  /* Outside first: the endpoints and the extremities get the clean positions,
     and the crowded centre is what gets pushed around. */
  const order = entries
    .map((entry, i) => ({ entry, i }))
    .sort((a, b) => {
      const da =
        (a.entry.point.x - centreX) ** 2 + (a.entry.point.y - centreY) ** 2;
      const db =
        (b.entry.point.x - centreX) ** 2 + (b.entry.point.y - centreY) ** 2;
      return db - da;
    });

  const placed: Box[] = [];
  const out: Stop[] = new Array(entries.length);

  for (const { entry, i } of order) {
    const { point, nights } = entry;
    const label = point.day.toPlace + (nights > 1 ? ` ×${nights}` : "");
    const width = label.length * CHAR;
    const isStart = point.day.day === first.day.day;
    const isEnd = point.day.day === last.day.day;
    /* START and END print above the dot, so their labels need the room. */
    const reserved = isStart || isEnd ? LINE : 0;

    let best: {
      box: Box;
      labelX: number;
      labelY: number;
      anchor: "start" | "end";
      cost: number;
    } | null = null;

    for (const dy of [
      0,
      -LINE,
      LINE,
      -LINE * 2,
      LINE * 2,
      -LINE * 3,
      LINE * 3,
    ]) {
      for (const side of [1, -1] as const) {
        const labelX = point.x + side * 11;
        const labelY = point.y + 4 + dy + (dy === 0 ? 0 : 0);
        const x1 = side === 1 ? labelX : labelX - width;
        const box: Box = {
          x1: x1 - 2,
          y1: labelY - 11 - reserved,
          x2: x1 + width + 2,
          y2: labelY + 4,
        };

        /* Off the canvas is not a placement. */
        let cost = 0;
        if (box.x1 < 2) cost += (2 - box.x1) * 4;
        if (box.x2 > W - 2) cost += (box.x2 - (W - 2)) * 4;
        if (box.y1 < 2) cost += (2 - box.y1) * 4;
        if (box.y2 > H - 2) cost += (box.y2 - (H - 2)) * 4;

        for (const other of placed) if (overlaps(box, other)) cost += 260;
        for (const dot of dots) if (overlaps(box, dot)) cost += 90;
        /* All else equal, prefer the dot's own line and the outward side. */
        cost += Math.abs(dy) * 0.6;
        cost += point.x > W / 2 && side === 1 ? 6 : 0;
        cost += point.x <= W / 2 && side === -1 ? 6 : 0;

        if (!best || cost < best.cost) {
          best = {
            box,
            labelX,
            labelY,
            anchor: side === 1 ? "start" : "end",
            cost,
          };
        }
        if (cost === 0) break;
      }
      if (best && best.cost === 0) break;
    }

    placed.push(best!.box);
    out[i] = {
      place: point.day.toPlace,
      nights,
      x: point.x,
      y: point.y,
      isStart,
      isEnd,
      isAcclimatisation: Boolean(point.day.isAcclimatisation),
      labelX: best!.labelX,
      labelY: best!.labelY,
      anchor: best!.anchor,
      box: best!.box,
    };
  }

  return out;
}

/** The drawn line, in visiting order rather than deduplicated order. */
export function routeLine(itinerary: ItineraryDay[]): string {
  return project(itinerary)
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

/** Pairs of labels that still collide. Empty is the goal; the guard reads it. */
export function labelCollisions(stops: Stop[]): [string, string][] {
  const clashes: [string, string][] = [];
  for (let i = 0; i < stops.length; i += 1) {
    for (let j = i + 1; j < stops.length; j += 1) {
      if (overlaps(stops[i].box, stops[j].box)) {
        clashes.push([stops[i].place, stops[j].place]);
      }
    }
  }
  return clashes;
}
