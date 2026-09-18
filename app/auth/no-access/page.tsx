import { ShieldAlert } from "lucide-react"
import { signOut } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function NoAccessPage() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffc8b2] text-[#21264e]">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">No profile configured</h1>
        <p className="text-sm text-muted-foreground">
          Your account exists but no user profile has been assigned. Please ask
          an administrator to add you to the system.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
