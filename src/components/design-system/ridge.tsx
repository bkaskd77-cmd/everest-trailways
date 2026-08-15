/**
 * Decorative ridgeline behind the hero. Geometry only — no photography, no
 * stock-travel cliché. Two layers so the parallax has something to separate.
 */
export function Ridge({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 420"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        d="M0 420V236l186-96 132 74 118-58 142 96 156-146 178 128 148-72 128 84 252-118v292z"
        className="fill-summit-raised"
        opacity="0.85"
      />
      <path
        d="M0 420V304l148-70 154 62 130-40 176 84 148-96 174 96 156-52 354 104v28z"
        className="fill-summit"
      />
    </svg>
  );
}
