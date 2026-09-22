"use client"

import dynamic from "next/dynamic"
import "@fieldiq/index.css"
import Loader from "@/components/Loader"

// Field IQ is a client-only dashboard (charts, d3 maps, XLSX export), so it is
// loaded without SSR. Its internal code is unchanged from the original app.
const App = dynamic(() => import("@fieldiq/App"), {
  ssr: false,
  loading: () => (
    <div className="lo-screen">
      <Loader size={128} />
    </div>
  ),
})

export function FieldIqApp() {
  return <App />
}
