import Image from "next/image";

import {
  FOCAL_POSITION,
  IMAGE_SLOTS,
  type Focal,
  type SlotName,
} from "@/lib/image-slots";
import { cn } from "@/lib/utils";

/**
 * Every photograph on the site goes through here.
 *
 * The point is that an uploaded file lands correctly without anybody thinking
 * about it. Photographs will arrive from an admin screen from people who have
 * not cropped them, and that is the right assumption to build against — a
 * teahouse room shot on a phone is a tall 4:3 frame, the departure card wants a
 * wide 4:3, and the page header wants a letterbox. Something has to decide what
 * gets thrown away, and it should be this file rather than whoever happened to
 * be uploading.
 *
 * Naming the slot instead of passing dimensions is what makes that possible.
 * `sizes`, aspect ratio, quality and focal point all come from one registry, so
 * the same photograph is cropped consistently everywhere it appears and a
 * change to a slot happens in one place. Passing `sizes` by hand is how a site
 * ends up serving a 3,000px file into a 96px thumbnail on one page and a
 * 400px file into a full-bleed header on another.
 *
 * WHAT "FITS AUTOMATICALLY" ACTUALLY MEANS HERE
 *
 *   - `fill` plus `object-cover` crops rather than squashes, always.
 *   - `object-position` comes from the focal point, so the crop keeps the
 *     subject rather than the geometric middle. The default sits slightly above
 *     centre because that is where subjects are.
 *   - the aspect ratio is applied by the wrapper, so the space is reserved
 *     before the file arrives and nothing shifts as it loads.
 *   - `sizes` is per slot, so the browser downloads a file scaled for the box
 *     it is going into rather than for the widest screen it can imagine.
 */
export function SiteImage({
  slot,
  src,
  alt,
  focal,
  priority,
  className,
  imageClassName,
  /** Overrides the slot's aspect. Use sparingly and say why. */
  aspect,
}: {
  slot: SlotName;
  src: string;
  alt: string;
  focal?: Focal;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  aspect?: number | null;
}) {
  const spec = IMAGE_SLOTS[slot];
  const ratio = aspect === undefined ? spec.aspect : aspect;
  const position = FOCAL_POSITION[focal ?? spec.focal];

  return (
    <span
      className={cn("relative block overflow-hidden bg-muted", className)}
      // Reserving the box before the file arrives is what keeps CLS at zero.
      // A slot with no ratio is inside a container that has its own height.
      style={ratio ? { aspectRatio: String(ratio) } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={spec.sizes}
        quality={spec.quality}
        priority={priority && spec.canBePriority}
        loading={priority && spec.canBePriority ? undefined : "lazy"}
        style={{ objectPosition: position }}
        className={cn("object-cover", imageClassName)}
      />
    </span>
  );
}
