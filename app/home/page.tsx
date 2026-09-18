import Link from "next/link"
import { BarChart3, FileSignature, Receipt, LifeBuoy, LayoutGrid, Users, ArrowRight } from "lucide-react"
import { getMyTools, isPlatformAdmin, requirePlatformUser } from "@/lib/auth"
import { HomeHeader } from "@/components/home/home-header"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  FileSignature,
  Receipt,
  LifeBuoy,
}

export default async function HomePage() {
  const user = await requirePlatformUser()
  const tools = await getMyTools()
  const admin = isPlatformAdmin(user)

  const firstName = user.full_name?.split(" ")[0] ?? "there"

  return (
    <main className="min-h-dvh bg-[#FFF7F2]">
      <HomeHeader user={{ full_name: user.full_name, email: user.email, role: user.role }} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium text-[#245BC1]">Universal Service 2006 · Lycamobile Italy</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#21264E]">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-[#21264E]/70">
            Choose a tool to open. Your single sign-on covers every tool you have been granted.
          </p>
        </header>

        {tools.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#21264E]/20 bg-white p-10 text-center">
            <LayoutGrid className="mx-auto h-8 w-8 text-[#21264E]/40" />
            <h2 className="mt-3 text-lg font-medium text-[#21264E]">No tools assigned yet</h2>
            <p className="mt-1 text-sm text-[#21264E]/60">
              An administrator needs to grant you access. Contact your HS admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {tools.map((tool) => {
              const Icon = ICONS[tool.icon ?? ""] ?? LayoutGrid
              const accent = tool.accent_color ?? "#245BC1"
              return (
                <Link
                  key={tool.key}
                  href={tool.route}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#21264E]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245BC1]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: accent }}
                  />
                  <div>
                    <span
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accent}1A`, color: accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold text-[#21264E]">{tool.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#21264E]/70">{tool.description}</p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: accent }}>
                    Open
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {admin && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#21264E]/60">
              Administration
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-3 rounded-lg border border-[#21264E]/10 bg-white px-5 py-4 text-sm font-medium text-[#21264E] shadow-sm transition hover:shadow-md"
            >
              <Users className="h-4 w-4 text-[#46286E]" />
              Users &amp; tool access
              <ArrowRight className="h-4 w-4 text-[#21264E]/40" />
            </Link>
          </section>
        )}
      </div>
    </main>
  )
}
