import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { routeLabels } from "@/lib/navigation";

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

// Attempt to get entity name from React Query cache
function getEntityName(queryClient: ReturnType<typeof useQueryClient>, type: string, id: string): string | null {
  // Try common query key patterns
  const patterns = [
    [type, id],           // ['project', 'proj_123']
    [type + 's', id],     // ['projects', 'proj_123']
    [type, { id }],       // ['project', { id: 'proj_123' }]
  ];

  for (const key of patterns) {
    const data = queryClient.getQueryData<{ name?: string; display_name?: string; title?: string }>(key);
    if (data) {
      return data.name || data.display_name || data.title || null;
    }
  }
  return null;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();

  return useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/", isCurrent: segments.length === 0 },
    ];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += "/" + segment;
      const isCurrent = index === segments.length - 1;

      // Check if this is a dynamic param (ID)
      const paramKey = Object.entries(params).find(([_, value]) => value === segment)?.[0];

      let label: string;
      if (paramKey) {
        // Try to get name from cache, otherwise use ID prefix
        const type = paramKey.replace("Id", ""); // projectId -> project
        const cachedName = getEntityName(queryClient, type, segment);
        label = cachedName || segment.split("_")[0].toUpperCase() + "...";
      } else {
        // Use static label or capitalize segment
        label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      items.push({ label, href: currentPath, isCurrent });
    });

    return items;
  }, [location.pathname, params, queryClient]);
}
