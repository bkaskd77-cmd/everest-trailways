import type { ItineraryDay } from "@/content/departures";

/**
 * The route, drawn from coordinates.
 *
 * A schematic, not a map. No tiles, no library, no API key, no attribution
 * footer, no satellite imagery — a projected line through the overnight stops
 * with every one of them named. That is the whole thing a reader needs beside
 * the altitude profile: the profile says how high, this says where, and
 * together they say what shape the walk is.
 *
 * It deliberately carries no scale bar and no contours. Anything that looked
 * navigable would invite somebody to navigate by it, and a hand-drawn polyline
 * through fifty approximate positions is not something to walk by. The page
 * says so under the drawing.
 *
 * Server-rendered, no client JavaScript. It never changes after paint.
 */

type Point = { day: ItineraryDay; x: number; y: number };

const W = 720;
const H = 420;
const PAD = 64;

/**
 * Equirectangular, with the longitude squeezed by the cosine of the mean
 * latitude.
 *
 * At Nepal's latitude a degree of longitude is about 88km against 111km for a
 * degree of latitude, so plotting raw lat/lon stretches every east-west trek
 * sideways by a quarter. Correcting it is one multiplication and it is the
 * difference between a route that looks like the walk and one that does not.
 */
function project(days: ItineraryDay[]): Point[] {
  const withCoords = days.filter((d) => d.coords);
  if (!withCoords.length) return [];

  const lats = withCoords.map((d) => d.coords![0]);
  const lons = withCoords.map((d) => d.coords![1]);
  const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const squeeze = Math.cos((meanLat * Math.PI) / 180);

  const xs = lons.map((lon) => lon * squeeze);
  const ys = lats;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // A trek that walks out and back covers almost no ground in one axis, so the
  // span is floored — without it the line would be scaled up into a meaningless
  // zigzag across the full width.
  const spanX = Math.max(maxX - minX, 0.02);
  const spanY = Math.max(maxY - minY, 0.02);
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);

  const offsetX = (W - spanX * scale) / 2;
  const offsetY = (H - spanY * scale) / 2;

  return withCoords.map((day, i) => ({
    day,
    x: offsetX + (xs[i] - minX) * scale,
    // Latitude increases northward, y increases downward.
    y: H - offsetY - (ys[i] - minY) * scale,
  }));
}

/**
 * Where a label sits relative to its dot.
 *
 * Out-and-back routes revisit places, so labels stack. Alternating the side by
 * index is crude and it is enough: it separates consecutive stops, which is
 * where collisions actually happen.
 */
function anchorFor(
  index: number,
  x: number,
): {
  dx: number;
  anchor: "start" | "end";
} {
  const preferEnd = x > W * 0.62;
  const flip = index % 2 === 1;
  const toLeft = preferEnd !== flip;
  return toLeft ? { dx: -9, anchor: "end" } : { dx: 9, anchor: "start" };
}

export function RouteMap({
  itinerary,
  trekName,
}: {
  itinerary: ItineraryDay[];
  trekName: string;
}) {
  const points = project(itinerary);
  if (points.length < 2) return null;

  const line = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  /*
   * One dot per place, not one per night.
   *
   * An out-and-back sleeps at Namche three times and the map should show one
   * Namche with three nights, not three dots on top of each other.
   */
  const seen = new Map<
    string,
    { point: Point; nights: number; days: number[] }
  >();
  for (const point of points) {
    const key = point.day.toPlace;
    const existing = seen.get(key);
    if (existing) {
      existing.nights += 1;
      existing.days.push(point.day.day);
    } else {
      seen.set(key, { point, nights: 1, days: [point.day.day] });
    }
  }
  const stops = [...seen.values()];
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <figure className="m-0">
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Schematic route for ${trekName}, through ${stops.length} overnight stops from ${start.day.toPlace} to ${end.day.toPlace}. Every stop is named in the day-by-day itinerary below.`}
          className="block min-w-[560px]"
        >
          {/* The walked line. Drawn once, under everything. */}
          <polyline
            points={line}
            fill="none"
            className="stroke-foreground/30"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="1 0"
          />

          {stops.map(({ point, nights }, i) => {
            const isStart = point.day.day === start.day.day;
            const isEnd = point.day.day === end.day.day;
            const { dx, anchor } = anchorFor(i, point.x);

            return (
              <g key={point.day.toPlace}>
                {/* Acclimatisation stops carry the same square mark the
                    altitude profile uses, so the two diagrams agree. */}
                {point.day.isAcclimatisation ? (
                  <rect
                    x={point.x - 4.5}
                    y={point.y - 4.5}
                    width={9}
                    height={9}
                    className="fill-background stroke-foreground"
                    strokeWidth={2}
                  />
                ) : (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isStart || isEnd ? 6 : 4}
                    className={
                      isStart || isEnd
                        ? "fill-foreground"
                        : "fill-background stroke-foreground"
                    }
                    strokeWidth={2}
                  />
                )}

                <text
                  x={point.x + dx}
                  y={point.y + 4}
                  textAnchor={anchor}
                  className="fill-foreground text-[12px]"
                >
                  {point.day.toPlace}
                  {nights > 1 && (
                    <tspan className="fill-muted-foreground"> ×{nights}</tspan>
                  )}
                </text>
              </g>
            );
          })}

          <text
            x={start.x}
            y={start.y - 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] tracking-[0.14em] uppercase"
          >
            Start
          </text>
          {end.day.toPlace !== start.day.toPlace && (
            <text
              x={end.x}
              y={end.y - 14}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tracking-[0.14em] uppercase"
            >
              End
            </text>
          )}
        </svg>
      </div>

      <figcaption className="mt-3 max-w-[62ch] text-xs text-muted-foreground">
        A diagram of the route, not a map. Positions are approximate and there
        is no scale — it is here to show the shape of the walk beside the
        altitude beneath it. Every stop is listed with its date and altitude in
        the day-by-day itinerary.
      </figcaption>
    </figure>
  );
}
