"use client"

import { User01 } from "@blend-metrics/icons"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

/**
 * Same test the master nav uses: a user can hold both roles and toggle between
 * them, so the active mode lives on `accountType` and `role` is the fallback.
 */
export const isTalentAccount = (user?: {
  role?: string | null
  accountType?: string | null
} | null) =>
  user?.accountType?.toUpperCase() === "TALENT" ||
  user?.role?.toUpperCase() === "TALENT"

/**
 * Shown wherever a project or service has no owner and no team yet.
 * Talent-facing only: the caller decides who sees it. Clients and signed-out
 * visitors should render nothing at all rather than this component.
 *
 * Hovering reveals a white tooltip with the claim call to action.
 */
export const NoTeamAssigned = ({
  kind,
  onClaim,
}: {
  kind: "project" | "service"
  onClaim?: () => void
}) => {
  const label = kind === "service" ? "Service" : "Project"
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group/noteam flex items-center gap-x-2 cursor-pointer">
            <div className="flex items-center -space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-8 rounded-full border border-dashed border-gray-300 bg-gray-100 flex items-center justify-center ring-2 ring-white transition-colors duration-300 group-hover/noteam:border-gray-400 group-hover/noteam:bg-gray-200"
                >
                  <User01 className="size-3.5 text-gray-400" />
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400 font-extralight leading-none">
              No team assigned yet
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          visual="white"
          side="top"
          align="start"
          className="max-w-[260px] p-3.5 text-left"
        >
          <p className="text-sm font-semibold leading-none text-dark-blue-400">
            Claim this {label}
          </p>
          <p className="mt-1.5 text-xs font-light leading-[1.5] text-gray-500">
            No one owns this {label.toLowerCase()} yet. Claim it to become the
            owner, build your team, and lead it to delivery.
          </p>
          <button
            type="button"
            className="mt-2.5 text-xs font-semibold leading-none text-primary-500 hover:underline focus-visible:outline-none"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClaim?.()
            }}
          >
            Claim this {label}
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
