"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bot,
  LayoutGrid,
  BookOpen,
  CalendarDays,
  FileText,
  HelpCircle,
  TrendingUp,
  LogOut,
  Sparkles,
  ChevronUp,
  History,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/chatmate", label: "Chatmate", icon: Bot, strokeWidth: 1.25 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, strokeWidth: 1.25 },
  { href: "/courses", label: "Courses", icon: BookOpen, strokeWidth: 1.25 },
  { href: "/quiz", label: "Quiz", icon: HelpCircle, strokeWidth: 1.25 },
  { href: "/progress", label: "Progress", icon: TrendingUp, strokeWidth: 1.25 },
];

interface HistoryItem {
  id: string;
  type: "study_plan" | "summary" | "quiz";
  title: string;
  href: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "PM";

  const fetchHistory = () => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((json) => setHistoryItems(json.data ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchHistory();
    window.addEventListener("history-updated", fetchHistory);
    return () => window.removeEventListener("history-updated", fetchHistory);
  }, []);

  const typeIcon = (type: string) => {
    switch (type) {
      case "study_plan": return CalendarDays;
      case "summary": return FileText;
      case "quiz": return HelpCircle;
      default: return History;
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between px-1">
          <Link href="/dashboard" className="text-title-medium font-semibold text-primary group-data-[collapsible=icon]:hidden">
            PrepMate
          </Link>
          <SidebarTrigger className="size-7" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isChatmateWithParam = item.href === "/chatmate" && (searchParams.get("summaryId") || searchParams.get("flow"));
              const isActive = !isChatmateWithParam && (pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href)));

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={isActive} tooltip={item.label} render={<Link href={item.href} />}>
                    <Icon strokeWidth={isActive ? 2 : item.strokeWidth} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {historyItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-xs text-foreground font-bold">Recents</SidebarGroupLabel>
            <SidebarMenu>
              {historyItems.map((item) => {
                const Icon = typeIcon(item.type);
                const itemUrl = new URL(item.href, "http://x");
                const paramKey = item.type === "study_plan" ? "planId" : item.type === "summary" ? "summaryId" : null;
                const isActive = pathname === item.href
                  || (pathname === itemUrl.pathname
                    && (paramKey
                      ? itemUrl.searchParams.get(paramKey) === searchParams.get(paramKey)
                      : true));
                return (
                  <SidebarMenuItem key={`${item.type}-${item.id}`}>
                    <SidebarMenuButton isActive={isActive} tooltip={item.title} render={<Link href={item.href} />}>
                      <Icon strokeWidth={isActive ? 2 : 1.25} className="size-4" />
                      <span className="truncate text-label-small">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-label-small">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-label-medium leading-tight">
                      <span className="truncate font-semibold">
                        {session?.user?.name ?? "User"}
                      </span>
                      <span className="truncate text-label-small text-muted-foreground">
                        {session?.user?.email ?? ""}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="top"
                className="w-(--radix-popper-anchor-width)"
              >
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
