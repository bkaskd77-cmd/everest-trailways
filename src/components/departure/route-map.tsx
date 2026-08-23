import type { ItineraryDay } from "@/content/departures";
import {
  H,
  W,
  labelCollisions,
  layoutRoute,
  routeLine,
} from "@/lib/route-diagram";

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
 * The geometry lives in `@/lib/route-diagram` rather than here, because the
 * thing worth checking about this drawing is arithmetic — whether two labels
 * land on top of each other — and a guard can run that over every departure
 * without rendering anything.
 *
 * Server-rendered, no client JavaScript. It never changes after paint.
 */

export function RouteMap({
  itinerary,
  trekName,
}: {
  itinerary: ItineraryDay[];
  trekName: string;
}) {
  const stops = layoutRoute(itinerary);
  if (stops.length < 2) return null;

  const line = routeLine(itinerary);
  const start = stops.find((s) => s.isStart);
  const end = stops.find((s) => s.isEnd);

  /*
   * Belt and braces. The layout resolves every collision on the current data
   * and the guard fails the build if it stops doing so, but a route added on a
   * Friday should degrade rather than print two names through each other — so
   * if anything still clashes, the labels drop to the smaller size, which
   * gives the placement more room to have worked with.
   */
  const crowded = labelCollisions(stops).length > 0;

  return (
    <figure className="m-0">
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Schematic route for ${trekName}, through ${stops.length} overnight stops from ${start?.place} to ${end?.place}. Every stop is named in the day-by-day itinerary below.`}
          className="block min-w-[600px]"
        >
          {/* The walked line. Drawn once, under everything. */}
          <polyline
            points={line}
            fill="none"
            className="stroke-foreground/30"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {stops.map((stop) => (
            <g key={stop.place}>
              {/* Acclimatisation stops carry the same square mark the altitude
                  profile uses, so the two diagrams agree. */}
              {stop.isAcclimatisation ? (
                <rect
                  x={stop.x - 4.5}
                  y={stop.y - 4.5}
                  width={9}
                  height={9}
                  className="fill-background stroke-foreground"
                  strokeWidth={2}
                />
              ) : (
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r={stop.isStart || stop.isEnd ? 6 : 4}
                  className={
                    stop.isStart || stop.isEnd
                      ? "fill-foreground"
                      : "fill-background stroke-foreground"
                  }
                  strokeWidth={2}
                />
              )}

              <text
                x={stop.labelX}
                y={stop.labelY}
                textAnchor={stop.anchor}
                className={
                  crowded
                    ? "fill-foreground text-[11px]"
                    : "fill-foreground text-[12.5px]"
                }
                /*
                 * The line passes under the labels. Painting the stroke first
                 * and the fill over it gives each name a thin cut-out of page
                 * colour, so a stop sitting on the route stays readable
                 * without a box around it.
                 */
                style={{ paintOrder: "stroke" }}
                strokeWidth={3.5}
                strokeLinejoin="round"
                stroke="var(--band)"
              >
                {stop.place}
                {stop.nights > 1 && (
                  <tspan className="fill-muted-foreground">
                    {" "}
                    ×{stop.nights}
                  </tspan>
                )}
              </text>
            </g>
          ))}

          {start && (
            <text
              x={start.x}
              y={start.y - 15}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tracking-[0.14em] uppercase"
              style={{ paintOrder: "stroke" }}
              strokeWidth={3.5}
              strokeLinejoin="round"
              stroke="var(--band)"
            >
              Start
            </text>
          )}
          {end && end.place !== start?.place && (
            <text
              x={end.x}
              y={end.y - 15}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tracking-[0.14em] uppercase"
              style={{ paintOrder: "stroke" }}
              strokeWidth={3.5}
              strokeLinejoin="round"
              stroke="var(--band)"
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
