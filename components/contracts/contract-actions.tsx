"use client"

import { useTransition } from "react"
import { Download, Link, Mail, MessageCircle, Share2, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import Loader from "@/components/Loader"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getContractPdfUrlAction,
  sendContractEmailAction,
  getDraftContractPdfAction,
  getDraftContractPdfUrlAction,
  sendDraftContractEmailAction,
} from "@/app/tools/contracts/contracts/actions"
import { useI18n } from "@/lib/i18n/i18n-context"

function isIosSafari() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIos && isSafari
}

function base64ToBlob(base64: string, contentType: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: contentType })
}

export function ContractActions({
  contractId,
  status,
}: {
  contractId: string
  status: string
}) {
  const { t } = useI18n()
  const [pendingDownload, startDownload] = useTransition()
  const [pendingEmail, startEmail] = useTransition()
  const [pendingDraft, startDraft] = useTransition()
  const [pendingDraftShare, startDraftShare] = useTransition()

  const disabled = status !== "SIGNED"

  function downloadDraft() {
    const popup = isIosSafari() ? window.open("", "_blank") : null
    startDraft(async () => {
      const res = await getDraftContractPdfAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        popup?.close()
        return
      }

      const { base64, filename } = res.data!
      const blob = base64ToBlob(base64, "application/pdf")
      const objectUrl = URL.createObjectURL(blob)

      if (popup) {
        popup.document.title = filename
        popup.location.href = objectUrl
      } else {
        const link = document.createElement("a")
        link.href = objectUrl
        link.setAttribute("download", filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
      }

      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
      toast.success(t("draftPdfGenerated"))
    })
  }

  function shareDraftEmail() {
    startDraftShare(async () => {
      const res = await sendDraftContractEmailAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(t("emailSentTo").replace("{email}", res.data!.sentTo.join(", ")))
    })
  }

  function copyDraftUrl() {
    startDraftShare(async () => {
      const res = await getDraftContractPdfUrlAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }

      try {
        await navigator.clipboard.writeText(res.data!.url)
        toast.success(t("draftPdfLinkCopied"))
      } catch {
        toast.error("Could not copy to clipboard")
      }
    })
  }

  function shareDraftWhatsApp() {
    startDraftShare(async () => {
      const res = await getDraftContractPdfUrlAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }

      const text = `Draft contract PDF:\n${res.data!.url}`
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(waUrl, "_blank", "noopener,noreferrer")
    })
  }

  function download() {
    const popup = isIosSafari() ? window.open("", "_blank") : null
    startDownload(async () => {
      const res = await getContractPdfUrlAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        popup?.close()
        return
      }
      
      const url = res.data!.url
      if (popup) {
        popup.location.href = url
        return
      }

      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "")
      document.body.appendChild(link)
      link.click()
      link.remove()
    })
  }

  function email() {
    startEmail(async () => {
      const res = await sendContractEmailAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(t("emailSentTo").replace("{email}", res.data!.sentTo.join(", ")))
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status !== "SIGNED" && (
        <>
          <Button
            onClick={downloadDraft}
            variant="outline"
            disabled={pendingDraft}
            className="border-brand-navy text-brand-navy hover:bg-brand-navy/5"
          >
            {pendingDraft ? (
              <Loader size={18} weight={26} inherit label="Downloading draft" />
            ) : (
              <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t("downloadDraft")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={pendingDraftShare}
                className="border-brand-navy text-brand-navy hover:bg-brand-navy/5"
              >
                {pendingDraftShare ? (
                  <Loader size={18} weight={26} inherit label="Sharing draft" />
                ) : (
                  <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                {t("shareDraft")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled={pendingDraftShare} onClick={shareDraftEmail}>
                <Mail className="h-4 w-4" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pendingDraftShare}
                onClick={shareDraftWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                {t("whatsapp")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={pendingDraftShare} onClick={copyDraftUrl}>
                <Link className="h-4 w-4" />
                {t("copyUrl")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      <Button onClick={download} disabled={disabled || pendingDownload}>
        {pendingDownload ? (
          <Loader size={18} weight={26} inherit label="Downloading contract" />
        ) : (
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        {t("downloadPdf")}
      </Button>
      <Button
        onClick={email}
        variant="outline"
        disabled={disabled || pendingEmail}
      >
        {pendingEmail ? (
          <Loader size={18} weight={26} inherit label="Sending email" />
        ) : (
          <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        {t("sendByEmail")}
      </Button>
    </div>
  )
}
