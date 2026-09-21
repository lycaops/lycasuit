"use client"

import { useRef, useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, CheckCircle2, Copy, Link2, ExternalLink } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Loader from "@/components/Loader"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { SignaturePad, type SignaturePadHandle } from "./signature-pad"
import {
  finalizeContractAction,
  getContractSigningStateAction,
  requestContractOtpAction,
  saveRetailerSignatureAction,
  sendRetailerSigningLinkAction,
  verifyContractOtpAction,
} from "@/app/tools/contracts/contracts/actions"
import { useI18n } from "@/lib/i18n/i18n-context"

export function ContractSignPanel({ contractId }: { contractId: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const retailerRef = useRef<SignaturePadHandle>(null)
  const staffRef = useRef<SignaturePadHandle>(null)
  const [pending, startTransition] = useTransition()
  const [ack, setAck] = useState(false)
  const [gdpr, setGdpr] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [retailerSig, setRetailerSig] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
  const [otpVerifiedAt, setOtpVerifiedAt] = useState<string | null>(null)
  const [remoteLink, setRemoteLink] = useState<string | null>(null)
  const [autoRefreshActive, setAutoRefreshActive] = useState(false)
  const [signingState, setSigningState] = useState<null | {
    retailerSignaturePath: string | null
    retailerAck: boolean | null
    retailerGdpr: boolean | null
    retailerSignedAt: string | null
    otpVerifiedAt: string | null
    signLinkSentAt: string | null
    signLinkExpiresAt: string | null
    signLinkUsedAt: string | null
    email: string | null
  }>(null)

  useEffect(() => {
    if (step === 3) {
      // Small delay to ensure the div is no longer 'hidden' and has dimensions
      const timer = setTimeout(() => {
        staffRef.current?.resize()
      }, 50)
      return () => clearTimeout(timer)
    }
    if (step === 1) {
      const timer = setTimeout(() => {
        retailerRef.current?.resize()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [step])

  const refreshSigningState = useCallback(async () => {
    const res = await getContractSigningStateAction(contractId)
    if (!res.ok) return null
    setSigningState(res.data!)
    setAck(!!res.data!.retailerAck)
    setGdpr(!!res.data!.retailerGdpr)
    setOtpVerifiedAt(res.data!.otpVerifiedAt)
    setOtpSentTo(res.data!.email)

    if (res.data!.retailerSignaturePath && res.data!.otpVerifiedAt) {
      setStep(3)
    } else if (res.data!.retailerSignaturePath) {
      setStep(2)
    }
    return res.data!
  }, [contractId])

  useEffect(() => {
    refreshSigningState()
  }, [refreshSigningState])

  useEffect(() => {
    const shouldPoll =
      (!!remoteLink || !!signingState?.signLinkSentAt) &&
      !signingState?.signLinkUsedAt &&
      !(!!signingState?.retailerSignaturePath && !!signingState?.otpVerifiedAt)

    setAutoRefreshActive(shouldPoll)
    if (!shouldPoll) return

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      const prevCompleted =
        !!signingState?.retailerSignaturePath && !!signingState?.otpVerifiedAt
      const next = await refreshSigningState()
      const nextCompleted = !!next?.retailerSignaturePath && !!next?.otpVerifiedAt
      if (!prevCompleted && nextCompleted) {
        toast.success(t("retailerCompleted"))
        router.refresh()
      }
    }

    const id = window.setInterval(tick, 5000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [remoteLink, refreshSigningState, router, signingState, step, otpVerifiedAt])

  function onNext() {
    const retailerData = retailerRef.current?.toDataUrl()
    if (!retailerData) {
      toast.error(t("retailerSignatureRequired"))
      return
    }
    if (!ack) {
      toast.error(t("acceptanceRequired"))
      return
    }
    if (!gdpr) {
      toast.error(t("gdprRequired"))
      return
    }
    startTransition(async () => {
      const saved = await saveRetailerSignatureAction({
        id: contractId,
        retailerSignature: retailerData,
        ack,
        gdpr,
      })
      if (!saved.ok) {
        toast.error(saved.error)
        return
      }
      const res = await requestContractOtpAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setRetailerSig(retailerData)
      setOtp("")
      setOtpSentTo(res.data!.sentTo)
      setOtpVerifiedAt(null)
      setStep(2)
      toast.success(t("otpSent").replace("{email}", res.data!.sentTo))
    })
  }

  function onVerifyOtp() {
    startTransition(async () => {
      const res = await verifyContractOtpAction({ id: contractId, otp })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOtpVerifiedAt(res.data!.verifiedAt)
      setStep(3)
      toast.success(t("otpVerified"))
      await refreshSigningState()
    })
  }

  function onResendOtp() {
    startTransition(async () => {
      const res = await requestContractOtpAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOtp("")
      setOtpSentTo(res.data!.sentTo)
      setOtpVerifiedAt(null)
      toast.success(t("otpSent").replace("{email}", res.data!.sentTo))
    })
  }

  function onSendRemoteLink() {
    startTransition(async () => {
      const res = await sendRetailerSigningLinkAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setRemoteLink(res.data!.url)
      await refreshSigningState()
      if (res.data!.emailed && res.data!.sentTo) {
        toast.success(t("signingLinkSent").replace("{email}", res.data!.sentTo))
      } else {
        toast.success(t("signingLinkGenerated"))
      }
    })
  }

  function onSubmit() {
    // Try to get current data, fallback to captured state
    const currentRetailerData = retailerRef.current?.toDataUrl()
    const retailerData = currentRetailerData || retailerSig
    const staffData = staffRef.current?.toDataUrl()
    
    const hasRetailerSig = !!retailerData || !!signingState?.retailerSignaturePath
    if (!hasRetailerSig || !ack || !gdpr) {
      setStep(1)
      toast.error(t("retailerSignatureRequired"))
      return
    }
    if (!otpVerifiedAt) {
      setStep(2)
      toast.error(t("otpVerificationRequired"))
      return
    }
    
    if (!staffData) {
      toast.error(t("staffSignatureRequired"))
      return
    }

    startTransition(async () => {
      const res = await finalizeContractAction({
        id: contractId,
        retailerSignature: signingState?.retailerSignaturePath ? null : (retailerData ?? null),
        staffSignature: staffData,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(t("contractSigned"))
      router.refresh()
    })
  }

  return (
    <Card className="border-2 border-[#E8F4FE] shadow-lg overflow-hidden">
      <CardHeader className="border-b border-[#E8F4FE] bg-[#F4FAFF] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl">{t("contractFinalization")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {step === 1
                ? t("stepRetailerSignature")
                : step === 2
                  ? t("stepOtpVerification")
                  : t("stepStaffSignature")}
            </CardDescription>
          </div>
          <div className="flex gap-1 sm:shrink-0">
            <div className={`h-2 w-8 rounded-full ${step >= 1 ? "bg-brand-navy" : "bg-muted"}`} />
            <div className={`h-2 w-8 rounded-full ${step >= 2 ? "bg-brand-navy" : "bg-muted"}`} />
            <div className={`h-2 w-8 rounded-full ${step >= 3 ? "bg-brand-navy" : "bg-muted"}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className={step === 1 ? "flex flex-col gap-5 sm:gap-6" : "hidden"}>
            <div className="rounded-lg border border-[#E8F4FE] bg-[#F4FAFF] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-brand-navy">{t("remoteSigningLinkLabel")}</div>
                  <div className="mt-1 text-xs sm:text-sm text-slate-600">
                    {t("remoteSigningLinkDesc")}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSendRemoteLink}
                  disabled={pending}
                  className="w-full sm:w-auto border-[#D6EEFF] text-brand-navy hover:bg-[#D6EEFF]"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {t("sendLink")}
                </Button>
              </div>

              {remoteLink ? (
                <div className="mt-3 sm:mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input readOnly value={remoteLink} className="text-xs sm:text-sm" />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(remoteLink)
                          toast.success(t("linkCopied"))
                        } catch {
                          toast.error(t("linkCopyError"))
                        }
                      }}
                      className="flex-1 sm:flex-none sm:w-auto border-[#E8F4FE]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {t("copy")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(remoteLink, "_blank", "noreferrer")}
                      className="flex-1 sm:flex-none sm:w-auto border-[#E8F4FE]"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("open")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <SignaturePad
              ref={retailerRef}
              label={t("retailerSignatureLabel")}
              description={t("retailerSignatureDesc")}
            />

            <p className="text-xs sm:text-sm text-slate-600">
              La sottoscrizione del presente Contratto è confermata tramite verifica OTP.
            </p>

            <label className="flex items-start gap-3 rounded-lg border-2 border-[#245bc1]/10 bg-[#F4FAFF] p-3 sm:p-4 text-xs sm:text-sm transition-colors hover:bg-[#E8F4FE]">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue flex-shrink-0"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span className="leading-relaxed font-medium text-brand-navy">
                {t("termsAcceptance")}
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border-2 border-[#08dc7d]/10 bg-[#F0FFF7] p-3 sm:p-4 text-xs sm:text-sm transition-colors hover:bg-[#DCFCE7]">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green flex-shrink-0"
                checked={gdpr}
                onChange={(e) => setGdpr(e.target.checked)}
              />
              <span className="leading-relaxed font-medium text-brand-navy">
                {t("gdprConsent")}
              </span>
            </label>

            <div className="flex flex-col pt-1 sm:pt-2 sm:flex-row sm:justify-end">
              <Button
                onClick={onNext}
                disabled={pending}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 sm:w-auto sm:px-8 min-h-[44px] overflow-hidden"
              >
                <div className="flex items-center justify-center shrink-0">
                  {pending ? <Loader size={18} weight={26} inherit label="Saving signature" /> : null}
                  {!pending && t("next")}
                  {!pending && <ArrowRight className="ml-2 h-4 w-4" />}
                </div>
              </Button>
            </div>
          </div>

          <div className={step === 2 ? "flex flex-col gap-5 sm:gap-6" : "hidden"}>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4 text-green-800 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{t("retailerSignedAccepted")}</span>
            </div>

            <div className="rounded-lg border border-[#E8F4FE] bg-[#F4FAFF] p-3 sm:p-4 overflow-hidden">
              <div className="text-sm font-semibold text-brand-navy">{t("otpVerification")}</div>
              <div className="mt-1 text-xs sm:text-sm text-slate-600">
                {t("otpVerificationDesc").replace("{email}", otpSentTo ?? "the retailer email")}
              </div>
              {autoRefreshActive ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("waitingForRetailer")}
                </div>
              ) : null}
              <div className="mt-3 sm:mt-4 flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(v) => setOtp(v)}
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="mt-3 sm:mt-4 flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOtp("")
                    setOtpSentTo(null)
                    setOtpVerifiedAt(null)
                    setStep(1)
                  }}
                  disabled={pending}
                  className="w-full sm:hidden border-[#E8F4FE]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("backToRetailer")}
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOtp("")
                      setOtpSentTo(null)
                      setOtpVerifiedAt(null)
                      setStep(1)
                    }}
                    disabled={pending}
                    className="hidden sm:w-auto sm:inline-flex border-[#E8F4FE]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("backToRetailer")}
                  </Button>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button variant="outline" onClick={onResendOtp} disabled={pending} className="w-full sm:w-auto border-[#E8F4FE]">
                      {t("resendOtp")}
                    </Button>
                    <Button
                      onClick={onVerifyOtp}
                      disabled={pending || otp.replace(/\\s+/g, "").length !== 6}
                      className="w-full bg-brand-navy hover:bg-brand-navy/90 sm:w-auto sm:px-8 min-h-[44px] overflow-hidden"
                    >
                      <div className="flex items-center justify-center shrink-0">
                        {pending ? <Loader size={18} weight={26} inherit label="Verifying code" /> : null}
                        {!pending && t("verifyOtp")}
                        {!pending && <ArrowRight className="ml-2 h-4 w-4" />}
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={step === 3 ? "flex flex-col gap-5 sm:gap-6" : "hidden"}>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4 text-green-800 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{t("retailerSignedOtpVerified")}</span>
            </div>

            <SignaturePad
              ref={staffRef}
              label={t("staffSignatureLabel")}
              description={t("staffSignatureDesc")}
            />

            <div className="flex flex-col-reverse gap-3 pt-1 sm:pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={pending} className="w-full sm:w-auto border-[#E8F4FE]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("backToOtp")}
              </Button>
              <Button
                onClick={onSubmit}
                disabled={pending}
                className="w-full bg-brand-green font-bold text-brand-navy hover:bg-brand-green/90 sm:w-auto sm:px-8 min-h-[44px] overflow-hidden"
              >
                <div className="flex items-center justify-center shrink-0">
                  {pending ? <Loader size={18} weight={26} inherit label="Generating contract" /> : null}
                  {!pending && t("completeAndGeneratePdf")}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
