"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"

export function PasswordChangeForm() {
  const [pending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
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
        const sessionResult = await supabase.auth.getSession()

        if (!sessionResult.data?.session) {
          toast.error("Unable to update password: there is no active session. Please sign in again.")
          return
        }

        const { error } = await supabase.auth.updateUser({ password: formData.password })
        if (!error) {
          toast.success("Password updated successfully")
          setFormData({ password: "", confirmPassword: "" })
          return
        }

        const msg =
          typeof error.message === "string" && error.message.trim().length > 0
            ? error.message
            : JSON.stringify(error, Object.getOwnPropertyNames(error)) || String(error)
        toast.error(msg || "Failed to update password")
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
            ? e
            : JSON.stringify(e, Object.getOwnPropertyNames(e)) || String(e) || "Failed to update password"
        toast.error(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-brand-navy hover:bg-brand-navy/90">
        {pending ? <Spinner className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
        Update Password
      </Button>
    </form>
  )
}
