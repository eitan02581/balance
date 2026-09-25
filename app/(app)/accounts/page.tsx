import { ExternalLink } from "lucide-react"

import { Card } from "@/components/cards"
import { AccountForm } from "@/components/forms/account-form"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { ProviderLogo } from "@/components/provider-logo"
import { SyncButton } from "@/components/sync-button"
import { formatILS, monthKey, monthNameHe, relativeTimeHe } from "@/lib/money"
import { accountLabel, ACCOUNT_TYPE_HE, connectionHealth, providerHe } from "@/lib/providers"
import { getAccountsWithHealth, getLastSync } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const TONE = { ok: "bg-soft text-green-deep", warn: "bg-amber-soft text-amber-ink", bad: "bg-[#fde8e6] text-[#a13a31]" }


export default async function AccountsPage() {
  const month = monthKey()
  const [rows, sync] = await Promise.all([getAccountsWithHealth(month), getLastSync()])
  const banks = rows.filter((r) => r.account.accountType === "CHECKING" || r.account.accountType === "SAVINGS")
  const cards = rows.filter((r) => r.account.accountType === "CARD")
  const others = rows.filter((r) => !banks.includes(r) && !cards.includes(r)) // loans, securities…

  const Item = ({ r, card }: { r: (typeof rows)[number]; card: boolean }) => {
    const h = connectionHealth(r.connection?.status, r.connection?.expiryDate)
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ProviderLogo providerId={r.account.providerId} size={44} />
            <div>
            <div className="text-xs font-bold text-muted-foreground">{providerHe(r.account.providerId)}</div>
            <div className="mt-0.5 text-lg font-extrabold">{accountLabel(r.account)}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              {ACCOUNT_TYPE_HE[r.account.accountType] ?? r.account.accountType}
              {r.account.accountNumber ? ` · ···${r.account.accountNumber.slice(-4)}` : ""}
              {r.account.role === "savings" ? " · מסומן כחיסכון" : r.account.role === "ignore" ? " · מתעלמים" : ""}
            </div>
            </div>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", TONE[h.tone])}>{h.label}</span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{card ? `הוצאות ${monthNameHe(month)}` : "יתרה"}</div>
            <div className="text-2xl font-black">{card ? formatILS(r.monthSpend) : r.account.balance != null ? formatILS(r.account.balance) : "—"}</div>
          </div>
          <div className="text-end text-[13px] text-muted-foreground">
            {card ? <div>{r.monthTxCount} עסקאות החודש</div> : null}
            <div>הבנק עודכן {relativeTimeHe(r.connection?.lastFetchedAt)}</div>
          </div>
        </div>
        <AccountForm account={r.account} />
      </Card>
    )
  }

  return (
    <>
      <PageHeader title="חשבונות וכרטיסים" sub="כל מקורות המידע המחוברים דרך Open Finance.">
        <SyncButton label={sync.lastOkAt ? `Balance עודכן ${relativeTimeHe(sync.lastOkAt)}` : "עדיין לא סונכרן"} />
      </PageHeader>

      {rows.length === 0 ? <Card className="text-sm text-muted-foreground">עדיין אין חשבונות. לחצו על סנכרון כדי למשוך אותם מ־Financy.</Card> : null}

      {banks.length > 0 ? (
        <>
          <SectionTitle title="חשבונות בנק" />
          <section className="grid gap-4 md:grid-cols-2">
            {banks.map((r) => (
              <Item key={r.account.id} r={r} card={false} />
            ))}
          </section>
        </>
      ) : null}

      {cards.length > 0 ? (
        <>
          <SectionTitle title="כרטיסי אשראי" />
          <section className="grid gap-4 md:grid-cols-2">
            {cards.map((r) => (
              <Item key={r.account.id} r={r} card />
            ))}
          </section>
        </>
      ) : null}

      {others.length > 0 ? (
        <>
          <SectionTitle title="הלוואות והשקעות (לא נספרות כהוצאה)" />
          <section className="grid gap-4 md:grid-cols-2">
            {others.map((r) => (
              <Item key={r.account.id} r={r} card={false} />
            ))}
          </section>
        </>
      ) : null}

      <SectionTitle title="כללי ניקוי נתונים" />
      <Card className="text-sm leading-relaxed text-muted-foreground">
        <ul className="list-disc space-y-1 ps-5">
          <li>החיוב החודשי של כרטיס האשראי בחשבון הבנק לא נספר. העסקאות בכרטיס הן ההוצאה.</li>
          <li>העברות בין החשבונות שלכם (סכום זהה, עד 3 ימים הפרש) אינן הוצאה ואינן הכנסה.</li>
          <li>חשבון שמסומן כ"חיסכון / השקעות" נחשב לחיסכון, לא לצריכה.</li>
          <li>זיכויים בכרטיס מקטינים את ההוצאה בקטגוריה שלהם.</li>
        </ul>
        <a href="https://open-finance.ai" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-bold text-green hover:text-green-deep">
          חיבור או חידוש חשבון באפליקציית Financy <ExternalLink className="size-4" />
        </a>
      </Card>
    </>
  )
}
