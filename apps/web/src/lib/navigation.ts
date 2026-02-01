import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  ClipboardList,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[]; // If undefined, visible to all authenticated users
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: UserCog, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function filterNavItems(items: NavItem[], userRole?: string): NavItem[] {
  return items.filter((item) => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });
}

// Route label mapping for breadcrumbs
export const routeLabels: Record<string, string> = {
  "": "Home",
  projects: "Projects",
  new: "New",
  edit: "Edit",
  teams: "Teams",
  admin: "Admin",
  users: "Users",
  tasks: "Tasks",
  annotate: "Annotate",
  settings: "Settings",
};
