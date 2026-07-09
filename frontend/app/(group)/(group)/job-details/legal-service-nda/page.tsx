"use client"

import JobDetailsPage from "../[slug]/page"

export default function LegalServiceNdaJobDetailsPage() {
  return (
    <JobDetailsPage
      params={Promise.resolve({ slug: "placeholder" })}
      heroVariant="legal-service-nda"
    />
  )
}
