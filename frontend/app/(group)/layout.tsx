import { Suspense } from "react"
import { InboxThreadsProvider } from "@/utils/useInboxThreads"
import { OnlineUsersProvider } from "@/utils/useOnlineUsers"
import { TopMostHeader } from "../top-most-header"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OnlineUsersProvider>
      <InboxThreadsProvider>
        <Suspense fallback={null}>
          <TopMostHeader />
        </Suspense>
        {/* Reserve space for the fixed primary header so page content starts
            below it instead of sliding underneath the pinned nav. */}
        <div className="pt-[62px] lg:pt-[65px]">{children}</div>
      </InboxThreadsProvider>
    </OnlineUsersProvider>
  )
}
