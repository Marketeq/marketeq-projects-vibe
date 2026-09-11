import type { ReactNode } from "react"
import { FavoriteCountsProvider } from "./favorites-counts"

/**
 * Stays mounted across the groups index and the group pages, so the tab
 * counts inside it are fetched once for the whole favorites area rather than
 * on every navigation between them.
 */
export default function FavoritesLayout({
  children,
}: {
  children: ReactNode
}) {
  return <FavoriteCountsProvider>{children}</FavoriteCountsProvider>
}
