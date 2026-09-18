import { requireUser } from "@/lib/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PasswordChangeForm } from "@/components/dashboard/password-change-form"
import { User, Shield, Mail } from "lucide-react"

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and security.</p>
      </div>

      <Card>
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-brand-navy" />
            <CardTitle>Account Information</CardTitle>
          </div>
          <CardDescription>Your personal and role details within the system.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</dt>
              <dd className="font-semibold text-brand-navy">{user.full_name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email Address
              </dt>
              <dd className="font-semibold text-brand-navy">{user.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Role
              </dt>
              <dd className="font-semibold">
                <span className="rounded-full bg-[#ffc8b2] px-2 py-0.5 text-[#21264e]">
                  {user.role}
                </span>
              </dd>
            </div>
            {user.branch && (
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Branch</dt>
                <dd className="font-semibold text-brand-navy">{user.branch}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-navy" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  )
}
