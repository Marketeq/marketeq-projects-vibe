"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Edit03 } from "@blend-metrics/icons"
import { getCurrentUser } from "@/utils/auth"
import { cn } from "@/utils/functions"
import { ProjectAPI } from "@/service/http/project"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

type RecentQuestion = {
  id?: string
  question: string
  answer: string | null
  askedByName?: string | null
  askedByUsername?: string | null
  askedAt?: string | null
  answeredByUserId?: string | null
  answeredByName?: string | null
  answeredByRole?: string | null
  assignedToUserId?: string | null
  hidden?: boolean
  moderationFailed?: boolean
}

function HideToggle({
  hidden,
  moderationFailed,
  onToggle,
}: {
  hidden: boolean
  moderationFailed?: boolean
  onToggle: (value: boolean) => void
}) {
  if (moderationFailed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Switch checked={hidden} disabled />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            This question can&apos;t be made visible because it didn&apos;t pass
            content moderation.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return <Switch checked={hidden} onCheckedChange={(v) => onToggle(!!v)} />
}

export function RecentQuestionsManager({ projectId }: { projectId: string }) {
  const [questions, setQuestions] = useState<RecentQuestion[]>([])
  const [assignTeam, setAssignTeam] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [recentQTab, setRecentQTab] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!projectId) return
    ProjectAPI.GetProjectDraft(projectId)
      .then((res) => {
        const d = res?.data ?? {}
        const rq = (d.recentQuestions ?? []).map(
          (q: RecentQuestion, i: number) => ({ ...q, id: q.id ?? `rq-${i}` })
        )
        setQuestions(rq)
        const team = (d.team ?? []).map((t: any) => ({
          id: String(t.userId ?? t.id ?? ""),
          name:
            [t.firstName, t.lastName].filter(Boolean).join(" ") ||
            t.username ||
            "Team Member",
        }))
        setAssignTeam(team.filter((t: { id: string }) => t.id))
        hydrated.current = true
      })
      .catch(() => {})
  }, [projectId])

  useEffect(() => {
    if (!hydrated.current || !projectId) return
    const t = setTimeout(() => {
      ProjectAPI.SaveProjectQuestions(projectId, questions)
        .then((res) => {
          const saved = res?.data
          if (!Array.isArray(saved)) return
          const byId = new Map(
            saved.map((s: RecentQuestion, i: number) => [s.id ?? `rq-${i}`, s])
          )
          setQuestions((prev) => {
            let changed = false
            const next = prev.map((q) => {
              const s = q.id ? byId.get(q.id) : undefined
              if (s && !!s.moderationFailed !== !!q.moderationFailed) {
                changed = true
                return { ...q, moderationFailed: s.moderationFailed }
              }
              return q
            })
            return changed ? next : prev
          })
        })
        .catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [questions, projectId])

  const isAnswered = (q: RecentQuestion) => !!(q.answer && q.answer.trim())
  const updateQuestion = (id: string, patch: Partial<RecentQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const handleAnswerChange = (id: string, text: string) => {
    const me = getCurrentUser() as {
      id?: string
      firstName?: string
      lastName?: string
      username?: string
    } | null
    const hasText = !!text.trim()
    updateQuestion(id, {
      answer: text,
      answeredByUserId: hasText ? (me?.id ? String(me.id) : null) : null,
      answeredByName: hasText
        ? [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
          me?.username ||
          "You"
        : null,
      answeredByRole: hasText ? "Project Lead" : null,
    })
  }

  const answeredCount = questions.filter(isAnswered).length
  const awaitingCount = questions.length - answeredCount
  const visibleQuestions =
    recentQTab === "awaiting"
      ? questions.filter((q) => !isAnswered(q))
      : recentQTab === "answered"
        ? questions.filter(isAnswered)
        : questions

  return (
    <Tabs value={recentQTab} onValueChange={setRecentQTab} unanimated>
      <TabsList className="justify-start border-b border-gray-200 px-0 pt-0">
        <TabsTrigger value="all">All ({questions.length})</TabsTrigger>
        <TabsTrigger value="awaiting">
          Awaiting Response ({awaitingCount})
        </TabsTrigger>
        <TabsTrigger value="answered">Answered ({answeredCount})</TabsTrigger>
      </TabsList>

      {visibleQuestions.length === 0 ? (
        <div className="mt-4 rounded-lg border-2 border-gray-200 bg-gray-25 p-6">
          <h3 className="text-base font-semibold text-dark-blue-400">
            No Recent Questions
          </h3>
          <p className="mt-1 text-sm font-light text-dark-blue-400">
            You will see recent questions here once your project is live in the
            marketplace and visitors engage in chat with you and your team.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleQuestions.map((q) => {
            const answered = isAnswered(q)
            const expanded = expandedId === q.id
            const responding = respondingId === q.id
            const showEditor = expanded && (answered || responding)
            const assignedName = q.assignedToUserId
              ? assignTeam.find((t) => t.id === String(q.assignedToUserId))
                  ?.name
              : null
            return (
              <div
                key={q.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {expanded && (
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          answered ? "text-success-500" : "text-gray-400"
                        )}
                      />
                    )}
                    <p className="text-sm font-medium text-dark-blue-400">
                      {q.question}
                    </p>
                  </div>
                  {!expanded && (
                    <IconButton
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="shrink-0 rounded-full text-gray-500 hover:text-gray-800"
                      onClick={() => setExpandedId(q.id ?? null)}
                    >
                      <Edit03 className="size-4" />
                    </IconButton>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs text-gray-500",
                    expanded && "ml-6"
                  )}
                >
                  Asked by {q.askedByName ?? "Someone"}{" "}
                  <span className="text-gray-400">
                    @{q.askedByUsername ?? "user"}
                  </span>{" "}
                  {q.askedAt ?? "recently"}
                  {!expanded && (
                    <span
                      className={cn(
                        "ml-3 text-xs font-semibold",
                        answered ? "text-success-500" : "text-warning-500"
                      )}
                    >
                      {answered ? "Answered" : "Awaiting Response"}
                    </span>
                  )}
                </p>

                {showEditor && (
                  <div className="ml-6 mt-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="xs">
                        <AvatarImage src="/man.jpg" alt="" />
                        <AvatarFallback>
                          {(q.answeredByName ?? "You").slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium text-dark-blue-400">
                        {q.answeredByName ?? "You"}{" "}
                        <Badge
                          visual="primary"
                          className="ml-1 rounded-[4px] bg-primary-50 text-[10px]"
                        >
                          {q.answeredByRole ?? "Project Lead"}
                        </Badge>
                      </p>
                    </div>
                    <Textarea
                      className="mt-2"
                      rows={3}
                      maxLength={300}
                      placeholder="Write your response..."
                      value={q.answer ?? ""}
                      onChange={(e) =>
                        handleAnswerChange(q.id ?? "", e.target.value)
                      }
                    />
                    <p className="mt-1 text-right text-xs text-gray-500">
                      {(q.answer ?? "").length}/300
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <HideToggle
                        hidden={!!q.hidden}
                        moderationFailed={q.moderationFailed}
                        onToggle={(v) =>
                          updateQuestion(q.id ?? "", { hidden: v })
                        }
                      />
                      <span className="text-xs text-gray-500">
                        Hide this question
                      </span>
                    </div>
                  </div>
                )}

                {expanded && !showEditor && (
                  <>
                    <div className="ml-6 mt-3 flex items-center gap-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outlined" visual="gray" size="sm">
                            {assignedName
                              ? `Assigned: ${assignedName}`
                              : "Assign To Team Member"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="min-w-[220px]"
                        >
                          {assignTeam.length === 0 ? (
                            <DropdownMenuItem disabled>
                              No team members
                            </DropdownMenuItem>
                          ) : (
                            assignTeam.map((t) => (
                              <DropdownMenuItem
                                key={t.id}
                                onSelect={() =>
                                  updateQuestion(q.id ?? "", {
                                    assignedToUserId: t.id,
                                  })
                                }
                              >
                                {t.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button size="sm" onClick={() => setRespondingId(q.id ?? null)}>
                        Respond
                      </Button>
                    </div>
                    <div className="ml-6 mt-3 flex items-center gap-2">
                      <HideToggle
                        hidden={!!q.hidden}
                        moderationFailed={q.moderationFailed}
                        onToggle={(v) =>
                          updateQuestion(q.id ?? "", { hidden: v })
                        }
                      />
                      <span className="text-xs text-gray-500">
                        Hide this question
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {visibleQuestions.length > 5 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outlined" visual="gray" size="sm">
            View More
            <ChevronDown className="size-4" />
          </Button>
        </div>
      )}
    </Tabs>
  )
}
