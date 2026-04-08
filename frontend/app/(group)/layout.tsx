import { Suspense } from "react"
import { TopMostHeader } from "../top-most-header"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <TopMostHeader />
      </Suspense>
      {children}
    </>
  )
}
