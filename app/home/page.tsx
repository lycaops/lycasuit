import Link from "next/link"
import { BarChart3, FileSignature, Receipt, LifeBuoy, LayoutGrid, ArrowRight } from "lucide-react"
import { getMyTools, requirePlatformUser } from "@/lib/auth"
import { HomeSidebar } from "@/components/home/home-sidebar"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  FileSignature,
  Receipt,
  LifeBuoy,
}

export default async function HomePage() {
  const user = await requirePlatformUser()
  const tools = await getMyTools()

  const firstName = user.full_name?.split(" ")[0] ?? "there"

  return (
    <main className="min-h-dvh bg-[#f4f7fb] lg:flex">
      <HomeSidebar user={user} tools={tools} />

      <div className="min-w-0 flex-1">
        <div className="border-b border-[#21264e]/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-[#245BC1]">Lyca Suite workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#21264E]">Welcome back, {firstName}</h1>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="mb-8">
            <p className="max-w-2xl text-sm leading-relaxed text-[#21264E]/70">Choose a tool to open. Your single sign-on covers every tool you have been granted.</p>
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

        </div>
      </div>
    </main>
  )
}
