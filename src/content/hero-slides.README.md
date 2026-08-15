# Hero photography spec

What an image must satisfy to work in the homepage hero. Hand this to the
photographer or the picture editor.

## The frame

|                  |                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Orientation**  | Landscape only. Never crop a portrait to fit.                                                                |
| **Aspect ratio** | 16:9 delivered. Shoot 3:2 or wider so there is room to crop.                                                 |
| **Resolution**   | 2400px on the long edge minimum; 3200px preferred.                                                           |
| **Format**       | JPEG, quality 80. Under 500KB after export. AVIF/WebP conversion happens at build time — do not pre-convert. |
| **Location**     | `public/hero/`, named for the region: `khumbu.jpg`, `mustang.jpg`.                                           |

The hero covers a full viewport at every shape from 360×780 to 1920×1080, so the
frame gets cropped hard on phones. Compose for the centre; expect to lose up to
40% of the width on a tall screen.

## What has to be in the picture

- **Uncluttered negative space in the left 55%.** This is where the headline,
  subline and buttons sit. Sky, snowfield, water, shadowed hillside — anything
  large and even. Detail belongs on the right.
- **Daylight or golden hour.** Not blue hour, not night, not heavy overcast.
  The place should look like somewhere you would want to walk.
- **Mean luminance in the text region between roughly 60 and 150** (0–255).
  Darker than that and the image reads as murk once the scrim lands on it;
  brighter and the copy needs so much scrim that the photograph stops showing.
- **A horizon or a diagonal**, not a flat wall of rock. The hero has a ridgeline
  silhouette along its bottom edge; a busy foreground fights it.
- **No people identifiable without a release. No obvious stock-photo staging** —
  no arms-aloft summit poses. The brand claim is verifiability, so the pictures
  should look like the actual trip.

## Before it ships

```bash
pnpm check:hero
```

Composites every image under the real overlay stack at 390 / 768 / 1440 and
measures what contrast the copy actually gets. Small text must clear 4.6:1, the
headline 3.2:1 (it is large-scale text, which WCAG AA scores at 3:1).

`PASS` — ship it. `WARN` — above AA but inside the safety margin; fine, worth a
look. `FAIL` — the command exits non-zero and prints the fix.

## Correcting an image

Set these on the slide in `hero-slides.ts`. Reach for them in this order.

| Field           | Use it for                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focalPoint`    | The crop is losing the subject on tall screens. CSS `object-position`, e.g. `"center 40%"`.                                                                                       |
| `scrimStrength` | Contrast is short. `0`–`2`, multiplies the copy's text-shadow alphas. `check:hero` prints the minimum value that passes. Below `1` lightens the shadow for an already-dark image. |
| `imageFilter`   | The frame itself is flat or garish. Appended after the base `brightness(1.08) contrast(1.03)`, e.g. `"saturate(0.9)"`.                                                            |
| `textPosition`  | The left side is unavoidably busy but the centre is clean. `"center"`.                                                                                                            |

Prefer re-cropping over correcting, and correcting over re-shooting. If an image
needs `scrimStrength` above about `1.4`, it is the wrong photograph — the shadow
will be heavy enough to read as an outline round the type.
