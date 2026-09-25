export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight sm:text-[28px]">{title}</h1>
        {sub ? <p className="mt-1 text-[15px] text-muted-foreground">{sub}</p> : null}
      </div>
      {children ? <div className="flex w-full items-center justify-between gap-2.5 sm:w-auto sm:justify-start">{children}</div> : null}
    </div>
  )
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between">
      <h2 className="text-[19px] font-extrabold">{title}</h2>
      {action}
    </div>
  )
}
