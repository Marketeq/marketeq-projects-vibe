import { Suspense } from "react"
import { InboxThreadsProvider } from "@/utils/useInboxThreads"
import { OnlineUsersProvider } from "@/utils/useOnlineUsers"
import { TopMostHeaderGate } from "./embedded-profile-gate"
import { GroupLayoutInner } from "./group-layout-inner"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OnlineUsersProvider>
      <InboxThreadsProvider>
        {/* Reserve space for the fixed primary header so page content starts
            below it instead of sliding underneath the pinned nav. */}
        <GroupLayoutInner
          header={
            <Suspense fallback={null}>
              <TopMostHeaderGate />
            </Suspense>
          }
        >
          {children}
        </GroupLayoutInner>
      </InboxThreadsProvider>
    </OnlineUsersProvider>
  )
}
