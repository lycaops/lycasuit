import { LoginForm } from "@/components/auth/login-form"
import { LogIn } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e3f3f5] text-[#006ae0]">
          <LogIn className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#182039]">Welcome back</h1>
        <p className="mt-2 text-[#68738b]">Log in to your Lyca Suite account</p>
      </div>
      <LoginForm />
    </div>
  )
}
