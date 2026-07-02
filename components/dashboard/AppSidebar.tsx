"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bot,
  BookOpen,
  CalendarDays,
  FileText,
  HelpCircle,
  TrendingUp,
  LogOut,
  Sparkles,
  ChevronUp,
  History,
  Trash2,
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
  { href: "/courses", label: "Courses", icon: BookOpen, strokeWidth: 1.25 },
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
  const router = useRouter();
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
              const isChatmateWithParam = item.href === "/chatmate" && (!!searchParams.get("summaryId") || !!searchParams.get("quiz"));
              const isActive = !isChatmateWithParam && (pathname === item.href || pathname.startsWith(item.href));

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
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-sm text-foreground font-bold tracking-tight">Recents</SidebarGroupLabel>
            <SidebarMenu>
              {historyItems.map((item) => {
                const Icon = typeIcon(item.type);
                const itemUrl = new URL(item.href, "http://x");
                const paramKey = item.type === "study_plan" ? "planId" : item.type === "summary" ? "summaryId" : null;
                const isActive = item.type === "quiz"
                  ? searchParams.get("quiz") === item.id
                  : pathname === item.href
                    || (pathname === itemUrl.pathname
                      && (paramKey
                        ? itemUrl.searchParams.get(paramKey) === searchParams.get(paramKey)
                        : true));
                const isViewing = item.type === "quiz"
                  ? searchParams.get("quiz") === item.id
                  : item.type === "study_plan"
                    ? pathname === "/study-plan" && searchParams.get("planId") === item.id
                    : pathname === "/chatmate" && searchParams.get("summaryId") === item.id;

                const handleDelete = async () => {
                  const endpoint = item.type === "study_plan"
                    ? `/api/study-plans/${item.id}`
                    : item.type === "summary"
                      ? `/api/summary/${item.id}`
                      : `/api/quiz/${item.id}`;
                  try {
                    const res = await fetch(endpoint, { method: "DELETE" });
                    if (res.ok) {
                      window.dispatchEvent(new CustomEvent("history-updated"));
                      if (isViewing) {
                        const others = historyItems.filter((h) => h.id !== item.id);
                        if (others.length > 0) {
                          router.push(others[0].href);
                        } else {
                          router.push("/chatmate");
                        }
                      }
                    }
                  } catch { }
                };

                return (
                  <SidebarMenuItem key={`${item.type}-${item.id}`} className="group/item relative">
                    <SidebarMenuButton isActive={isActive} tooltip={item.title} render={<Link href={item.href} />} className="pr-8">
                      <Icon strokeWidth={isActive ? 2 : 1.25} className="size-4 shrink-0" />
                      <span className="truncate text-sm min-w-0">{item.title}</span>
                    </SidebarMenuButton>
                    <button
                      onClick={handleDelete}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/item:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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
