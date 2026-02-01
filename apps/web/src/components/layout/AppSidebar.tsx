import { Link, useLocation } from "react-router-dom";
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
} from "@/components/ui/sidebar";
import { navItems, filterNavItems } from "@/lib/navigation";
import { useCurrentUser } from "@/hooks/useUser";

export function AppSidebar() {
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const filteredItems = filterNavItems(navItems, user?.global_role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">✦</span>
          <span className="group-data-[collapsible=icon]:hidden">Glyph</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== "/" && location.pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        {/* UserMenu will be added in Plan 03 */}
        <div className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
          {user?.display_name || "Loading..."}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
