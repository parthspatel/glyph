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
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const filteredItems = filterNavItems(navItems, user?.global_role);

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  return (
    <Sidebar collapsible="icon">
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
      </SidebarContent>
      <SidebarFooter className="border-t">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
