"use client"

import { useEffect } from "react"

export function OfflineRedirect() {
  useEffect(() => {
    const handleOffline = () => {
      if (window.location.pathname !== "/offline") window.location.replace("/offline")
    }

    window.addEventListener("offline", handleOffline)
    return () => window.removeEventListener("offline", handleOffline)
  }, [])

  return null
}