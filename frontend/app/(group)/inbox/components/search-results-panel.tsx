"use client"

import { SearchMd } from "@blend-metrics/icons"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  SearchFileRow,
  SearchLinkRow,
  SearchMessageRow,
  SearchPeopleRow,
} from "./message-components"
import type { MessageAttachment } from "@/types/message"

export interface SearchPeopleResult {
  participantId: string
  threadId: string
  name: string
  username?: string
  avatarUrl?: string
}

export interface SearchMessageResult {
  id: string
  threadId: string
  participantName: string
  participantAvatarUrl?: string
  snippet: string
  createdAt: string
}

export interface SearchLinkResult {
  id: string
  threadId: string
  url: string
  title?: string
  senderName?: string
  createdAt?: string
}

export interface SearchFileResult {
  id: string
  threadId: string
  fileName: string
  fileSize?: number | null
  fileType?: string
  fileUrl?: string
  senderName?: string
  createdAt?: string
}

interface SearchResultsPanelProps {
  query: string
  isLoading?: boolean
  isIndexing?: boolean
  indexProgress?: number
  people: SearchPeopleResult[]
  messages: SearchMessageResult[]
  links: SearchLinkResult[]
  files: SearchFileResult[]
  onOpenThread: (threadId: string, messageId?: string) => void
}

const SectionHeader = ({ label }: { label: string }) => (
  <div className="px-4 py-1.5">
    <span className="text-xs font-medium text-gray-800">{label}</span>
  </div>
)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

export function SearchResultsPanel({
  query,
  isLoading,
  isIndexing,
  indexProgress,
  people,
  messages,
  links,
  files,
  onOpenThread,
}: SearchResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Spinner size={20} strokeWidth={3} />
      </div>
    )
  }

  const totalResults =
    people.length + messages.length + links.length + files.length

  if (totalResults === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400 px-6 text-center">
        <SearchMd className="size-6 stroke-[1.5]" />
        <p className="text-xs">No results matching &quot;{query}&quot;</p>
        {isIndexing && (
          <p className="text-[11px] leading-4 text-gray-500">
            Still indexing older messages — try again in a moment.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="py-2">
      {isIndexing && (
        <div className="px-4 pb-2 inline-flex items-center gap-x-1 text-[10px] text-gray-400">
          <Spinner size={10} strokeWidth={3} />
          <span>Indexing {Math.round((indexProgress ?? 0) * 100)}%</span>
        </div>
      )}

      {people.length > 0 && (
        <>
          <SectionHeader label="People" />
          {people.map((p) => (
            <SearchPeopleRow
              key={p.participantId + p.threadId}
              name={p.name}
              username={p.username}
              avatarUrl={p.avatarUrl}
              onClick={() => onOpenThread(p.threadId)}
            />
          ))}
        </>
      )}

      {messages.length > 0 && (
        <>
          <SectionHeader label="Messages" />
          {messages.map((m) => (
            <SearchMessageRow
              key={m.id}
              participantName={m.participantName}
              participantAvatarUrl={m.participantAvatarUrl}
              snippet={m.snippet}
              date={formatDate(m.createdAt)}
              onClick={() => onOpenThread(m.threadId, m.id)}
            />
          ))}
        </>
      )}

      {links.length > 0 && (
        <>
          <SectionHeader label="Links" />
          {links.map((l) => (
            <SearchLinkRow
              key={l.id + l.url}
              url={l.url}
              title={l.title}
              senderName={l.senderName}
              date={l.createdAt ? formatDate(l.createdAt) : undefined}
              onClick={() => onOpenThread(l.threadId, l.id)}
            />
          ))}
        </>
      )}

      {files.length > 0 && (
        <>
          <SectionHeader label="Files" />
          {files.map((f) => (
            <SearchFileRow
              key={f.id}
              fileName={f.fileName}
              fileSize={f.fileSize ?? undefined}
              fileType={f.fileType}
              fileUrl={f.fileUrl}
              senderName={f.senderName}
              date={f.createdAt ? formatDate(f.createdAt) : undefined}
              onClick={() => onOpenThread(f.threadId, f.id)}
            />
          ))}
        </>
      )}
    </div>
  )
}

// Helper: extract URLs from a string. Used by left-sidebar to derive Links
// section results from message contents.
const URL_REGEX = /https?:\/\/[^\s<>"]+/g
export function extractUrls(text: string): string[] {
  if (!text) return []
  const matches = text.match(URL_REGEX)
  return matches ?? []
}
