"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileSignature,
  LayoutDashboard,
  FileText,
  PlusSquare,
  Users,
  UserCircle,
  Languages,
  Check,
  ChevronUp,
  Home,
} from "lucide-react"
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
<<<<<<< HEAD
  SidebarTrigger,
=======
>>>>>>> f317c96915d48c67afd478597b5842f471e6372c
  useSidebar,
} from "@/components/ui/sidebar"
import { useI18n } from "@/lib/i18n/i18n-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AppUser } from "@/lib/types"

export function AppSidebar({ user }: { user: AppUser }) {
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
      href: "/tools/contracts/users",
      label: t("users"),
      icon: Users,
      show: user.role === "ADMIN",
    },
    {
      href: "/tools/contracts/profile",
      label: t("profileSettings"),
      icon: UserCircle,
      show: true,
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#245bc1] text-white">
                <FileSignature className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {t("contractManager")}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {t("universalService")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
<<<<<<< HEAD
          <SidebarMenuItem>
            <SidebarTrigger className="w-full justify-start text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center" />
          </SidebarMenuItem>
=======
>>>>>>> f317c96915d48c67afd478597b5842f471e6372c
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{t("workspace")}</SidebarGroupLabel>
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

      <SidebarFooter>
        <SidebarMenu>
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
