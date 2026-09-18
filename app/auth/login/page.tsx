import { LoginForm } from "@/components/auth/login-form"
import { FileSignature, Home } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="w-full">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-brand-navy">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#21264e] text-[#fff7f2]">
          <FileSignature className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage retailer contracts.
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
