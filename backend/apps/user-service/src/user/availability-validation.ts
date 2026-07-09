export type CustomAvailabilityLike = {
  day?: string;
  startTime?: string;
  startTimeDayPeriod?: string;
  endTime?: string;
  endTimeDayPeriod?: string;
};

export const to24HourMinutes = (time?: string, period?: string): number | null => {
  if (!time || !period) return null;

  const [hoursPart, minutesPart] = time.split(':').map(Number);
  if (!Number.isFinite(hoursPart) || !Number.isFinite(minutesPart)) return null;

  let normalizedHours = hoursPart;
  if (period === 'PM' && normalizedHours !== 12) normalizedHours += 12;
  if (period === 'AM' && normalizedHours === 12) normalizedHours = 0;

  return normalizedHours * 60 + minutesPart;
};

export const hasValidTimeRange = (slot: CustomAvailabilityLike): boolean => {
  const startMinutes = to24HourMinutes(slot.startTime, slot.startTimeDayPeriod);
  const endMinutes = to24HourMinutes(slot.endTime, slot.endTimeDayPeriod);

  if (startMinutes == null || endMinutes == null) return true;
  return endMinutes > startMinutes;
};

export const hasOverlappingCustomAvailability = (
  slots?: CustomAvailabilityLike[],
): boolean => {
  if (!Array.isArray(slots) || slots.length < 2) return false;

  const slotsByDay = new Map<string, Array<{ start: number; end: number }>>();

  for (const slot of slots) {
    if (!slot?.day || !hasValidTimeRange(slot)) continue;

    const startMinutes = to24HourMinutes(slot.startTime, slot.startTimeDayPeriod);
    const endMinutes = to24HourMinutes(slot.endTime, slot.endTimeDayPeriod);

    if (startMinutes == null || endMinutes == null) continue;

    const sameDaySlots = slotsByDay.get(slot.day) ?? [];
    const overlapsExistingSlot = sameDaySlots.some(
      (existingSlot) =>
        Math.max(existingSlot.start, startMinutes) <
        Math.min(existingSlot.end, endMinutes),
    );

    if (overlapsExistingSlot) return true;

    sameDaySlots.push({ start: startMinutes, end: endMinutes });
    slotsByDay.set(slot.day, sameDaySlots);
  }

  return false;
};
