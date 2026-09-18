"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, User, MapPin, Phone, Mail, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Progress } from "@/components/ui/progress"
import { SignaturePad, type SignaturePadHandle } from "@/components/contracts/signature-pad"
import { cn } from "@/lib/utils"
import {
  requestContractOtpByTokenAction,
  saveRetailerSignatureByTokenAction,
  verifyContractOtpByTokenAction,
  getDraftContractPdfAction,
} from "./actions"
import { useI18n } from "@/lib/i18n/i18n-context"

export function RetailerSignPanel(props: {
  token: string
  initial: {
    contractId: string
    companyName: string
    shopName: string
    vatNumber: string
    contactFirstName: string
    contactLastName: string
    street: string
    houseNumber: string
    city: string
    postCode: string
    email: string
    mobileNumber: string
    landlineNumber: string | null
    status: string
    retailerSignaturePath: string | null
    retailerAck: boolean | null
    retailerGdpr: boolean | null
    otpVerifiedAt: string | null | undefined
    signLinkExpiresAt: string | null | undefined
    signLinkUsedAt: string | null | undefined
  }
}) {
  const { t, language } = useI18n()
  const retailerRef = useRef<SignaturePadHandle>(null)
  const [pending, startTransition] = useTransition()
  const [pendingDraft, startDraft] = useTransition()
  const [ack, setAck] = useState(!!props.initial.retailerAck)
  const [gdpr, setGdpr] = useState(!!props.initial.retailerGdpr)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(() =>
    props.initial.otpVerifiedAt ? 3 : 0,
  )
  const [otp, setOtp] = useState("")
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
  const [otpVerifiedAt, setOtpVerifiedAt] = useState<string | null>(
    props.initial.otpVerifiedAt ?? null,
  )
  const [retailerSigPath, setRetailerSigPath] = useState<string | null>(
    props.initial.retailerSignaturePath ?? null,
  )

  const expired = (() => {
    if (!props.initial.signLinkExpiresAt) return true
    const t = new Date(props.initial.signLinkExpiresAt).getTime()
    return Number.isNaN(t) || Date.now() > t
  })()

  const completed =
    !!props.initial.sign_link_used_at ||
    (!!retailerSigPath && !!otpVerifiedAt)

  const progressValue = step === 0 ? 0 : step === 1 ? 33 : step === 2 ? 66 : 100

  useEffect(() => {
    const timer = setTimeout(() => {
      retailerRef.current?.resize()
    }, 50)
    return () => clearTimeout(timer)
  }, [step])

  function onSendOtp() {
    const retailerData = retailerRef.current?.toDataUrl()
    if (!retailerData) {
      toast.error(t("signatureRequired"))
      return
    }
    if (!ack) {
      toast.error(t("ackRequired"))
      return
    }
    if (!gdpr) {
      toast.error(t("gdprRequiredShort"))
      return
    }

    startTransition(async () => {
      const saved = await saveRetailerSignatureByTokenAction({
        token: props.token,
        retailerSignature: retailerData,
        ack,
        gdpr,
      })
      if (!saved.ok) {
        toast.error(saved.error)
        return
      }

      setRetailerSigPath(saved.data!.retailerSignaturePath)

      const res = await requestContractOtpByTokenAction(props.token)
      if (!res.ok) {
        toast.error(res.error)
        return
      }

      setOtp("")
      setOtpSentTo(res.data!.sentTo)
      setOtpVerifiedAt(null)
      setStep(2)
      toast.success(t("otpSentSuccess").replace("{email}", res.data!.sentTo))
    })
  }

  function onVerifyOtp() {
    startTransition(async () => {
      const res = await verifyContractOtpByTokenAction({ token: props.token, otp })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOtpVerifiedAt(res.data!.verifiedAt)
      setStep(3)
      toast.success(t("otpVerifiedSuccess"))
    })
  }

  function onResendOtp() {
    startTransition(async () => {
      const res = await requestContractOtpByTokenAction(props.token)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOtp("")
      setOtpSentTo(res.data!.sentTo)
      toast.success(t("otpResentSuccess").replace("{email}", res.data!.sentTo))
    })
  }

  function onDownloadDraft() {
    startDraft(async () => {
      const res = await getDraftContractPdfAction(props.token)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      
      const base64ToBlob = (base64: string, type = "application/pdf") => {
        const binStr = atob(base64)
        const len = binStr.length
        const arr = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i)
        }
        return new Blob([arr], { type })
      }

      const blob = base64ToBlob(res.data!)
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = `Draft_Contract_${props.initial.companyName}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
      toast.success(t("draftPdfGenerated"))
    })
  }

  if (expired) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-xl">{t("linkExpiredTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {t("linkExpiredDesc")}
        </CardContent>
      </Card>
    )
  }

  if (completed) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-xl">{t("contractFinalizedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-6 w-6 text-green-600" />
                <div>
                  <p className="text-lg font-semibold text-green-900">
                    {t("contractFinalizedSuccess")}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {t("contractFinalizedDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t("contracts")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                #{props.initial.contractId}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t("status")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {props.initial.status || t("active")}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t("company")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {props.initial.companyName}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t("contactFirstName")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {props.initial.contactFirstName} {props.initial.contactLastName}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {t("otpVerification")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {otpVerifiedAt
                  ? new Date(otpVerifiedAt).toLocaleString(language === "en" ? "en-GB" : "it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : t("completed")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-xl">
          {step === 0
            ? t("reviewContractDetails")
            : step === 2
              ? t("identityVerification")
              : t("consentAndSignature")}
        </CardTitle>
        {step === 0 && (
          <CardDescription>
            {t("reviewDetailsDesc")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {step !== 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-row flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-900">
              <span className={cn(step === 1 ? "text-slate-900" : "text-slate-500")}>{t("signature")}</span>
              <span className={cn(step === 2 ? "text-slate-900" : "text-slate-500")}>{t("otp")}</span>
              <span className={cn(step === 3 ? "text-slate-900" : "text-slate-500")}>{t("done")}</span>
            </div>
            <div className="mb-3">
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className={step === 0 ? "flex flex-col gap-6" : "hidden"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow
                icon={Hash}
                label={t("contractNumber")}
                value={`#${props.initial.contractId}`}
              />
              <InfoRow
                icon={User}
                label={t("companyName")}
                value={props.initial.companyName}
              />
              <InfoRow
                icon={FileText}
                label={t("shopName")}
                value={props.initial.shopName}
              />
              <InfoRow
                icon={Hash}
                label={t("vatNumberLabel")}
                value={props.initial.vatNumber}
              />
              <InfoRow
                icon={User}
                label={t("contactPerson")}
                value={`${props.initial.contactFirstName} ${props.initial.contactLastName}`}
              />
              <InfoRow
                icon={Mail}
                label={t("emailLabel")}
                value={props.initial.email}
              />
              <InfoRow
                icon={MapPin}
                label={t("address")}
                value={`${props.initial.street} ${props.initial.houseNumber}, ${props.initial.postCode} ${props.initial.city}`}
                className="sm:col-span-2"
              />
              <InfoRow
                icon={Phone}
                label={t("contactNumbers")}
                value={`${props.initial.mobileNumber}${props.initial.landlineNumber ? ` / ${props.initial.landlineNumber}` : ""}`}
                className="sm:col-span-2"
              />
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={onDownloadDraft}
                disabled={pendingDraft}
                className="w-full sm:w-auto"
              >
                {pendingDraft ? <Spinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                {t("downloadDraftPdf")}
              </Button>
              <Button
                onClick={() => setStep(1)}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 sm:w-auto sm:px-8"
              >
                {t("confirmAndProceed")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={step === 1 ? "flex flex-col gap-6" : "hidden"}>
            <SignaturePad
              ref={retailerRef}
              label={t("signature")}
              description={t("retailerSignatureDesc")}
            />

            <label className="flex items-start gap-3 rounded-lg border-2 border-brand-blue/10 bg-brand-blue/5 p-4 text-sm transition-colors hover:bg-brand-blue/10">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span className="leading-relaxed font-medium text-brand-navy">
                {t("termsAcceptance")}
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border-2 border-brand-green/10 bg-brand-green/5 p-4 text-sm transition-colors hover:bg-brand-green/10">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                checked={gdpr}
                onChange={(e) => setGdpr(e.target.checked)}
              />
              <span className="leading-relaxed font-medium text-brand-navy">
                {t("gdprConsent")}
              </span>
            </label>

            <div className="flex flex-col pt-2 sm:flex-row sm:justify-end">
              <Button
                onClick={onSendOtp}
                disabled={pending}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 sm:w-auto sm:px-8"
              >
                {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {t("sendOtp")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={step === 2 ? "flex flex-col gap-6" : "hidden"}>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-semibold text-brand-navy">{t("identityVerification")}</div>
              <div className="mt-1 text-sm text-slate-600">
                {t("enterOtpDesc")}
              </div>
              <div className="mt-4 flex justify-center">
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

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="outline" onClick={onResendOtp} disabled={pending} className="w-full sm:w-auto">
                  {t("resendOtp")}
                </Button>
                <Button
                  onClick={onVerifyOtp}
                  disabled={pending || otp.replace(/\s+/g, "").length !== 6}
                  className="w-full bg-brand-navy hover:bg-brand-navy/90 sm:w-auto sm:px-8"
                >
                  {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  {t("verifyOtp")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className={step === 3 ? "flex flex-col gap-6" : "hidden"}>
            <div className="rounded-lg border bg-green-50 p-4 text-green-800 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">
                {t("thanksSignatureCompleted")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: any
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border bg-white p-3 shadow-sm", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-brand-navy">
          {value}
        </p>
      </div>
    </div>
  )
}

