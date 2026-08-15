import { BadgeCheck } from "lucide-react";

import { Reveal, StaggerGroup } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const radii = [
  { token: "--radius-sm", className: "rounded-sm", label: "4px" },
  { token: "--radius-md", className: "rounded-md", label: "8px" },
  { token: "--radius-lg", className: "rounded-lg", label: "16px — cards" },
  { token: "--radius-xl", className: "rounded-xl", label: "24px" },
  { token: "full", className: "rounded-full", label: "pills" },
];

export function Surfaces() {
  return (
    <div className="flex flex-col gap-12">
      <div>
        <h3 className="text-xs tracking-[0.18em] uppercase">
          Shadows — two, both tinted with summit
        </h3>
        <StaggerGroup as="ul" className="mt-5 grid gap-6 sm:grid-cols-2">
          <Reveal as="li">
            <div className="rounded-lg bg-card p-8 shadow-soft">
              <p className="font-mono text-xs">--shadow-soft</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ambient. The resting state for cards.
              </p>
            </div>
          </Reveal>
          <Reveal as="li">
            <div className="rounded-lg bg-card p-8 shadow-lift">
              <p className="font-mono text-xs">--shadow-lift</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Hover only. Never a resting state.
              </p>
            </div>
          </Reveal>
        </StaggerGroup>
      </div>

      <div>
        <h3 className="text-xs tracking-[0.18em] uppercase">Radii</h3>
        <StaggerGroup as="ul" className="mt-5 flex flex-wrap gap-6">
          {radii.map((radius) => (
            <Reveal as="li" key={radius.token} className="w-32">
              <div
                className={`h-20 w-full border border-border bg-muted ${radius.className}`}
              />
              <p className="mt-2 font-mono text-xs">{radius.token}</p>
              <p className="text-xs text-muted-foreground">{radius.label}</p>
            </Reveal>
          ))}
        </StaggerGroup>
      </div>

      <div>
        <h3 className="text-xs tracking-[0.18em] uppercase">
          Primitives on brand
        </h3>
        <Reveal className="mt-5 flex flex-wrap items-center gap-4">
          <Button>Plan My Trek</Button>
          <Button variant="secondary">Compare</Button>
          <Button variant="outline">Download itinerary</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="link">Read the safety standard</Button>
          <Badge className="bg-verified text-snow">
            <BadgeCheck aria-hidden className="size-3.5" />
            Licence verified
          </Badge>
          <Badge variant="outline">TAAN member</Badge>
          <Skeleton className="h-9 w-32 rounded-md" />
        </Reveal>
      </div>
    </div>
  );
}
