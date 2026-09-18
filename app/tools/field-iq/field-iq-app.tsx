"use client"

import dynamic from "next/dynamic"
import "@fieldiq/index.css"

// Field IQ is a client-only dashboard (charts, d3 maps, XLSX export), so it is
// loaded without SSR. Its internal code is unchanged from the original app.
const App = dynamic(() => import("@fieldiq/App"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#21264E]">
      Loading Field IQ…
    </div>
  ),
})

export function FieldIqApp() {
  return <App />
}
