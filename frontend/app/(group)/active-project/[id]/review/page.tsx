"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { TalentReview } from "@/stories/reviews.stories"
import { Dialog, DialogContent } from "@/components/ui"

export default function ReviewPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  return (
    <AuthenticatedRoute>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="h-dvh w-screen max-w-none overflow-hidden rounded-none bg-gray-25 p-0"
          accessibilityTitle="Review your contractor"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (!open) router.back()
          }}
        >
          <TalentReview onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </AuthenticatedRoute>
  )
}
