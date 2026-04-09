"use client"

import { useEffect, useState } from "react"
import { AuthAPI } from "@/service/http/auth"
import Cookies from "js-cookie"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from "@/components/ui"

type SessionData = {
  id: string
  userAgent: string
  ipAddress: string
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
}

function parseUserAgent(ua: string): { browser: string; os: string; isMobile: boolean } {
  let browser = "Browser"
  let os = "Device"
  let isMobile = false

  if (!ua || ua.length === 0) return { browser, os, isMobile }

  // Detect mobile first
  isMobile = /iPhone|iPad|iPod|Android|Mobile|Windows Phone/i.test(ua)

  // Browser detection (order matters)
  if (/Edg(?:e)?\//.test(ua)) browser = "Edge"
  else if (/OPR\/|Opera\//.test(ua)) browser = "Opera"
  else if (/Chrome\//.test(ua) && !/Edg|Edge/i.test(ua)) browser = "Chrome"
  else if (/Safari\//.test(ua) && !/Chrome|Edg|Edge|OPR|Opera/i.test(ua)) browser = "Safari"
  else if (/Firefox\//.test(ua)) browser = "Firefox"
  else if (/MSIE|Trident/.test(ua)) browser = "Internet Explorer"

  // OS detection (order matters)
  if (/Windows NT/.test(ua)) os = "Windows"
  else if (/Mac OS X/.test(ua)) os = "macOS"
  else if (/Linux/.test(ua) && !/Android/.test(ua)) os = "Linux"
  else if (/Android/.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS"
  else if (/Windows Phone/.test(ua)) os = "Windows Phone"

  return { browser, os, isMobile }
}

function formatIpAddress(ip: string): string {
  // Hide localhost/private IPs
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Local"
  }
  return ip
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ActiveSessionsModalProps {
  onClose: () => void
}

export default function ActiveSessionsModal({ onClose }: ActiveSessionsModalProps) {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [isRevokingAll, setIsRevokingAll] = useState(false)

  const currentSessionId = Cookies.get("session_id") ?? ""

  useEffect(() => {
    AuthAPI.GetSessions(currentSessionId)
      .then((res) => {
        if (res?.status === 200 && Array.isArray(res.data)) {
          setSessions(res.data)
        }
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load sessions"
        toast({ title: msg, variant: "destructive" })
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      const res = await AuthAPI.RevokeSession(sessionId)
      if (res?.status === 200) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        toast({ title: "Session revoked" })
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to revoke session"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAll = async () => {
    if (!currentSessionId) return
    setIsRevokingAll(true)
    try {
      const res = await AuthAPI.RevokeAllOtherSessions(currentSessionId)
      if (res?.status === 200) {
        setSessions((prev) => prev.filter((s) => s.isCurrent))
        toast({ title: `Revoked ${res.data?.revoked ?? 0} other session(s)` })
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to revoke sessions"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsRevokingAll(false)
    }
  }

  const otherSessionsExist = sessions.some((s) => !s.isCurrent)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
          <DialogDescription>
            Devices currently logged in to your account
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No active sessions found
          </p>
        ) : (
          <div className="mt-2 max-h-80 space-y-3 overflow-y-auto pr-1">
            {sessions.map((session) => {
              const { browser, os, isMobile } = parseUserAgent(session.userAgent)
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-x-3 min-w-0">
                    <span className="text-lg shrink-0">
                      {isMobile ? "\u{1F4F1}" : "\u{1F5A5}"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-blue-400 truncate">
                        {browser} on {os}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {formatIpAddress(session.ipAddress)} &middot; {relativeTime(session.lastActiveAt)}
                      </p>
                    </div>
                  </div>

                  <div className="ml-3 shrink-0">
                    {session.isCurrent ? (
                      <Badge visual="success" size="sm">Current</Badge>
                    ) : (
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        disabled={revokingId === session.id}
                        onClick={() => handleRevoke(session.id)}
                      >
                        {revokingId === session.id ? "Revoking..." : "Revoke"}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter className="mt-4">
          {otherSessionsExist && (
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              disabled={isRevokingAll}
              onClick={handleRevokeAll}
            >
              {isRevokingAll ? "Revoking..." : "Revoke All Others"}
            </Button>
          )}
          <Button variant="outlined" visual="gray" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
