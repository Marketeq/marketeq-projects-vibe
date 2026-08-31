"use client"

import React, { useEffect, useMemo, useState } from "react"
import { cn } from "@/utils/functions"
import { useClickOutside } from "@/utils/hooks"
import {
  ChevronDown,
  Expand01,
  Minimize01,
  SearchMd,
  XCircle,
} from "@blend-metrics/icons"
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogOverlay,
  inputVariants,
} from "./ui"

export interface PermissionRole {
  id: string
  name: string
  description: string
}

export interface PermissionRoleGroup {
  name: string
  roles: PermissionRole[]
}

/** Full catalog of roles shown in the Select Permissions side menu. */
export const PERMISSION_ROLE_GROUPS: PermissionRoleGroup[] = [
  {
    name: "Contracts & Hiring",
    roles: [
      {
        id: "hiring-manager",
        name: "Hiring Manager",
        description:
          "Create, edit, and end contracts. Send, negotiate, accept/decline offers. Complete checkout and approve spend.",
      },
      {
        id: "negotiator",
        name: "Negotiator",
        description:
          "Manage all contracts and offers, send/accept/decline offers. Cannot end contracts, start new spend, or change settings.",
      },
      {
        id: "drafter",
        name: "Drafter",
        description:
          "Draft offers and add comments. Cannot send, approve, end, or spend.",
      },
      {
        id: "observer",
        name: "Observer",
        description: "Read-only view of contracts and offers.",
      },
    ],
  },
  {
    name: "Jobs & Talent",
    roles: [
      {
        id: "recruitment-lead",
        name: "Recruitment Lead",
        description:
          "Create, edit, publish, and close jobs. Search talent, save jobs and talent to the account, send invitations, manage the candidate pipeline.",
      },
      {
        id: "recruiter",
        name: "Recruiter",
        description:
          "Edit and publish jobs, search talent, save talent and jobs, suggest candidates, approve shortlists. Cannot delete postings or change settings.",
      },
      {
        id: "sourcer",
        name: "Sourcer",
        description:
          "Create draft jobs, search talent, save jobs and talent to the account's shortlists, add candidate notes. Cannot publish or invite.",
      },
      {
        id: "spectator",
        name: "Spectator",
        description:
          "View the account's saved jobs and shortlisted talent (read-only).",
      },
    ],
  },
  {
    name: "Contract Management",
    roles: [
      {
        id: "project-manager",
        name: "Project Manager",
        description:
          "Manage all active contracts (projects, services, teams, or individuals): build and edit scope, manage milestones and tasks, manage assigned team members, approve deliverables, track timelines.",
      },
      {
        id: "producer",
        name: "Producer",
        description:
          "Manage assigned active contracts: edit scope, update milestones and tasks, review and approve deliverables. Cannot manage team members or change settings.",
      },
      {
        id: "contributor",
        name: "Contributor",
        description:
          "Work within assigned contracts: update tasks, add deliverables and comments. Cannot edit scope, approve, or manage the team.",
      },
      {
        id: "follower",
        name: "Follower",
        description:
          "View assigned active contracts and their progress (read-only).",
      },
    ],
  },
  {
    name: "Financial",
    roles: [
      {
        id: "treasurer",
        name: "Treasurer",
        description:
          "Add and transfer funds, manage payment methods, pay invoices, manage subscription, set and approve spend limits, resolve disputes.",
      },
      {
        id: "finance-lead",
        name: "Finance Lead",
        description:
          "Approve payments and invoices within limits, view full financial detail, manage payment schedules, investigate disputes. Cannot move funds or change payment methods.",
      },
      {
        id: "bookkeeper",
        name: "Bookkeeper",
        description:
          "View all transactions and invoices in full detail and export them. Cannot move money or change anything.",
      },
      {
        id: "auditor",
        name: "Auditor",
        description: "View billing overview and summaries only.",
      },
    ],
  },
  {
    name: "Team & Permissions",
    roles: [
      {
        id: "administrator",
        name: "Administrator",
        description:
          "Invite and remove members, assign and change roles and permissions, manage invite settings.",
      },
      {
        id: "coordinator",
        name: "Coordinator",
        description:
          "Invite new members and manage the roster. Cannot change roles, permissions, or invite settings.",
      },
      {
        id: "onboarder",
        name: "Onboarder",
        description:
          "Send invitations to preset roles and handle pending invites. Cannot remove members or change roles.",
      },
      {
        id: "member",
        name: "Member",
        description: "View the team roster only (read-only).",
      },
    ],
  },
  {
    name: "Communication",
    roles: [
      {
        id: "communications-lead",
        name: "Communications Lead",
        description:
          "Access all threads, start conversations with anyone, manage account-wide notification settings.",
      },
      {
        id: "moderator",
        name: "Moderator",
        description:
          "Access all team threads, triage and reassign, message talent and members. Cannot change account-wide settings.",
      },
      {
        id: "correspondent",
        name: "Correspondent",
        description:
          "Send, receive, and start conversations in threads they own or are part of. Cannot access others' threads.",
      },
      {
        id: "listener",
        name: "Listener",
        description: "Read-only view of threads shared with them.",
      },
    ],
  },
  {
    name: "Reports & Analytics",
    roles: [
      {
        id: "senior-analyst",
        name: "Senior Analyst",
        description:
          "Full access to all stats and reports; build, save, share, and configure dashboards; export; custom date ranges.",
      },
      {
        id: "analyst",
        name: "Analyst",
        description:
          "View all dashboards and reports, build and export reports, set date ranges. Cannot configure shared dashboards.",
      },
      {
        id: "reader",
        name: "Reader",
        description: "View summary dashboards only. No drill-down or export.",
      },
    ],
  },
  {
    name: "Account & Settings",
    roles: [
      {
        id: "account-manager",
        name: "Account Manager",
        description:
          "Edit company profile, manage security (2FA, password, sessions), manage integrations and API, all preferences.",
      },
      {
        id: "profile-editor",
        name: "Profile Editor",
        description:
          "Edit company profile and standard preferences. View-only on security and integrations.",
      },
      {
        id: "guest",
        name: "Guest",
        description: "View profile and account info (read-only).",
      },
    ],
  },
]

export const ALL_PERMISSION_ROLES = PERMISSION_ROLE_GROUPS.flatMap(
  (group) => group.roles
)

export const getPermissionRoleName = (id: string) =>
  ALL_PERMISSION_ROLES.find((role) => role.id === id)?.name ?? id

/** Single display label for a set of assigned permission-role ids: the
 * role name itself for one, "N roles" for multiple. Mirrors the trigger
 * label in SelectPermissionsControl below so every surface that shows an
 * invitee/member's role reads the same way. */
export const formatPermissionRolesLabel = (permissions: string[]) =>
  permissions.length === 0
    ? "Team Member"
    : permissions.length === 1
      ? getPermissionRoleName(permissions[0])
      : `${permissions.length} roles`

/**
 * Search box + grouped role checkboxes + footer. Shared by both presentations
 * of the picker (the anchored dropdown and the full-height side menu) so the
 * two can never drift apart.
 */
const PermissionsRoleList = ({
  selected,
  setSelected,
  query,
  setQuery,
  idPrefix,
  listClassName,
  footerAction,
  showSearch,
}: {
  selected: string[]
  setSelected: React.Dispatch<React.SetStateAction<string[]>>
  query: string
  setQuery: (query: string) => void
  /** Keeps checkbox ids unique between the dropdown and the side menu. */
  idPrefix: string
  listClassName?: string
  footerAction: React.ReactNode
  /** Search is only available in the expanded side menu, not the anchored dropdown. */
  showSearch?: boolean
}) => {
  const groups = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return PERMISSION_ROLE_GROUPS

    return PERMISSION_ROLE_GROUPS.map((group) => ({
      ...group,
      roles: group.roles.filter(
        (role) =>
          role.name.toLowerCase().includes(term) ||
          role.description.toLowerCase().includes(term)
      ),
    })).filter((group) => group.roles.length > 0)
  }, [query])

  const toggleRole = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )

  return (
    <>
      {showSearch && (
        <div className="px-5">
          <div className="relative">
            <SearchMd className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className={cn(inputVariants(), "pl-11 pr-10 text-sm")}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none"
              >
                <XCircle className="size-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-auto space-y-6 overflow-y-auto px-5 pb-5",
          showSearch && "mt-5",
          listClassName
        )}
      >
          {groups.length === 0 ? (
            <p className="text-sm text-gray-500">
              No roles match “{query.trim()}”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.name}>
                {!query.trim() && (
                  <h4 className="mb-3 text-base font-semibold text-gray-800">
                    {group.name}
                  </h4>
                )}
                <div className="space-y-4">
                  {group.roles.map((role) => (
                    <div key={role.id} className="flex items-start gap-x-3">
                      <Checkbox
                        id={`${idPrefix}-${role.id}`}
                        size="md"
                        className="mt-0.5"
                        checked={selected.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <div className="flex-auto">
                        <label
                          htmlFor={`${idPrefix}-${role.id}`}
                          className="cursor-pointer text-sm font-semibold text-gray-800"
                        >
                          {role.name}
                        </label>
                        <p className="mt-1 text-sm leading-5 text-gray-500">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
        <span className="text-sm text-gray-500">
          {selected.length} {selected.length === 1 ? "role" : "roles"} selected
        </span>
        {footerAction}
      </div>
    </>
  )
}

/** Full-height side menu presentation, opened from the dropdown's expand button. */
export const SelectPermissionsPanel = ({
  open,
  value,
  onApply,
  onCollapse,
  title = "Select Permissions",
}: {
  open: boolean
  value: string[]
  onApply: (roleIds: string[]) => void
  /** Collapses back to the anchored dropdown, carrying the current picks over. */
  onCollapse: (roleIds: string[]) => void
  /** Heading text. Reads "Edit Permissions" when reopened for an existing member. */
  title?: string
}) => {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>(value)

  // Re-seed from the invitee each time the panel is opened for them.
  useEffect(() => {
    if (open) {
      setSelected(value)
      setQuery("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Rendered as its own nested dialog so the panel escapes the invite modal's
  // transformed container and docks to the full height of the viewport's right
  // edge, while still owning focus and Escape handling.
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCollapse(selected)}>
      <DialogContent
        variant="unanimated"
        accessibilityTitle={title}
        dialogOverlay={<DialogOverlay className="z-[60] bg-black/20" />}
        className="inset-y-0 right-0 z-[70] flex h-full w-full max-w-[420px] flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <h3 className="text-lg leading-7 font-semibold text-gray-800">
            {title}
          </h3>
          <button
            type="button"
            onClick={() => onCollapse(selected)}
            aria-label="Collapse permissions to dropdown"
            title="Collapse"
            className="text-gray-500 hover:text-gray-900 focus-visible:outline-none"
          >
            <Minimize01 className="size-4" />
          </button>
        </div>

        <PermissionsRoleList
          selected={selected}
          setSelected={setSelected}
          query={query}
          setQuery={setQuery}
          idPrefix="permission-panel"
          showSearch
          footerAction={
            <Button size="sm" onClick={() => onApply(selected)}>
              Apply
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Trigger + anchored, scrollable dropdown. The dropdown's expand button hands
 * off to {@link SelectPermissionsPanel}; collapsing the side menu brings the
 * dropdown back.
 */
export const SelectPermissionsControl = ({
  value,
  onApply,
}: {
  value: string[]
  onApply: (roleIds: string[]) => void
}) => {
  const [mode, setMode] = useState<"closed" | "dropdown" | "expanded">("closed")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>(value)

  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<{
    side: "bottom" | "top"
    maxHeight: number
  }>({ side: "bottom", maxHeight: 420 })

  // Keep the dropdown inside the viewport: measure the room left under the
  // trigger, flip above when that side is too cramped, and cap the height so
  // the role list scrolls instead of running off-screen.
  React.useLayoutEffect(() => {
    if (mode !== "dropdown") return

    const measure = () => {
      const anchor = dropdownRef.current
      if (!anchor) return

      const { top, bottom } = anchor.getBoundingClientRect()
      const gutter = 16
      const below = window.innerHeight - bottom - gutter
      const above = top - gutter
      const side = below < 240 && above > below ? "top" : "bottom"

      setPlacement({
        side,
        maxHeight: Math.max(200, Math.min(420, side === "top" ? above : below)),
      })
    }

    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [mode])

  useClickOutside([dropdownRef], () => {
    // Ignore outside clicks while the side menu owns the interaction.
    if (mode === "dropdown") setMode("closed")
  })

  const label =
    value.length === 0
      ? "Select Permissions"
      : value.length === 1
        ? getPermissionRoleName(value[0])
        : `${value.length} roles selected`

  return (
    <>
      {/* Anchored with plain absolute positioning rather than a portalled
          popover: the invite modal locks scrolling for everything outside its
          own content, which would leave a portalled dropdown unscrollable. */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() =>
            setMode((prev) => {
              if (prev === "dropdown") return "closed"
              // Re-seed from the invitee only when opened fresh. Collapsing
              // the side menu re-opens the dropdown with its own picks intact.
              setSelected(value)
              setQuery("")
              return "dropdown"
            })
          }
          className="inline-flex items-center gap-x-1 text-sm font-medium text-gray-900 focus-visible:outline-none"
        >
          {label}
          <ChevronDown className="text-gray-500 h-5 w-5 flex-none" />
        </button>

        {mode === "dropdown" && (
          <div
            onKeyDown={(e) => e.key === "Escape" && setMode("closed")}
            style={{ maxHeight: placement.maxHeight }}
            className={cn(
              "absolute right-0 z-50 flex w-[380px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white pt-5 shadow-lg",
              placement.side === "bottom"
                ? "top-full mt-2"
                : "bottom-full mb-2"
            )}
          >
            <PermissionsRoleList
              selected={selected}
              setSelected={setSelected}
              query={query}
              setQuery={setQuery}
              idPrefix="permission-dropdown"
              listClassName="min-h-0 flex-1"
              footerAction={
                <div className="inline-flex items-center gap-x-3">
                  <button
                    type="button"
                    onClick={() => setMode("expanded")}
                    aria-label="Expand permissions to side menu"
                    className="inline-flex items-center text-primary-500 focus-visible:outline-none"
                  >
                    <Expand01 className="size-4" />
                  </button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onApply(selected)
                      setMode("closed")
                    }}
                  >
                    Apply
                  </Button>
                </div>
              }
            />
          </div>
        )}
      </div>

      <SelectPermissionsPanel
        open={mode === "expanded"}
        value={selected}
        onCollapse={(roleIds) => {
          setSelected(roleIds)
          setMode("dropdown")
        }}
        onApply={(roleIds) => {
          onApply(roleIds)
          setMode("closed")
        }}
      />
    </>
  )
}
