"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Loader from "@/components/Loader"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Check, Copy, Key, Mail, Pencil, Shield } from "lucide-react"
import { UserFormFields } from "./user-form-fields"
import {
  resetUserPasswordToTemporaryAction,
  sendUserPasswordResetEmailAction,
  updateUserAction,
} from "@/app/tools/contracts/users/actions"
import type { AppUser } from "@/lib/types"

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AppUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    role: "FSE" as AppUser["role"],
    branch: null as string | null,
    branches: null as string[] | null,
    zone: null as string | null,
    is_active: true,
  })
  const [pending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      setTempPassword(null)
      setCopied(false)
      setValues({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        branches: user.branches ?? null,
        zone: user.zone,
        is_active: user.is_active,
      })
    }
  }, [user])

  if (!user) return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    startTransition(async () => {
      if (values.role === "RSM" && (!values.branches || values.branches.length === 0)) {
        toast.error("Select at least one branch for RSM.")
        return
      }
      const res = await updateUserAction(user.id, {
        full_name: values.full_name,
        role: values.role,
        branch: values.branch,
        branches: values.branches,
        zone: values.zone,
        is_active: values.is_active,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("User updated")
      onOpenChange(false)
    })
  }

  function sendPasswordResetEmail() {
    if (!user) return
    startTransition(async () => {
      const res = await sendUserPasswordResetEmailAction({ email: user.email })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Password reset email sent")
    })
  }

  function resetToTempPassword() {
    if (!user) return
    startTransition(async () => {
      const res = await resetUserPasswordToTemporaryAction(user.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setTempPassword(res.data)
      toast.success("Password has been reset")
    })
  }

  function copyToClipboard() {
    if (!tempPassword) return
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Password copied to clipboard")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 bg-brand-navy">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Pencil className="h-5 w-5 text-white/80" />
            Edit Staff Member
          </DialogTitle>
          <DialogDescription className="text-white/70 text-xs">
            Modify permissions and security settings for <strong>{user.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col">
          <div className="px-6 py-5 space-y-5 bg-white">
            <div className="space-y-4">
              <UserFormFields
                values={values}
                onChange={(p) => setValues((v) => ({ ...v, ...p }))}
                emailDisabled
              />

              <div className="flex items-center justify-between rounded-lg bg-brand-navy/[0.03] border border-brand-navy/10 p-3 shadow-sm mt-2">
                <div className="flex flex-col">
                  <Label htmlFor="is_active" className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    Account Access
                  </Label>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    {values.is_active ? "Authorized to sign in" : "Access currently revoked"}
                  </span>
                </div>
                <Switch
                  id="is_active"
                  checked={values.is_active}
                  onCheckedChange={(v) => setValues((prev) => ({ ...prev, is_active: v }))}
                  className="data-[state=checked]:bg-emerald-500 scale-90"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border p-4 bg-muted/20 border-brand-navy/5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black text-brand-navy/50 uppercase tracking-[0.2em]">Security Controls</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sendPasswordResetEmail}
                    disabled={pending}
                    className="h-7 text-[10px] border-brand-navy/10 hover:bg-brand-navy/5 text-brand-navy font-bold uppercase"
                  >
                    {pending ? <Loader size={18} weight={26} inherit label="Sending reset email" /> : <Mail className="mr-1.5 h-3 w-3" />}
                    Email Link
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={resetToTempPassword}
                    disabled={pending}
                    className="h-7 text-[10px] bg-brand-navy hover:bg-brand-navy/90 shadow-sm font-bold uppercase"
                  >
                    {pending ? <Loader size={18} weight={26} inherit label="Setting temporary password" /> : <Key className="mr-1.5 h-3 w-3" />}
                    Set Temp
                  </Button>
                </div>
              </div>

              {tempPassword && (
                <div className="flex flex-col gap-2 rounded-lg bg-white p-3 border border-brand-navy/10 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between gap-3">
                    <code className="flex-1 rounded-md bg-muted/30 px-3 py-1.5 text-lg font-mono font-black text-brand-navy tracking-widest border border-brand-navy/5">
                      {tempPassword}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                      className="h-9 w-9 shrink-0 border-brand-navy/10 hover:border-brand-navy/30 hover:bg-brand-navy/5"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-brand-navy/50" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-muted/30 border-t flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              Discard
            </Button>
            <Button type="submit" disabled={pending} size="sm" className="bg-brand-navy hover:bg-brand-navy/90 px-8 shadow-md text-xs font-bold uppercase tracking-widest">
              {pending ? <Loader size={18} weight={26} inherit label="Updating account" /> : null}
              Update Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
