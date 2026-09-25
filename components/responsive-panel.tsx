"use client"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/** Side sheet on desktop, bottom drawer on mobile. Same content, no page navigation. */
export function ResponsivePanel({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode }) {
  const desktop = useMediaQuery("(min-width: 1024px)")
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-[620px]!">
          <SheetHeader className="text-start">
            <SheetTitle className="text-xl font-extrabold">{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">פרטים</SheetDescription>}
          </SheetHeader>
          <div className="px-4 pb-8">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-start">
          <DrawerTitle className="text-xl font-extrabold">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">פרטים</DrawerDescription>}
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
