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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const userAgent = window.navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    const iosDismissed = window.localStorage.getItem("lycaops-ios-install-dismissed") === "true"
    const installDismissed = window.localStorage.getItem("lycaops-install-dismissed") === "true"

    if (isIos && !iosDismissed) setShowIosHint(true)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      if (!installDismissed) setShowInstallPrompt(true)
    }
    const handleAppInstalled = () => {
      setInstallEvent(null)
      setShowIosHint(false)
      setShowInstallPrompt(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  if ((!installEvent || !showInstallPrompt) && !showIosHint) return null

  const dismissIosHint = () => {
    window.localStorage.setItem("lycaops-ios-install-dismissed", "true")
    setShowIosHint(false)
  }

  const dismissInstallPrompt = () => {
    window.localStorage.setItem("lycaops-install-dismissed", "true")
    setShowInstallPrompt(false)
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    setInstallEvent(null)
  }

  const showCloseForInstall = installEvent && showInstallPrompt
  const showCloseAny = showCloseForInstall || showIosHint

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-[#152253]/15 bg-white p-3 text-sm text-[#21264e] shadow-lg sm:left-auto sm:right-4 sm:-translate-x-0 sm:bottom-4 sm:max-w-none">
      {installEvent && showInstallPrompt ? (
        <>
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={install}
              className="flex items-center gap-2 rounded-md bg-[#152253] px-3 py-2 font-medium text-white transition hover:bg-[#212f68]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Install app
            </button>
            {showCloseForInstall && (
              <button
                type="button"
                onClick={dismissInstallPrompt}
                aria-label="Dismiss install prompt"
                className="rounded-md p-1 text-[#21264e]/60 transition hover:bg-[#152253]/10 hover:text-[#21264e] shrink-0"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </>
      ) : showIosHint ? (
        <div className="flex w-full items-center justify-between gap-3">
          <span className="flex-1 text-sm text-[#21264e]">Tap Share, then Add to Home Screen</span>
          {showIosHint && (
            <button
              type="button"
              onClick={dismissIosHint}
              aria-label="Dismiss install instructions"
              className="rounded-md p-1 text-[#21264e]/60 transition hover:bg-[#152253]/10 hover:text-[#21264e] shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}