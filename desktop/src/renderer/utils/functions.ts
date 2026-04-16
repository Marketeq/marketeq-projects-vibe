// src/renderer/utils/functions.ts
//
// Tiny subset of frontend/utils/functions.ts — only the helpers that
// the desktop-tracker components depend on. Kept in sync with the
// frontend implementation (clsx + tailwind-merge).

import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}
