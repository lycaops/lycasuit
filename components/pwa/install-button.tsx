"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

export function InstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const userAgent = window.navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    const dismissed = window.localStorage.getItem("lycaops-ios-install-dismissed") === "true"

    if (isIos && !dismissed) setShowIosHint(true)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setInstallEvent(null)
      setShowIosHint(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  if (!installEvent && !showIosHint) return null

  const dismissIosHint = () => {
    window.localStorage.setItem("lycaops-ios-install-dismissed", "true")
    setShowIosHint(false)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    setInstallEvent(null)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-[#152253]/15 bg-white p-3 text-sm text-[#21264e] shadow-lg">
      {installEvent ? (
        <button
          type="button"
          onClick={install}
          className="flex items-center gap-2 rounded-md bg-[#152253] px-3 py-2 font-medium text-white transition hover:bg-[#212f68]"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Install app
        </button>
      ) : (
        <span>Tap Share, then Add to Home Screen</span>
      )}
      {showIosHint && (
        <button
          type="button"
          onClick={dismissIosHint}
          aria-label="Dismiss install instructions"
          className="rounded-md p-1 text-[#21264e]/60 transition hover:bg-[#152253]/10 hover:text-[#21264e]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}