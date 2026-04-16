// src/renderer/components/ui/index.ts
//
// Minimal re-export of the UI primitives used by the desktop-tracker
// component set. The frontend's full shadcn-based Avatar depends on
// @radix-ui, class-variance-authority and @blend-metrics/icons, which
// is unnecessary for the Electron renderer — we ship a tiny plain
// React implementation with the same public API.

export { Avatar, AvatarImage, AvatarFallback } from './avatar';
