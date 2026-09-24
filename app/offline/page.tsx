export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#152253] px-6 text-center text-white">
      <div className="max-w-md">
        <img src="/lops.svg" alt="LycaOps" className="mx-auto mb-8 h-12 w-auto" />
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mt-3 text-white/70">There is no internet connection. Reconnect to continue using LycaOps.</p>
      </div>
    </main>
  )
}