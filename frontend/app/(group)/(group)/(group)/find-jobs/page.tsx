import { SearchPageContent } from "../search/page"

export const dynamic = "force-dynamic"

export default function FindJobsPage() {
  return (
    <SearchPageContent
      defaultCategory="projects"
      defaultQuery="react"
      forcedSidebarCategory="jobs"
    />
  )
}
