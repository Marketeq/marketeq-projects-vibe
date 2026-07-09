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
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el
          }}
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

const COUNTRY_CODES = [
  { code: "+1", label: "US", flag: "🇺🇸" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+91", label: "IN", flag: "🇮🇳" },
  { code: "+61", label: "AU", flag: "🇦🇺" },
  { code: "+49", label: "DE", flag: "🇩🇪" },
  { code: "+33", label: "FR", flag: "🇫🇷" },
  { code: "+81", label: "JP", flag: "🇯🇵" },
  { code: "+86", label: "CN", flag: "🇨🇳" },
  { code: "+55", label: "BR", flag: "🇧🇷" },
  { code: "+52", label: "MX", flag: "🇲🇽" },
]

type SetupStep = "method" | "qr" | "verify" | "phone" | "sms_verify" | "backup"

export function TwoFactorSetupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const { setUser } = useAuth()
  const [step, setStep] = useState<SetupStep>("method")
  const [selectedMethod, setSelectedMethod] = useState<"totp" | "sms" | null>(
    null
  )

  // TOTP state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [copied, setCopied] = useState(false)

  // SMS state
  const [countryCode, setCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  // Shared state
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savedConfirmed, setSavedConfirmed] = useState(false)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSelectTotp = async () => {
    setSelectedMethod("totp")
    setIsLoading(true)
    try {
      const res = await AuthAPI.GenerateTwoFactor()
      if (res?.data) {
        setQrCodeDataUrl(res.data.qrCodeDataUrl)
        setSecret(res.data.secret)
      }
      setStep("qr")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to generate 2FA secret"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSms = () => {
    setSelectedMethod("sms")
    setStep("phone")
  }

  const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`
  const lastFour = phoneNumber.replace(/\D/g, "").slice(-4)

  const handleSendSmsCode = async () => {
    const digits = phoneNumber.replace(/\D/g, "")
    if (digits.length < 7) {
      toast({
        title: "Please enter a valid phone number",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      await AuthAPI.GenerateSmsTwoFactor({ phone: fullPhone })
      setResendCooldown(60)
      setStep("sms_verify")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to send verification code"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    try {
      await AuthAPI.ResendTwoFactorCode({})
      setResendCooldown(60)
      toast({ title: "Verification code resent" })
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to resend code"
      toast({ title: msg, variant: "destructive" })
    }
  }

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return
    setIsLoading(true)
    try {
      const method = selectedMethod ?? "totp"
      const res = await AuthAPI.EnableTwoFactor({ code, method })
      if (res?.data?.backupCodes) {
        setBackupCodes(res.data.backupCodes)
        setUser((prev) =>
          prev
            ? { ...prev, twoFactorEnabled: true, twoFactorMethod: method }
            : prev
        )
        setStep("backup")
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Invalid code, please try again"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [code, selectedMethod, setUser, toast])

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && (step === "method" || step === "qr")) onClose()
      }}
    >
      <DialogContent className="w-full max-w-md">
        {step === "method" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Choose how you'd like to receive your verification codes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <button
                onClick={handleSelectTotp}
                disabled={isLoading}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Authenticator App</p>
                  <p className="text-sm text-gray-500">
                    Use Google Authenticator, Authy, or similar
                  </p>
                </div>
              </button>

              <button
                onClick={handleSelectSms}
                disabled={isLoading}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Text Message (SMS)
                  </p>
                  <p className="text-sm text-gray-500">
                    Receive a verification code via text message
                  </p>
                </div>
              </button>
            </div>

            <DialogFooter>
              <Button variant="outlined" visual="gray" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Set Up Authenticator App</DialogTitle>
              <DialogDescription>
                Scan this QR code with your authenticator app (Google
                Authenticator, Authy, etc.)
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center">
              {isLoading ? (
                <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                qrCodeDataUrl && (
                  <img
                    src={qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
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
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  onClick={copySecret}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => setStep("method")}
              >
                Back
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
                Enter the 6-digit code from your authenticator app to confirm
                setup.
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
                onClick={() => {
                  setCode("")
                  setStep("qr")
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Set Up SMS Verification</DialogTitle>
              <DialogDescription>
                Enter your phone number and we'll send a verification code to
                confirm it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-28 h-10 border border-gray-200 rounded-lg px-2 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.label} {c.code}
                    </option>
                  ))}
                </select>
                <Input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => setStep("method")}
              >
                Back
              </Button>
              <Button
                onClick={handleSendSmsCode}
                disabled={
                  isLoading || phoneNumber.replace(/\D/g, "").length < 7
                }
              >
                {isLoading ? "Sending..." : "Continue"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "sms_verify" && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Verify Your Phone Number</DialogTitle>
              <DialogDescription>
                We sent a verification code to the number ending with{" "}
                <strong>{lastFour}</strong>.
              </DialogDescription>
            </DialogHeader>

            <OtpInput
              value={code}
              onChange={setCode}
              disabled={isLoading}
              onComplete={handleVerify}
            />

            <p className="text-sm text-center text-gray-500">
              Not seeing the code?{" "}
              {resendCooldown > 0 ? (
                <span className="text-gray-400">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-primary-600 hover:underline font-medium"
                >
                  Resend
                </button>
              )}
            </p>

            <DialogFooter>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => {
                  setCode("")
                  setStep("phone")
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isLoading || code.length !== 6}
              >
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
                Save these codes in a safe place. Each code can only be used
                once if you lose access to your{" "}
                {selectedMethod === "sms" ? "phone" : "authenticator app"}.
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
              <span className="text-sm text-gray-600">
                I have saved these codes
              </span>
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
  const { user, setUser } = useAuth()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const method = user?.twoFactorMethod ?? "totp"

  const handleSendDisableCode = async () => {
    if (method !== "sms") return
    setIsLoading(true)
    try {
      await AuthAPI.ResendTwoFactorCode({})
      toast({ title: "Verification code sent to your phone" })
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to send code"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (method === "sms") {
      handleSendDisableCode()
    }
  }, [])

  const handleDisable = useCallback(async () => {
    if (code.length < 6) return
    setIsLoading(true)
    try {
      await AuthAPI.DisableTwoFactor({ code })
      setUser((prev) =>
        prev
          ? { ...prev, twoFactorEnabled: false, twoFactorMethod: null }
          : prev
      )
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="w-full max-w-md">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {method === "sms"
                ? "Enter the verification code sent to your phone to disable 2FA."
                : "Enter your authenticator code to disable 2FA."}{" "}
              This will make your account less secure.
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
