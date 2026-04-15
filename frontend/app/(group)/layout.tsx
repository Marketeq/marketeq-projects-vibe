import { Suspense } from "react"
import { TopMostHeader } from "../top-most-header"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <TopMostHeader />
      </Suspense>
      <div className="pt-[62px] lg:pt-[65px]">{children}</div>
    </>
  )
}
