"use client"

import dynamic from "next/dynamic"
import Loader from "@/components/Loader"

const App = dynamic(() => import("@incentive/App"), {
  ssr: false,
  loading: () => (
    <div className="lo-screen">
      <Loader size={128} />
    </div>
  ),
})

export function IncentiveApp() {
  return <App />
}
