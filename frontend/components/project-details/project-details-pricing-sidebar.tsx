"use client"

import * as React from "react"
import {
  Check,
  Clock,
  Flag,
  HelpCircle,
  Info,
  Share06,
  Users03,
} from "@blend-metrics/icons"
import { Klarna as KlarnaMark } from "@/components/icons/payment-icons"
import { ProjectDetailsPricingActions } from "@/components/project-details/project-details-pricing-actions"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Favorite,
  FavoriteRoot,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

export type ProjectDetailsPricingSidebarTeamMember = {
  firstName: string
  username?: string
  avatarUrl?: string | null
  location?: string | null
  skills?: string[]
}

export type ProjectDetailsPricingSidebarProps = {
  priceDisplay: string
  billingPeriodDefault: string
  billingSubtitle: string
  teamHeading: string
  teamMembers: ProjectDetailsPricingSidebarTeamMember[]
  /** e.g. “Starting from a 6 month duration” */
  durationPrimaryLine: string
  /** e.g. “Minimum 2 team members” */
  minimumTeamMembersLine: string
  favorited?: boolean
  onFavoriteChange?: (next: boolean) => void
  onApplyToJoin: () => void
}

export function ProjectDetailsPricingSidebar({
  priceDisplay,
  billingPeriodDefault,
  billingSubtitle,
  teamHeading,
  teamMembers,
  durationPrimaryLine,
  minimumTeamMembersLine,
  favorited,
  onFavoriteChange,
  onApplyToJoin,
}: ProjectDetailsPricingSidebarProps) {
  const displayMembers =
    teamMembers.length > 0
      ? teamMembers
      : [
          { firstName: "M", avatarUrl: "/man.jpg" },
          { firstName: "W", avatarUrl: "/woman.jpg" },
        ]

  const tooltipRows =
    teamMembers.length > 0
      ? teamMembers
      : [
          {
            firstName: "Sevil",
            username: "designsuperstar23",
            location: null,
            skills: ["Full-stack Developer"],
          },
          {
            firstName: "Sevil",
            username: "designsuperstar23",
            location: null,
            skills: ["Full-stack Developer"],
          },
        ]

  const favoriteProps =
    typeof favorited === "boolean" && onFavoriteChange
      ? { value: favorited, onValueChange: onFavoriteChange }
      : {}

  const handleShare = React.useCallback(() => {
    const url =
      typeof window !== "undefined" ? window.location.href : ""
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator
        .share({ url })
        .catch(() => void navigator.clipboard.writeText(url))
    } else if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(url)
    }
  }, [])

  return (
    <div className="bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg border border-gray-200">
      <div className="relative border-b p-6 border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-y-1">
            <Badge className="rounded-[5px]" visual="gray">
              Starting At
            </Badge>
            <div className="inline-flex items-center gap-x-1.5 ml-2">
              <span className="text-2xl leading-none font-bold text-dark-blue-400">
                {priceDisplay}
              </span>
              <span className="text-sm font-medium leading-none text-dark-blue-400">
                per
              </span>
            </div>

            <div className="ml-1.5">
              <Listbox defaultValue={billingPeriodDefault}>
                <ListboxButton
                  className="text-sm lowercase py-[5px] px-[7px] h-max w-auto"
                  iconClassName="ml-1"
                  placeholder="Select"
                />
                <ListboxOptions className="w-[153px]">
                  {["Week", "2-week", "Month", "Quarter", "Year"].map(
                    (timeline) => (
                      <ListboxOption key={timeline} value={timeline}>
                        {timeline}
                      </ListboxOption>
                    )
                  )}
                </ListboxOptions>
              </Listbox>
            </div>
          </div>

          <FavoriteRoot {...favoriteProps}>
            {({ pressed }) => (
              <TooltipProvider delayDuration={75}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Favorite />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pressed ? (
                      <span className="inline-flex items-center gap-x-1">
                        <Check className="size-[15px] shrink-0 text-green-500" />
                        Saved
                      </span>
                    ) : (
                      "Save to favorites"
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </FavoriteRoot>
        </div>

        <div className="mt-3">
          <span className="inline-block text-sm leading-none font-medium text-dark-blue-400">
            {billingSubtitle}
          </span>
        </div>

        <div className="flex flex-col items-start gap-y-3 mt-6">
          <span className="inline-block text-xs font-semibold text-dark-blue-400">
            {teamHeading}
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AvatarGroup size="sm" excess>
                  {displayMembers.map((m, i) => (
                    <Avatar
                      key={m.username ?? `${m.firstName}-${i}`}
                      className="border-2 border-white hover:ring-0 active:ring-0"
                      size="sm"
                    >
                      {m.avatarUrl ? (
                        <AvatarImage src={m.avatarUrl} alt={m.firstName} />
                      ) : null}
                      <AvatarFallback>
                        {(m.firstName || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>
              </TooltipTrigger>
              <TooltipContent className="p-0" size="md">
                <ScrollArea
                  className="h-[192px] p-3 pr-4"
                  scrollBar={
                    <ScrollBar
                      className="w-4 p-1"
                      thumbClassName="bg-white/20"
                    />
                  }
                >
                  <div className="space-y-3 pr-5">
                    {tooltipRows.map((m, i: number) => (
                      <div
                        key={m.username ?? i}
                        className="flex items-center gap-x-[18px]"
                      >
                        <div className="flex items-center gap-x-2 flex-auto">
                          <Avatar>
                            {m.avatarUrl ? (
                              <AvatarImage
                                src={m.avatarUrl}
                                alt={m.firstName}
                              />
                            ) : null}
                            <AvatarFallback>
                              {(m.firstName || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-auto">
                            <div className="flex items-center gap-x-0.5">
                              <span className="text-xs leading-5 font-semibold text-white">
                                {m.firstName}
                              </span>
                              {m.username ? (
                                <span className="text-[10px] leading-none font-light text-white">
                                  @{m.username}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] font-light text-white">
                              {m.location ||
                                m.skills?.[0] ||
                                "Team Member"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-x-[6.4px]">
            <Clock className="size-[18px] shrink-0 text-primary-500" />
            <span className="text-sm leading-snug font-medium text-dark-blue-400">
              {durationPrimaryLine}
            </span>
          </div>
          <div className="flex items-center gap-x-[6.4px]">
            <Users03 className="size-[18px] shrink-0 text-primary-500" />
            <span className="text-sm leading-snug font-medium text-dark-blue-400">
              {minimumTeamMembersLine}
            </span>
          </div>
        </div>

        <ProjectDetailsPricingActions
          className="mt-6"
          onApply={onApplyToJoin}
          onShare={handleShare}
        />

        <div className="flex items-center flex-wrap gap-x-1 gap-y-1 mt-6">
          <span className="text-sm font-medium leading-none text-dark-blue-400">
            Additional payment plans available with
          </span>
          <KlarnaMark className="h-6 w-[35px] shrink-0" aria-hidden />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                type="button"
                className="focus-visible:outline-none text-gray-500 inline-flex"
              >
                <Info className="size-[17px]" />
              </TooltipTrigger>

              <TooltipContent className="max-w-[286px]" visual="gray">
                Select Klarna at checkout to split your purchase into smaller
                payments over time. Klarna makes it easy to buy now and pay
                later, with no impact on your credit score.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="h-[50px] rounded-b-lg bg-gray-50 flex items-center justify-evenly border-t border-gray-100">
        <div className="inline-flex items-center gap-x-2">
          <Flag className="size-[15px] text-gray-500" />
          <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
            Report
          </span>
        </div>

        <div className="inline-flex items-center gap-x-2">
          <HelpCircle className="size-[15px] text-gray-500" />
          <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
            Help
          </span>
        </div>

        <div className="inline-flex items-center gap-x-2">
          <Share06 className="size-[15px] text-gray-500" />
          <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
            Share
          </span>
        </div>
      </div>
    </div>
  )
}
