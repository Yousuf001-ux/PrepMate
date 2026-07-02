import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SessionProvider } from "@/components/auth/SessionProvider";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-sidebar/50 backdrop-blur-sm">
            <SidebarTrigger className="size-9 bg-sidebar border border-border/20 rounded-lg" />
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto p-6 max-sm:px-4 max-sm:pt-16 bg-sidebar/50">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
