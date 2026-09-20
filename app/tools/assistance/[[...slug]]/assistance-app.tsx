"use client"

import dynamic from "next/dynamic"
import Loader from "@/components/Loader"

const App = dynamic(() => import("@assistance/App"), {
  ssr: false,
  loading: () => (
    <div className="lo-screen" style={{ position: "fixed", inset: 0, zIndex: 1000, width: "100vw", minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fff" }}>
      <Loader size={128} />
    </div>
  ),
})

export function AssistanceApp() {
  return <App />
}
