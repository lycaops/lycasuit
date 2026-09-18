"use client"

import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash2, Mail, Shield, MapPin, CheckCircle2, XCircle, Key, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { useI18n } from "@/lib/i18n/i18n-context"
import type { AppUser } from "@/lib/types"
import { 
  deleteUserAction, 
  sendUserPasswordResetEmailAction, 
  resetUserPasswordToTemporaryAction 
} from "@/app/tools/contracts/users/actions"
import { EditUserDialog } from "./edit-user-dialog"
import { BRANCHES } from "@/lib/branches"

export function UsersTable({ users }: { users: AppUser[] }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [tempPasswordData, setTempPasswordData] = useState<{ password: string; user: AppUser } | null>(null)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const SOUTH_BRANCHES = ["LMIT-HS-BARI", "LMIT-HS-NAPLES", "LMIT-HS-PALERMO", "LMIT-HS-ROME"]
  const NORTH_BRANCHES = ["LMIT-HS-BOLOGNA", "LMIT-HS-MILAN", "LMIT-HS-PADOVA", "LMIT-HS-TORINO"]

  function formatAssignments(u: AppUser) {
    if (u.role === "ADMIN") return t("italy")
    
    const userBranches = u.branches || (u.branch ? [u.branch] : [])
    if (userBranches.length === 0) return t("unassigned")

    // Check for ITALY (All branches)
    if (userBranches.length === BRANCHES.length) {
      const allIncluded = BRANCHES.every(b => userBranches.includes(b))
      if (allIncluded) return t("italy")
    }

    // Check for SOUTH REGION
    const hasAllSouth = SOUTH_BRANCHES.every(b => userBranches.includes(b))
    const onlySouth = userBranches.every(b => SOUTH_BRANCHES.includes(b))
    if (hasAllSouth && onlySouth) return t("southRegion")

    // Check for NORTH REGION
    const hasAllNorth = NORTH_BRANCHES.every(b => userBranches.includes(b))
    const onlyNorth = userBranches.every(b => NORTH_BRANCHES.includes(b))
    if (hasAllNorth && onlyNorth) return t("northRegion")

    return userBranches.join(", ")
  }

  function onDelete(user: AppUser) {
    if (!confirm(t("confirmDeleteUser").replace("{name}", user.full_name))) return
    startTransition(async () => {
      const res = await deleteUserAction(user.id)
      if (!res.ok) toast.error(res.error)
      else toast.success(t("userDeleted"))
    })
  }

  function onSendResetEmail(user: AppUser) {
    startTransition(async () => {
      const res = await sendUserPasswordResetEmailAction({ email: user.email })
      if (!res.ok) toast.error(res.error)
      else toast.success(t("resetLinkSent").replace("{email}", user.email))
    })
  }

  function onSetTempPassword(user: AppUser) {
    startTransition(async () => {
      const res = await resetUserPasswordToTemporaryAction(user.id)
      if (!res.ok) toast.error(res.error)
      else {
        setTempPasswordData({ password: res.data, user })
        toast.success(t("tempPasswordGenerated").replace("{name}", user.full_name))
      }
    })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success(t("copiedToClipboard"))
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-muted/30 p-4 rounded-full mb-4">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-brand-navy">{t("noStaffFound")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start by adding a new user to the system.
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px] font-semibold text-brand-navy">{t("staffMember")}</TableHead>
            <TableHead className="font-semibold text-brand-navy">{t("roleAndAccess")}</TableHead>
            <TableHead className="font-semibold text-brand-navy">{t("assignments")}</TableHead>
            <TableHead className="font-semibold text-brand-navy">{t("accountStatus")}</TableHead>
            <TableHead className="w-[100px] text-right font-semibold text-brand-navy pr-6">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className="group hover:bg-brand-navy/[0.02] transition-colors">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-brand-navy/10">
                    <AvatarFallback className="bg-brand-navy text-white text-xs font-bold">
                      {getInitials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-brand-navy leading-none mb-1">{u.full_name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {u.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5 items-start">
                    <Badge
                      variant="secondary"
                      className={
                        u.role === "ADMIN"
                          ? "bg-blue-600 text-white hover:bg-blue-700 px-2 py-0 border-none"
                          : u.role === "RSM"
                            ? "bg-brand-navy text-white hover:bg-brand-navy/90 px-2 py-0 border-none"
                          : u.role === "ASM"
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-0 border-none font-semibold"
                            : "bg-muted text-muted-foreground px-2 py-0 border-none"
                      }
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {u.role === "ADMIN" ? t("admin") : u.role === "MANAGER" ? t("manager") : t("agent")}
                    </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-sm text-brand-navy font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {(() => {
                      const formatted = formatAssignments(u)
                      const isGrouped = ["ITALY", "NORTH REGION", "SOUTH REGION"].includes(formatted)
                      
                      if (isGrouped) {
                        return (
                          <span className="bg-brand-navy text-white px-2 py-0.5 rounded text-[10px] uppercase font-black border border-brand-navy/10 shadow-sm">
                            {formatted}
                          </span>
                        )
                      }
                      
                      const branches = u.branches || (u.branch ? [u.branch] : [])
                      if (branches.length === 0) return <span className="text-muted-foreground italic">Unassigned</span>
                      
                      return (
                        <div className="flex flex-wrap gap-1">
                          {branches.map(b => (
                            <span key={b} className="bg-brand-navy/5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-brand-navy/10">
                              {b}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  {u.zone && (
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-5">
                      Zone: {u.zone}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {u.is_active ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Active
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-sm">
                    <XCircle className="h-4 w-4" />
                    Disabled
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right pr-6">
                <div className="flex items-center justify-end gap-2">
                  <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-brand-navy hover:bg-brand-navy/5"
                      title="Email Reset Link"
                      onClick={() => onSendResetEmail(u)}
                      disabled={pending}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-brand-navy hover:bg-brand-navy/5"
                      title="Set Temp Password"
                      onClick={() => onSetTempPassword(u)}
                      disabled={pending}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-brand-navy/10 focus-visible:ring-brand-navy shrink-0"
                        disabled={pending}
                      >
                        {pending ? <Spinner className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4 text-brand-navy" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditing(u)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendResetEmail(u)} disabled={pending} className="cursor-pointer">
                        <Mail className="mr-2 h-4 w-4" />
                        {t("sendResetEmail")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSetTempPassword(u)} disabled={pending} className="cursor-pointer">
                        <Key className="mr-2 h-4 w-4" />
                        {t("setTempPassword")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(u)}
                        disabled={pending}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPasswordData} onOpenChange={(open) => !open && setTempPasswordData(null)}>
        <DialogContent className="sm:max-w-md border-2 border-brand-navy/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-navy flex items-center gap-2">
              <Key className="h-5 w-5" />
              Temporary Password Set
            </DialogTitle>
            <DialogDescription>
              A temporary password has been generated for <strong>{tempPasswordData?.user.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2 rounded-lg bg-brand-navy/[0.03] p-4 border-2 border-dashed border-brand-navy/20">
              <p className="text-[10px] font-black text-brand-navy uppercase tracking-widest opacity-50">Generated Password</p>
              <div className="flex items-center justify-between gap-3">
                <code className="flex-1 rounded-md bg-white px-3 py-2 text-2xl font-mono font-black text-brand-navy tracking-[0.2em] border shadow-sm">
                  {tempPasswordData?.password}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => tempPasswordData && copyToClipboard(tempPasswordData.password)}
                  className="h-12 w-12 shrink-0 border-brand-navy/20 hover:border-brand-navy hover:bg-brand-navy/5"
                >
                  {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-brand-navy" />}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
              <Shield className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Provide this password to the user manually. They must use it to log in and are required to change it immediately after.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="bg-brand-navy hover:bg-brand-navy/90 w-full"
              onClick={() => setTempPasswordData(null)}
            >
              Done, I've shared it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditUserDialog
        user={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </>
  )
}
