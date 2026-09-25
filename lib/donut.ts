export type DonutSlice = { label: string; value: number }
export type DonutData = { total: number; slices: DonutSlice[]; caption: string }

/** Top categories become slices; everything else is a grey "אחר". Server-safe. */
export function toDonut(categories: { emoji: string; nameHe: string; value: number }[], total: number, caption: string, max = 7): DonutData {
  const sorted = categories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  const slices = sorted.slice(0, max).map((c) => ({ label: `${c.emoji} ${c.nameHe}`, value: c.value }))
  const shown = slices.reduce((s, x) => s + x.value, 0)
  const rest = Math.max(0, total - shown)
  if (rest > 0.5) slices.push({ label: "אחר", value: rest })
  return { total, slices, caption }
}
