"use client"

import type {
  BigImageData,
  BoldStatementData,
  ChallengesData,
  CaseStudyBlockType,
  ConclusionData,
  CustomColumnsData,
  CustomerJourneyData,
  GalleryData,
  ImageTextData,
  InterviewData,
  IntroductionData,
  PersonasData,
  ProcessData,
  PrototypeData,
  ResultMetricsData,
  TestimonialData,
  VideoData,
} from "@/lib/case-study-mapper"
import {
  BigImageSection,
  BoldStatementSection,
  ChallengesSection,
  ColumnsSection,
  ConclusionSection,
  CustomerJourneySection,
  GallerySection,
  ImageTextSection,
  InterviewSection,
  IntroductionSection,
  PersonasSection,
  ProcessSection,
  PrototypeSection,
  ResultMetricsSection,
  TestimonialsSection,
  VideoSection,
} from "./sections"

/**
 * Maps a block/region type to its section component, in both edit and view
 * mode. This is the modular replacement for the old `Region` switch in
 * case-study-builder.tsx and the `renderBlock` switch in case-study-view.tsx
 * — both are now a single dispatch point shared by the editor and the
 * viewer, covering all 16 CaseStudyBlockType values.
 *
 * `onDataChange` is untyped (`Record<string, unknown>`) at this boundary
 * because it comes from a generic reducer that stores every block's data
 * uniformly — each cast below narrows it back to the specific shape that
 * section actually produces.
 */
export function SectionRenderer({
  region,
  data,
  onDataChange,
  isEditing,
}: {
  region: CaseStudyBlockType
  data?: Record<string, unknown>
  onDataChange?: (data: Record<string, unknown>) => void
  isEditing: boolean
}) {
  switch (region) {
    case "introduction":
      return (
        <IntroductionSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: IntroductionData) => void}
        />
      )

    case "bold-statement":
      return (
        <BoldStatementSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: BoldStatementData) => void}
        />
      )

    case "challenges":
      return (
        <ChallengesSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: ChallengesData) => void}
        />
      )

    case "image-text":
      return (
        <ImageTextSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: ImageTextData) => void}
        />
      )

    case "process":
      return (
        <ProcessSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: ProcessData) => void}
        />
      )

    case "big-image":
      return (
        <BigImageSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: BigImageData) => void}
        />
      )

    case "interview":
      return (
        <InterviewSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: InterviewData) => void}
        />
      )

    case "personas":
      return (
        <PersonasSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: PersonasData) => void}
        />
      )

    case "testimonial":
      return (
        <TestimonialsSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: TestimonialData) => void}
        />
      )

    case "gallery":
      return (
        <GallerySection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: GalleryData) => void}
        />
      )

    case "results-metrics":
      return (
        <ResultMetricsSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: ResultMetricsData) => void}
        />
      )

    case "conclusion":
      return (
        <ConclusionSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: ConclusionData) => void}
        />
      )

    case "custom-columns":
      return (
        <ColumnsSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: CustomColumnsData) => void}
        />
      )

    case "video":
      return (
        <VideoSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: VideoData) => void}
        />
      )

    case "customer-journey":
      return (
        <CustomerJourneySection
          isEditing={isEditing}
          data={data}
          onDataChange={
            onDataChange as unknown as (data: CustomerJourneyData) => void
          }
        />
      )

    case "prototype":
      return (
        <PrototypeSection
          isEditing={isEditing}
          data={data}
          onDataChange={onDataChange as unknown as (data: PrototypeData) => void}
        />
      )

    default:
      return null
  }
}
