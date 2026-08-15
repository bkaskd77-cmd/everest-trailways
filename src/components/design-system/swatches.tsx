import { Reveal, StaggerGroup } from "@/components/motion";

type Swatch = {
  token: string;
  value: string;
  note: string;
  className: string;
  /** Text colour laid over the swatch, so each chip proves its own contrast. */
  ink: string;
};

const palette: Swatch[] = [
  {
    token: "--color-summit",
    value: "#0B1F2A",
    note: "Primary dark surface",
    className: "bg-summit",
    ink: "text-glacier",
  },
  {
    token: "--color-glacier",
    value: "#F5F3EE",
    note: "Light surface — warm, never pure white",
    className: "bg-glacier",
    ink: "text-summit",
  },
  {
    token: "--color-stone",
    value: "#8A8578",
    note: "Borders and dividers",
    className: "bg-stone",
    ink: "text-summit",
  },
  {
    token: "--color-prayer",
    value: "#C8511B",
    note: "Primary accent / CTA",
    className: "bg-prayer",
    ink: "text-snow",
  },
  {
    token: "--color-pine",
    value: "#2F5D4F",
    note: "Trust and verified states",
    className: "bg-pine",
    ink: "text-snow",
  },
  {
    token: "--color-sky",
    value: "#7FA9C4",
    note: "Tertiary / informational",
    className: "bg-sky",
    ink: "text-summit",
  },
  {
    token: "--color-snow",
    value: "#FFFFFF",
    note: "Pure white — used sparingly",
    className: "bg-snow",
    ink: "text-summit",
  },
];

const derived: Swatch[] = [
  {
    token: "--color-summit-raised",
    value: "#12303F",
    note: "Elevated surface in dark mode",
    className: "bg-summit-raised",
    ink: "text-glacier",
  },
  {
    token: "--color-glacier-sunk",
    value: "#EBE8E0",
    note: "Recessed surface in light mode",
    className: "bg-glacier-sunk",
    ink: "text-summit",
  },
  {
    token: "--color-stone-deep",
    value: "#5C584D",
    note: "Muted text on light — AA at 6.4:1",
    className: "bg-stone-deep",
    ink: "text-glacier",
  },
  {
    token: "--color-stone-light",
    value: "#A8A296",
    note: "Muted text on dark — AA at 6.7:1",
    className: "bg-stone-light",
    ink: "text-summit",
  },
  {
    token: "--color-prayer-deep",
    value: "#A33F12",
    note: "Accent as text on light — AA at 5.8:1",
    className: "bg-prayer-deep",
    ink: "text-snow",
  },
  {
    token: "--color-prayer-light",
    value: "#E87A45",
    note: "Accent as text on dark — AA at 5.9:1",
    className: "bg-prayer-light",
    ink: "text-summit",
  },
  {
    token: "--color-pine-light",
    value: "#6FA893",
    note: "Verified state on dark",
    className: "bg-pine-light",
    ink: "text-summit",
  },
  {
    token: "--color-sky-deep",
    value: "#3C6C88",
    note: "Informational text on light",
    className: "bg-sky-deep",
    ink: "text-snow",
  },
];

const semantic = [
  {
    token: "--color-background",
    className: "bg-background",
    ink: "text-foreground",
  },
  {
    token: "--color-foreground",
    className: "bg-foreground",
    ink: "text-background",
  },
  { token: "--color-muted", className: "bg-muted", ink: "text-foreground" },
  {
    token: "--color-muted-foreground",
    className: "bg-muted-foreground",
    ink: "text-background",
  },
  {
    token: "--color-primary",
    className: "bg-primary",
    ink: "text-primary-foreground",
  },
  {
    token: "--color-primary-foreground",
    className: "bg-primary-foreground",
    ink: "text-primary",
  },
  {
    token: "--color-accent",
    className: "bg-accent",
    ink: "text-accent-foreground",
  },
  { token: "--color-border", className: "bg-border", ink: "text-foreground" },
  { token: "--color-verified", className: "bg-verified", ink: "text-snow" },
];

function Chip({ swatch }: { swatch: Swatch }) {
  return (
    <Reveal as="li">
      <div
        className={`rounded-lg border p-4 ${swatch.className} ${swatch.ink} shadow-soft`}
      >
        <p className="tabular text-sm font-medium">{swatch.value}</p>
        <p className="mt-8 font-mono text-xs opacity-80">{swatch.token}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{swatch.note}</p>
    </Reveal>
  );
}

export function Swatches() {
  return (
    <div className="flex flex-col gap-12">
      <div>
        <h3 className="text-xs tracking-[0.18em] uppercase">Brand palette</h3>
        <StaggerGroup
          as="ul"
          className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {palette.map((swatch) => (
            <Chip key={swatch.token} swatch={swatch} />
          ))}
        </StaggerGroup>
      </div>

      <div>
        <h3 className="text-xs tracking-[0.18em] uppercase">
          Derived steps — same hues, held to AA on the opposite surface
        </h3>
        <StaggerGroup
          as="ul"
          className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {derived.map((swatch) => (
            <Chip key={swatch.token} swatch={swatch} />
          ))}
        </StaggerGroup>
      </div>

      <div>
        <h3 className="text-xs tracking-[0.18em] uppercase">
          Semantic aliases — these flip with the theme
        </h3>
        <StaggerGroup
          as="ul"
          className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {semantic.map((swatch) => (
            <Reveal as="li" key={swatch.token}>
              <div
                className={`rounded-lg border border-border p-4 ${swatch.className} ${swatch.ink}`}
              >
                <p className="mt-8 font-mono text-xs">{swatch.token}</p>
              </div>
            </Reveal>
          ))}
        </StaggerGroup>
      </div>
    </div>
  );
}
