/**
 * /find-jobs — temporary placeholder. Final design is pending; this is
 * just a minimal scaffold so the "Find Jobs" dropdown item routes
 * somewhere coherent instead of 404-ing.
 */

export const dynamic = "force-dynamic"

import { SearchMd } from "@blend-metrics/icons"

export default function FindJobsPage() {
  return (
    <div className="bg-[#FAFBFB] min-h-screen">
      <section className="px-3.5 md:px-6 lg:px-[50px] py-20 flex flex-col items-center text-center">
        <div className="size-16 rounded-full bg-primary-50 flex items-center justify-center mb-6">
          <SearchMd className="size-8 text-primary-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-dark-blue-400">
          Find Jobs
        </h1>
        <p className="mt-3 text-base text-gray-600 max-w-xl">
          The job board is coming soon. We're putting the finishing touches on
          a dedicated space for freelancers to discover open opportunities
          posted by clients across every category.
        </p>
      </section>
    </div>
  )
}
