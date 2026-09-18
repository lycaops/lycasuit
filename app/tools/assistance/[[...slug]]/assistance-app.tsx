"use client"

import dynamic from "next/dynamic"

const App = dynamic(() => import("@assistance/App"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  ),
})

export function AssistanceApp() {
  return <App />
}
