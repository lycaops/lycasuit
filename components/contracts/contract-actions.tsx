"use client"

import { useTransition } from "react"
import { Download, Mail, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import Loader from "@/components/Loader"
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
  const [pendingDraftEmail, startDraftEmail] = useTransition()
  const [pendingDraftWhatsApp, startDraftWhatsApp] = useTransition()

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
    startDraftEmail(async () => {
      const res = await sendDraftContractEmailAction(contractId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(t("emailSentTo").replace("{email}", res.data!.sentTo.join(", ")))
    })
  }

  function shareDraftWhatsApp() {
    startDraftWhatsApp(async () => {
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
    <div className="flex flex-col w-full gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {status !== "SIGNED" ? (
        <>
          <Button
            onClick={downloadDraft}
            variant="outline"
            disabled={pendingDraft}
            className="w-full sm:w-auto border-[#D6EEFF] text-brand-navy hover:bg-[#F4FAFF]"
          >
            {pendingDraft ? (
              <Loader size={18} weight={26} inherit label="Downloading draft" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t("downloadDraft")}
          </Button>
          <Button
            onClick={shareDraftEmail}
            variant="outline"
            disabled={pendingDraftEmail}
            className="w-full sm:w-auto border-[#D6EEFF] text-brand-navy hover:bg-[#F4FAFF]"
          >
            {pendingDraftEmail ? (
              <Loader size={18} weight={26} inherit label="Sending email" />
            ) : (
              <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t("sendByEmail")}
          </Button>
          <Button
            onClick={shareDraftWhatsApp}
            variant="outline"
            disabled={pendingDraftWhatsApp}
            className="w-full sm:w-auto border-[#E8F4FE] text-brand-navy hover:bg-[#F4FAFF]"
          >
            {pendingDraftWhatsApp ? (
              <Loader size={18} weight={26} inherit label="Sharing draft" />
            ) : (
              <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t("whatsapp")}
          </Button>
        </>
      ) : (
        <>
          <Button onClick={download} disabled={pendingDownload} className="w-full sm:w-auto">
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
            disabled={pendingEmail}
            className="w-full sm:w-auto border-[#E8F4FE]"
          >
            {pendingEmail ? (
              <Loader size={18} weight={26} inherit label="Sending email" />
            ) : (
              <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {t("sendByEmail")}
          </Button>
        </>
      )}
    </div>
  )
}
