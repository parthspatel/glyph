import { Outlet } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileNav } from "./MobileNav";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const SIDEBAR_STATE_KEY = "glyph-sidebar-state";

function LayoutContent() {
  const { isMobile } = useSidebar();

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumbs />
          <div className="flex-1" />
        </header>
        <main className={cn("flex-1 overflow-auto p-4", isMobile && "pb-20")}>
          <Outlet />
        </main>
      </SidebarInset>
      {isMobile && <MobileNav />}
    </>
  );
}

export function AppLayout() {
  const defaultOpen = localStorage.getItem(SIDEBAR_STATE_KEY) !== "false";

  const handleOpenChange = (open: boolean) => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(open));
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <LayoutContent />
    </SidebarProvider>
  );
}
