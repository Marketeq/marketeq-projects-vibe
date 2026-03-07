export function formatDate(dateStr?: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleString("default", { month: "long", year: "numeric" })
}
