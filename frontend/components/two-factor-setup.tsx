"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  useToast,
} from "@/components/ui"

function OtpInput({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  onComplete?: () => void
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return
    const arr = value.split("")
    while (arr.length < 6) arr.push("")
    arr[index] = char
    const next = arr.join("").slice(0, 6)
    onChange(next)
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (next.length === 6 && !next.includes("") && onComplete) {
      setTimeout(onComplete, 50)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="w-11 h-12 text-center text-lg font-semibold border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors disabled:opacity-50"
        />
      ))}
    </div>
  )
}

type SetupStep = "qr" | "verify" | "backup"

export function TwoFactorSetupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const { setUser } = useAuth()
  const [step, setStep] = useState<SetupStep>("qr")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedConfirmed, setSavedConfirmed] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    AuthAPI.GenerateTwoFactor()
      .then((res) => {
        if (res?.data) {
          setQrCodeDataUrl(res.data.qrCodeDataUrl)
          setSecret(res.data.secret)
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Failed to generate 2FA secret"
        toast({ title: msg, variant: "destructive" })
        onClose()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return
    setIsLoading(true)
    try {
      const res = await AuthAPI.EnableTwoFactor({ code })
      if (res?.data?.backupCodes) {
        setBackupCodes(res.data.backupCodes)
        setUser((prev) => (prev ? { ...prev, twoFactorEnabled: true } : prev))
        setStep("backup")
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid code, please try again"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [code, setUser, toast])

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"))
    toast({ title: "Backup codes copied to clipboard" })
  }

  const downloadBackupCodes = () => {
    const content = `Marketeq 2FA Backup Codes\n${"=".repeat(30)}\n\nSave these codes in a safe place.\nEach code can only be used once.\n\n${backupCodes.join("\n")}\n`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "marketeq-2fa-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && step === "qr") onClose() }}>
      <DialogContent className="w-full max-w-md">
        {step === "qr" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center">
              {isLoading ? (
                <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                )
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center">
                Can't scan the QR code? Copy this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-center select-all break-all">
                  {secret}
                </code>
                <Button variant="outlined" visual="gray" size="sm" onClick={copySecret}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outlined" visual="gray" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("verify")} disabled={isLoading}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Verify Your Authenticator App</DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app to confirm setup.
              </DialogDescription>
            </DialogHeader>

            <OtpInput
              value={code}
              onChange={setCode}
              disabled={isLoading}
              onComplete={handleVerify}
            />

            <DialogFooter>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => { setCode(""); setStep("qr") }}
              >
                Back
              </Button>
              <Button onClick={handleVerify} disabled={isLoading || code.length !== 6}>
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>
                Save these codes in a safe place. Each code can only be used once if you lose access to your authenticator app.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c) => (
                  <code key={c} className="text-sm font-mono text-center py-1">
                    {c}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                className="flex-1"
                onClick={downloadBackupCodes}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                className="flex-1"
                onClick={copyBackupCodes}
              >
                Copy
              </Button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={savedConfirmed}
                onChange={(e) => setSavedConfirmed(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">I have saved these codes</span>
            </label>

            <DialogFooter>
              <Button onClick={onClose} disabled={!savedConfirmed}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DisableTwoFactorModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const { setUser } = useAuth()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleDisable = useCallback(async () => {
    if (code.length < 6) return
    setIsLoading(true)
    try {
      await AuthAPI.DisableTwoFactor({ code })
      setUser((prev) => (prev ? { ...prev, twoFactorEnabled: false } : prev))
      toast({ title: "Two-factor authentication disabled" })
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid code"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [code, setUser, toast, onClose])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-full max-w-md">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your authenticator code to disable 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <OtpInput
            value={code}
            onChange={setCode}
            disabled={isLoading}
            onComplete={handleDisable}
          />

          <DialogFooter>
            <Button variant="outlined" visual="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleDisable}
              disabled={isLoading || code.length < 6}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
