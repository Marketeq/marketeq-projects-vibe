// frontend/src/lib/api/travel-mode-reminder.ts
//
// The Travel Mode duration choices shown on the "How long are you traveling?"
// screen. (The client-side 15-second reminder mock that used to live here was
// removed: reminders are now driven by the backend.)
export type TravelDuration =
  | "A few days"
  | "1–2 weeks"
  | "More than 2 weeks"
  | "Not sure"
