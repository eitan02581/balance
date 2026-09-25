import { Card } from "@/components/cards"
import { PageHeader } from "@/components/page-header"
import { GoalForm } from "@/components/forms/goal-form"

export default function NewGoalPage() {
  return (
    <>
      <PageHeader title="יעד חדש" sub="משהו שאתם רוצים ביחד. כל שקל שלא הוצאתם יכול להגיע לכאן." />
      <Card className="max-w-xl">
        <GoalForm />
      </Card>
    </>
  )
}
