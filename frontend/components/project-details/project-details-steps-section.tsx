"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { ProjectStaticHowItWorksStep } from "@/lib/project-details/project-static-content-from-api"
import { Button } from "@/components/ui"
import NextImage from "@/components/next-image"

/** App-owned copy (not from CMS). */
const STEPS_SECTION_EYEBROW = "How It Works"
const STEPS_SECTION_HEADING = "Unlock your project vision, your way"
const STEPS_SECTION_CTA_LABEL = "Learn More"
const STEPS_SECTION_CTA_HREF = "/"

export type ProjectDetailsStepsSectionProps = {
  steps: ProjectStaticHowItWorksStep[]
}

export function ProjectDetailsStepsSection({
  steps,
}: ProjectDetailsStepsSectionProps) {
  const router = useRouter()

  const handleCta = React.useCallback(() => {
    const href = STEPS_SECTION_CTA_HREF
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer")
      return
    }
    router.push(href)
  }, [router])

  return (
    <div className="relative border mt-6 border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <h3 className="text-center text-xs leading-none text-dark-blue-400 font-semibold">
        {STEPS_SECTION_EYEBROW}
      </h3>

      <h1 className="mt-3 text-center text-2xl leading-none text-dark-blue-400 font-semibold">
        {STEPS_SECTION_HEADING}
      </h1>

      <div className="mt-8 grid grid-cols-3 gap-x-[47px] px-6">
        {steps.map((step, idx) => (
          <article key={`${step.stepNumber}-${step.title}-${idx}`}>
            {step.iconUrl ? (
              <div className="size-[77px] relative overflow-hidden rounded-lg">
                <NextImage
                  className="object-cover"
                  // Payload media filenames may contain spaces; encode for safe requests.
                  src={encodeURI(step.iconUrl)}
                  alt=""
                  sizes="77px"
                  fill
                />
              </div>
            ) : (
              <div className="size-[77px] bg-gray-100 rounded-lg" />
            )}

            <div className="flex items-center gap-x-3 mt-3">
              <h1 className="text-[32px] font-bold leading-none text-dark-blue-400">
                {step.stepNumber}
              </h1>

              <h3 className="text-base leading-none font-semibold text-dark-blue-400">
                {step.title}
              </h3>
            </div>

            <div className="pl-[28px]">
              <p className="text-xs text-dark-blue-400 leading-none">
                {step.description}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8  flex items-center justify-center">
        <Button visual="gray" variant="outlined" onClick={handleCta}>
          {STEPS_SECTION_CTA_LABEL}
        </Button>
      </div>
    </div>
  )
}
