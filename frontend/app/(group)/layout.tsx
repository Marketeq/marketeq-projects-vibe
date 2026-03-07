import { TopMostHeader } from "../top-most-header"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopMostHeader />
      {children}
    </>
  )
}
