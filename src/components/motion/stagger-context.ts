"use client";

import { createContext } from "react";

/**
 * True when a <StaggerGroup> ancestor owns the viewport trigger. Children then
 * inherit its animation state instead of registering their own observer.
 */
export const StaggerContext = createContext(false);
