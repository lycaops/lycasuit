"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Lock, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { signInAction } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import Loader from "@/components/Loader"

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    if (returnTo) {
      formData.set("returnTo", returnTo)
    }

    const result = await signInAction(formData)

    if (!result.ok) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success("Signed in")
    router.replace(returnTo ?? "/home")
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-[#26324d]">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 pl-10" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[#26324d]">Password</Label>
              <span className="text-xs font-medium text-[#006ae0]">Secure access</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="h-12 pl-10" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="mt-2 h-12 w-full bg-[#006ae0] font-medium text-white shadow-[0_10px_20px_rgba(0,106,224,0.18)] hover:bg-[#0056b8]">
            {loading ? <Loader size={18} weight={26} inherit label="Logging in" /> : null}
            {loading ? "Logging in..." : "Log in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Need an account? Contact your administrator.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
