import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines className strings with Tailwind CSS class merging
 * Handles conflicts between Tailwind classes intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a CSS custom property from a design token
 */
export function cssVar(value: string): string {
  return `var(--${value})`;
}

/**
 * Formats a design token as a CSS custom property name
 */
export function tokenToCssVar(token: string): string {
  return `--${token.replace(/\./g, '-')}`;
} 