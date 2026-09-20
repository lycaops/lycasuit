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
  Check,
  ChevronUp,
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
  useSidebar,
} from "@/components/ui/sidebar"
import { useI18n } from "@/lib/i18n/i18n-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                <img src="/lmac.png" alt="LycaOps" className="h-9 w-9 object-contain" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-bold text-white">RCM - LycaOps</span>
                <span className="truncate text-xs text-[#ffc8b2]">{t("contractManager")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <div className="border-b border-white/10 px-4 py-4 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#245bc1] text-sm font-bold text-white">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
            <p className="truncate text-xs text-white/50">
              {user.role}{user.branch ? ` · ${user.branch}` : ""}
            </p>
          </div>
        </div>
      </div>

      <SidebarContent className="bg-[#21264e]">
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

      <SidebarFooter className="border-white/10 bg-[#21264e]">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit" tooltip={t("signOut")}>
                <LogOut aria-hidden="true" />
                <span>{t("signOut")}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={language === "en" ? "Change Language" : "Cambia Lingua"}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[collapsible=icon]:mx-auto">
                    <Languages className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {language === "en" ? "Language" : "Lingua"}
                    </span>
                    <span className="truncate text-sm font-semibold text-sidebar-foreground">
                      {language === "en" ? "English" : "Italiano"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  {isCollapsed && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#245bc1] text-[8px] font-bold text-white shadow-sm">
                      {language.toUpperCase()}
                    </div>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? "right" : "top"}
                align={isCollapsed ? "start" : "end"}
                className="w-[200px]"
              >
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  onClick={() => setLanguage("en")}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🇬🇧</span> English
                  </span>
                  {language === "en" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  onClick={() => setLanguage("it")}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🇮🇹</span> Italiano
                  </span>
                  {language === "it" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
