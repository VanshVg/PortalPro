import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge.
 * Handles conditional classes and deduplication of conflicting utilities.
 *
 * @param inputs - Class values (strings, objects, arrays)
 * @returns Merged class string
 *
 * @example
 * cn("px-4 py-2", "px-6")        // "px-6 py-2"
 * cn("text-red", isActive && "text-blue") // "text-blue" when active
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
