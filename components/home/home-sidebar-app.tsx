"use client"

import dynamic from "next/dynamic"
import Loader from "@/components/Loader"

const HomeSidebar = dynamic(() => import("@/components/home/home-sidebar"), {
  ssr: false,
  loading: () => (
    <aside className="hidden w-72 shrink-0 lg:flex lg:h-dvh lg:max-h-dvh lg:sticky lg:top-0 items-center justify-center bg-[#21264e]">
      <Loader size={48} />
    </aside>
  ),
})

export function HomeSidebarApp(props: React.ComponentProps<typeof HomeSidebar>) {
  return <HomeSidebar {...props} />
}

export default HomeSidebarApp
