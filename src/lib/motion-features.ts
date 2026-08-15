/**
 * The Motion feature bundle, in its own module so it becomes its own chunk.
 *
 * <LazyMotion> imports this dynamically, which keeps the animation engine off
 * the critical path: the initial payload carries only the tiny `m` components,
 * and the features arrive after first paint. Nothing above the fold depends on
 * them — the opening slide's copy is plain HTML by design.
 */
import { domAnimation } from "motion/react";

export default domAnimation;
