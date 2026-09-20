import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-stretch bg-[#f4f7fb]">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[#21264e] p-12 lg:flex xl:w-1/2 xl:p-16">
        <img src="/h2.svg" alt="" aria-hidden="true" className="absolute -right-36 -top-8 h-96 w-96 opacity-20" />
        <img src="/h1.svg" alt="" aria-hidden="true" className="absolute -bottom-40 -left-28 h-[28rem] w-[28rem] opacity-[.15]" />
        <div className="relative">
          <img src="/logo.png" alt="LycaOps" className="h-10 w-auto" />
          <div className="mt-24 max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#61c7d0]">LycaOps</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-white xl:text-5xl">Your work, clearly in view.</h2>
            <p className="mt-6 text-base leading-7 text-white/65">One secure place for contracts, incentives, assistance, and field intelligence.</p>
          </div>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-white/50">
          <span className="h-px w-8 bg-[#61c7d0]" />
          Secure access for your team
        </div>
      </div>
      <div className="flex w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-[55%] xl:w-1/2">
        <div className="w-full max-w-md">
          <div className="relative mb-8 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-[#21264e] px-5 lg:hidden">
            <img src="/h1.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 opacity-20" />
            <img src="/h2.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 opacity-15" />
            <img src="/lops.svg" alt="LycaOps" className="relative h-auto w-full max-w-[230px] object-contain" />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
