import { Reveal, StaggerGroup } from "@/components/motion";

const scale = [
  { token: "--text-7xl", className: "text-7xl", face: "display" },
  { token: "--text-6xl", className: "text-6xl", face: "display" },
  { token: "--text-5xl", className: "text-5xl", face: "display" },
  { token: "--text-4xl", className: "text-4xl", face: "display" },
  { token: "--text-3xl", className: "text-3xl", face: "display" },
  { token: "--text-2xl", className: "text-2xl", face: "display" },
  { token: "--text-xl", className: "text-xl", face: "sans" },
  { token: "--text-lg", className: "text-lg", face: "sans" },
  { token: "--text-base", className: "text-base", face: "sans" },
  { token: "--text-sm", className: "text-sm", face: "sans" },
  { token: "--text-xs", className: "text-xs", face: "sans" },
] as const;

export function TypeScale() {
  return (
    <div className="flex flex-col gap-12">
      <StaggerGroup as="ul" className="flex flex-col gap-6">
        {scale.map((step) => (
          <Reveal
            as="li"
            key={step.token}
            className="flex flex-col gap-1 border-b border-border pb-6 last:border-0"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {step.token} ·{" "}
              {step.face === "display" ? "Instrument Serif" : "Inter"}
            </span>
            <span
              className={`${step.className} ${
                step.face === "display"
                  ? "font-display tracking-tight"
                  : "font-sans"
              } truncate`}
            >
              Sagarmatha
            </span>
          </Reveal>
        ))}
      </StaggerGroup>

      <Reveal className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-xs tracking-[0.18em] uppercase">Pull quote</h3>
          <blockquote className="mt-4 font-display text-3xl tracking-tight">
            &ldquo;Every licence number on this site is one you can check
            yourself.&rdquo;
          </blockquote>
        </div>

        <div>
          <h3 className="text-xs tracking-[0.18em] uppercase">
            Tabular numerals — the <code className="font-mono">.tabular</code>{" "}
            utility
          </h3>
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">
              Prices and altitudes set in tabular numerals
            </caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase">
                <th scope="col" className="pb-2 font-medium">
                  Trek
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Max altitude
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  From
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[
                ["Everest Base Camp", "5,364 m", "$1,890"],
                ["Annapurna Circuit", "5,416 m", "$1,240"],
                ["Langtang Valley", "4,984 m", "$980"],
                ["Manaslu Circuit", "5,106 m", "$1,675"],
              ].map(([name, altitude, price]) => (
                <tr key={name} className="border-t border-border">
                  <th scope="row" className="py-2 text-left font-normal">
                    {name}
                  </th>
                  <td className="py-2 text-right">{altitude}</td>
                  <td className="py-2 text-right">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
