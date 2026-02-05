import { Link, useLocation, useParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navItems, filterNavItems } from "@/lib/navigation";
import { useCurrentUser } from "@/hooks/useUser";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";
import { useRef, useCallback } from "react";
import { FileText, Settings, ClipboardList, GitBranch } from "lucide-react";

// Project-scoped navigation items
const projectNavItems = [
  { path: "", label: "Overview", icon: FileText },
  { path: "/workflow", label: "Workflow", icon: GitBranch },
  { path: "/edit", label: "Settings", icon: Settings },
  { path: "/tasks", label: "Tasks", icon: ClipboardList },
];

export function AppSidebar() {
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();
  const { data: user } = useCurrentUser();
  const filteredItems = filterNavItems(navItems, user?.global_role);
  const { state, setOpen } = useSidebar();

  // Track if sidebar was manually collapsed (vs auto-collapsed)
  const wasCollapsedRef = useRef(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect project context - show project nav when viewing a specific project
  const isProjectContext =
    location.pathname.startsWith("/projects/") &&
    params.projectId &&
    params.projectId !== "new";

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  const handleMouseEnter = useCallback(() => {
    // Clear any pending collapse
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Only expand on hover if currently collapsed
    if (state === "collapsed") {
      wasCollapsedRef.current = true;
      setOpen(true);
    }
  }, [state, setOpen]);

  const handleMouseLeave = useCallback(() => {
    // Only auto-collapse if we expanded via hover
    if (wasCollapsedRef.current) {
      // Small delay to prevent flickering when moving between elements
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(false);
        wasCollapsedRef.current = false;
      }, 300);
    }
  }, [setOpen]);

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="border-b px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl text-primary">✦</span>
          <span className="group-data-[collapsible=icon]:hidden">Glyph</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        active &&
                          "border-l-2 border-primary bg-accent font-semibold",
                      )}
                    >
                      <Link to={item.href}>
                        <item.icon className={cn(active && "text-primary")} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isProjectContext && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
              Project
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNavItems.map((item) => {
                  const fullPath = `/projects/${params.projectId}${item.path}`;
                  const isItemActive = location.pathname === fullPath;
                  return (
                    <SidebarMenuItem key={item.path || "overview"}>
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive}
                        tooltip={item.label}
                        className={cn(
                          isItemActive &&
                            "border-l-2 border-primary bg-accent font-semibold",
                        )}
                      >
                        <Link to={fullPath}>
                          <item.icon
                            className={cn(isItemActive && "text-primary")}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
