/**
 * Project filtering controls.
 * Includes view toggle, search, status filter, and type filter.
 */

import { useSearchParams } from "react-router-dom";
import { useMemo, useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectFilter, ProjectStatus } from "../../api/projects";

type ViewType = "my" | "team" | "all";

interface ProjectFiltersProps {
  filter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
}

const STATUS_OPTIONS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const VIEW_OPTIONS: { value: ViewType; label: string }[] = [
  { value: "my", label: "My Projects" },
  { value: "team", label: "Team" },
  { value: "all", label: "All" },
];

export function ProjectFilters({
  filter,
  onFilterChange,
}: ProjectFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(filter.search ?? "");

  // Sync URL params to filter
  const urlFilter = useMemo(
    (): ProjectFilter => ({
      status: (searchParams.get("status") as ProjectStatus) || undefined,
      search: searchParams.get("search") || undefined,
      project_type_id: searchParams.get("type") || undefined,
    }),
    [searchParams],
  );

  // Update parent when URL changes
  useEffect(() => {
    onFilterChange(urlFilter);
  }, [urlFilter, onFilterChange]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filter.search ?? "")) {
        updateParams({ search: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === "") {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        });
        return newParams;
      });
    },
    [setSearchParams],
  );

  const currentView = (searchParams.get("view") as ViewType) ?? "all";

  const handleViewChange = (view: ViewType) => {
    updateParams({ view: view === "all" ? null : view });
  };

  const handleStatusChange = (status: string) => {
    updateParams({ status: status === "all" ? null : status });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* View toggle */}
      <div className="flex items-center rounded-lg border border-input bg-muted/30 p-0.5">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => handleViewChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        {searchInput && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchInput("");
              updateParams({ search: null });
            }}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <select
        value={filter.status ?? "all"}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Hook to manage project filters from URL.
 * Use this when you need filter state outside of ProjectFilters component.
 */
export function useProjectFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = useMemo(
    (): ProjectFilter => ({
      status: (searchParams.get("status") as ProjectStatus) || undefined,
      search: searchParams.get("search") || undefined,
      project_type_id: searchParams.get("type") || undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
    }),
    [searchParams],
  );

  const setFilter = useCallback(
    (updates: Partial<ProjectFilter>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            newParams.delete(key);
          } else {
            newParams.set(key, String(value));
          }
        });
        return newParams;
      });
    },
    [setSearchParams],
  );

  return { filter, setFilter };
}
