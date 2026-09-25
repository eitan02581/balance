import { cn } from "@/lib/utils"

/** Brand colour + short mark for each provider; a file in /public/logos is used when we have one. */
const BRANDS: Record<string, { bg: string; fg: string; mark: string; file?: string }> = {
  hapoalim: { bg: "#E30613", fg: "#fff", mark: "פ", file: "hapoalim.jpeg" },
  leumi: { bg: "#1D4B8F", fg: "#fff", mark: "ל", file: "leumi.png" },
  discount: { bg: "#0B7A3B", fg: "#fff", mark: "ד", file: "discount.jpeg" },
  mizrahi: { bg: "#F58220", fg: "#fff", mark: "מ" },
  max: { bg: "#111111", fg: "#B8F135", mark: "max", file: "max.jpeg" },
  cal: { bg: "#1E3D8F", fg: "#fff", mark: "cal", file: "cal.jpeg" },
  visacal: { bg: "#1E3D8F", fg: "#fff", mark: "cal", file: "cal.jpeg" },
  americanexpress: { bg: "#2E77BB", fg: "#fff", mark: "AE", file: "amex.png" },
  amex: { bg: "#2E77BB", fg: "#fff", mark: "AE", file: "amex.png" },
  isracard: { bg: "#0057B8", fg: "#fff", mark: "IC", file: "isracard.jpeg" },
}

export function ProviderLogo({ providerId, className, size = 40 }: { providerId: string; className?: string; size?: number }) {
  const id = providerId.toLowerCase()
  const b = BRANDS[id] ?? { bg: "#e5ebe7", fg: "#172019", mark: id.slice(0, 2).toUpperCase() }
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card", className)}
      style={{ width: Math.round(size * 1.5), height: size }}
      aria-label={providerId}
    >
      {b.file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/logos/${b.file}`} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-black" style={{ background: b.bg, color: b.fg }}>
          {b.mark}
        </span>
      )}
    </span>
  )
}
