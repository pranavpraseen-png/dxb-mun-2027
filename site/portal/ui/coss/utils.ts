// From coss ui (https://coss.com/ui/r/utils.json), copied in and themed for DXB MUN. Licence: AGPL-3.0 (cosscom/coss repository LICENSE), see portal/LIBRARY.md.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
