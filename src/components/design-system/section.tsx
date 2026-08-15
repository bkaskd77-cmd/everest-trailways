import { Reveal } from "@/components/motion";

/**
 * Shared frame for the design-system specimens. This whole folder is
 * disposable — Step 2 replaces the placeholder home page it serves.
 */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-16 lg:py-24">
      <Reveal>
        <h2 className="font-display text-3xl tracking-tight">{title}</h2>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  );
}
