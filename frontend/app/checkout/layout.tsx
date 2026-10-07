import { Suspense } from "react"
import { CheckoutProvider } from "@/contexts/checkout"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <CheckoutProvider>{children}</CheckoutProvider>
    </Suspense>
  )
}
