import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation utilities. Use these instead of `next/link` and
// `next/navigation` so that the active locale segment is preserved.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
