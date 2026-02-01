import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderKanban, Users, ClipboardList, User } from "lucide-react";
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

// Mobile-specific nav items (subset of main nav for limited space)
const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
];

export function MobileNav() {
  const location = useLocation();
  const { data: user } = useCurrentUser();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {mobileNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs",
                active
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {/* Profile quick access */}
        <Link
          to={user ? `/users/${user.user_id}` : "/"}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs",
            location.pathname.startsWith("/users/")
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
