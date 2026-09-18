"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Shield, Lock, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export default function ResetPasswordPage() {
  const [pending, startTransition] = useTransition()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" })

  const checkSession = async (mounted: boolean) => {
    try {
      const supabase = createClient()
      // Use getUser() as it's more reliable than getSession() for verifying a fresh session
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (mounted) {
        if (user) {
          console.log("Session verified for user:", user.email)
          setHasSession(true)
          setReady(true)
          return true
        }
        if (error && error.status !== 401) {
          console.warn("Auth check warning:", error.message)
        }
      }
    } catch (e) {
      console.error("Session check failed:", e)
    }
    return false
  }

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const init = async () => {
      if (typeof window === "undefined") return

      const params = new URLSearchParams(window.location.search)
      const error = params.get("error")
      const errorDescription = params.get("error_description")
      const code = params.get("code")

      console.log("Initializing reset-password page", { 
        hasCode: !!code, 
        hasHash: !!window.location.hash,
        error 
      })

      // 1. Handle explicit Supabase verification errors
      if (error || errorDescription) {
        if (mounted) {
          setErrorMsg(errorDescription || error || "Link verification failed.")
          setReady(true)
        }
        return
      }

      // 2. Handle PKCE code exchange
      if (code) {
        console.log("Exchanging PKCE code...")
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error("Exchange error:", exchangeError)
          if (mounted) {
            setErrorMsg(`Verification failed: ${exchangeError.message}. Please request a new link.`)
            setReady(true)
          }
          return
        }
        if (data?.session && mounted) {
          console.log("PKCE exchange successful")
          setHasSession(true)
          setReady(true)
          return
        }
      }

      // 3. Initial check for session
      const found = await checkSession(mounted)
      if (found) return

      // 4. If we have a hash, it might take a moment for the client library to parse it and set cookies
      if (window.location.hash) {
        console.log("Hash detected, starting retry loop...")
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 1000))
          if (!mounted) return
          const foundRetry = await checkSession(mounted)
          if (foundRetry) return
          console.log(`Retry ${i + 1} for session detection...`)
        }
      }

      // 5. Done checking
      if (mounted) {
        setReady(true)
      }
    }

    // Auth state listener as a secondary catch for background updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, !!session)
      if (mounted && session) {
        setHasSession(true)
        setReady(true)
      }
    })

    init()

    // Safety timeout: stop spinner after 10s regardless
    const timer = setTimeout(() => {
      if (mounted && !ready) {
        console.log("Safety timeout reached")
        setReady(true)
      }
    }, 10000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: formData.password })
        if (error) {
          const msg =
            typeof error?.message === "string" && error.message.trim().length > 0
              ? error.message
              : JSON.stringify(error, Object.getOwnPropertyNames(error)) || String(error)
          toast.error(msg || "Failed to update password")
          return
        }
        toast.success("Password updated successfully")
        setFormData({ password: "", confirmPassword: "" })
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : JSON.stringify(err, Object.getOwnPropertyNames(err)) || String(err) || "Failed to update password"
        toast.error(msg)
      }
    })
  }

  if (!ready) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-10">
          <Spinner className="h-5 w-5" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#21264e] text-[#fff7f2]">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">Reset password</h1>
            <p className="text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        ) : !hasSession ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one from your administrator.
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                 <RefreshCw className="mr-2 h-4 w-4" />
                 Check again
               </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Spinner className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
              Update password
            </Button>
          </form>
        )}

        <Button variant="outline" asChild>
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

