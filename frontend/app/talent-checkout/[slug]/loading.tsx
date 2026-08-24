import { cn } from "@/utils/functions"
import { CheckoutNavigation } from "@/components/checkout-navigation"

// First loading.tsx in the repo — see hire-me-button.tsx:453 and the
// talent-profile/project-details/my-listings pages for the same pattern
// this copies rather than invents a second version of: a local Shimmer
// (no shared components/ui version exists yet) laid inside the exact
// wrapper classNames the real page uses, not a generic spinner. That
// keeps nothing shifting once the real page (checkout/[slug]/page.tsx,
// which this route re-exports) mounts over it.
const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn("relative overflow-hidden rounded bg-gray-100", className)}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

export default function TalentCheckoutLoading() {
  return (
    <div className="bg-gray-50 pt-[64px]">
      {/* Real component, not a shimmer — it takes no data (currentStep/
      firstStepLabel are static for this route), so there's nothing for it
      to wait on and no shift when the real page swaps in underneath it. */}
      <CheckoutNavigation
        currentStep={1}
        logoHref=""
        firstStepLabel="Contract Details"
      />

      <div className="px-[150px] py-[50px]">
        <div className="max-w-[1140px] mx-auto">
          <Shimmer className="h-4 w-32 mb-6" />

          <Shimmer className="h-7 w-[420px]" />
          <Shimmer className="mt-3 h-4 w-64" />

          <div className="mt-6 flex items-start gap-x-8">
            <div className="flex-auto">
              {/* Talent info card */}
              <div className="p-5 rounded-lg border flex items-center gap-x-3 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                <Shimmer className="size-[92px] shrink-0 rounded-full" />
                <div className="flex-auto flex items-stretch justify-between gap-x-5">
                  <div className="flex-auto space-y-2">
                    <Shimmer className="h-4 w-40" />
                    <Shimmer className="h-3 w-28" />
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="mt-2 h-3.5 w-36" />
                  </div>
                  <div className="flex flex-col items-end justify-between gap-y-3">
                    <Shimmer className="h-4 w-20" />
                    <div className="space-y-1.5">
                      <Shimmer className="h-5 w-16" />
                      <Shimmer className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations card */}
              <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                <Shimmer className="h-6 w-44" />
                <div className="mt-6 space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-200 bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-x-4">
                        <div className="flex-auto space-y-2">
                          <Shimmer className="h-4 w-40" />
                          <Shimmer className="h-3 w-56" />
                        </div>
                        <Shimmer className="h-5 w-9 rounded-full shrink-0" />
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <Shimmer className="h-3 w-full" />
                        <Shimmer className="h-3 w-4/5" />
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Shimmer className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope/hours detail card */}
              <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                <Shimmer className="h-6 w-32" />
                <div className="mt-6 space-y-3">
                  <Shimmer className="h-10 w-full rounded-lg" />
                  <Shimmer className="h-10 w-full rounded-lg" />
                  <Shimmer className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>

            {/* Price details sidebar */}
            <div className="w-[305px] shrink-0 bg-white">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
                <Shimmer className="h-5 w-28" />

                <div className="pt-4 mt-4 space-y-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <Shimmer className="h-3 w-20" />
                    <Shimmer className="h-3 w-12" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-3 w-12" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Shimmer className="h-3 w-28" />
                    <Shimmer className="h-3 w-12" />
                  </div>
                </div>

                <div className="pt-4 mt-4 flex items-center justify-between border-t border-gray-200">
                  <Shimmer className="h-3 w-24" />
                  <Shimmer className="h-5 w-16" />
                </div>

                <div className="pt-4 mt-4 flex items-center justify-between border-t border-gray-200">
                  <Shimmer className="h-3 w-32" />
                  <Shimmer className="h-4 w-16" />
                </div>

                <Shimmer className="mt-[21.33px] h-9 w-full rounded-[5px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
