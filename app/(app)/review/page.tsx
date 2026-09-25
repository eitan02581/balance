import Link from "next/link"

import { Card } from "@/components/cards"
import { PageHeader } from "@/components/page-header"
import { ReviewItem } from "@/components/transaction-row"
import { accountLabel } from "@/lib/providers"
import { getCategories, getNeedsReview } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function ReviewPage() {
  const [rows, categories] = await Promise.all([getNeedsReview(), getCategories()])
  return (
    <>
      <PageHeader title="עסקאות לבדיקה" sub="רק מה שלא הצלחנו לסווג לבד. סמנו 'זכרו לספק הזה' ולא תראו את זה שוב." />
      <Card className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            הכול מסווג 🎉{" "}
            <Link href="/expenses" className="underline">
              לכל ההוצאות
            </Link>
          </div>
        ) : null}
        {rows.map(({ tx, account }) => (
          <ReviewItem key={tx.id} tx={tx} source={account ? accountLabel(account) : tx.providerId} categories={categories} />
        ))}
      </Card>
    </>
  )
}
