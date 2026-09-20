"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  PlusSquare,
  Users,
  UserCircle,
  Languages,
  Home,
  LogOut,
} from "lucide-react"
import { signOut } from "@/app/auth/actions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useI18n } from "@/lib/i18n/i18n-context"
const PLATFORM_ADMIN_ROLES = ["SUPER-ADMIN", "HS-ADMIN", "PM-ADMIN", "CS-ADMIN", "COUNTRY-MANAGER", "UK-ADMIN"]

interface SidebarUser {
  full_name: string
  email: string
  role: string
  branch: string | null
  zone: string | null
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const { t, language, setLanguage } = useI18n()

  const nav = [
    { href: "/home", label: "Back to Home", icon: Home, show: true },
    { href: "/tools/contracts", label: t("overview"), icon: LayoutDashboard, show: true },
    { href: "/tools/contracts/contracts", label: t("contracts"), icon: FileText, show: true },
    {
      href: "/tools/contracts/contracts/new",
      label: t("newContract"),
      icon: PlusSquare,
      show: true,
    },
    {
      href: "/admin/users",
      label: "User Management",
      icon: Users,
      show: PLATFORM_ADMIN_ROLES.includes(user.role),
    },
    {
      href: "/tools/contracts/profile",
      label: t("profileSettings"),
      icon: UserCircle,
      show: true,
    },
  ]

  return (
    <Sidebar collapsible="icon" className="bg-[#21264e] text-white">
      <SidebarHeader className="border-white/10 bg-[#21264e]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none text-white hover:bg-transparent group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <img src="/rcm.png" alt="Retailer Contract Management" className="h-9 w-9 object-contain" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-bold text-white">RCM - LycaOps</span>
                <span className="truncate text-xs text-[#ffc8b2]">{t("contractManager")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="min-h-0 bg-[#21264e]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 group-data-[collapsible=icon]:hidden">{t("workspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav
                .filter((n) => n.show)
                .map((n) => {
                  const active =
                    n.href === "/tools/contracts"
                      ? pathname === "/tools/contracts"
                      : pathname.startsWith(n.href)
                  return (
                    <SidebarMenuItem key={n.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={n.label}>
                        <Link href={n.href}>
                          <n.icon aria-hidden="true" />
                          <span>{n.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="shrink-0 border-white/10 bg-[#21264e]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffc8b2] text-[11px] font-semibold text-[#21264e]">
                {user.full_name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.full_name}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {user.role === "ADMIN" ? t("admin") : user.role === "MANAGER" ? t("manager") : t("agent")}
                  {user.branch ? ` · ${user.branch}` : ""}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-3 py-3 text-white/70 group-data-[collapsible=icon]:hidden" aria-label="Language">
              <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="flex items-center rounded-lg border border-white/20 p-0.5">
                <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${language === "en" ? "bg-white text-[#21264e]" : ""}`}>EN</button>
                <button type="button" onClick={() => setLanguage("it")} aria-pressed={language === "it"} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${language === "it" ? "bg-white text-[#21264e]" : ""}`}>IT</button>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit" tooltip={t("signOut")}>
                <LogOut aria-hidden="true" />
                <span>{t("signOut")}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
