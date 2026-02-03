/**
 * Filter controls for the task queue
 * Uses basic HTML select elements since shadcn Select is not installed
 */
import { QueueFilters as FilterType, QueueSort } from "@/api/queue";

interface Project {
  id: string;
  name: string;
}

interface QueueFiltersProps {
  filters: FilterType;
  sort: QueueSort;
  onFiltersChange: (filters: FilterType) => void;
  onSortChange: (sort: QueueSort) => void;
  projects?: Project[];
}

export function QueueFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  projects = [],
}: QueueFiltersProps) {
  return (
    <div className="flex gap-4 flex-wrap items-center">
      {/* Project Filter */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Project</span>
        <select
          value={filters.project_id ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              project_id: e.target.value || undefined,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {/* Step Type Filter */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Type</span>
        <select
          value={filters.step_type ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              step_type: e.target.value || undefined,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Types</option>
          <option value="annotation">Annotation</option>
          <option value="review">Review</option>
          <option value="adjudication">Adjudication</option>
        </select>
      </label>

      {/* Status Filter */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Status</span>
        <select
          value={filters.status ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              status: e.target.value || undefined,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
        </select>
      </label>

      {/* Sort By */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Sort by</span>
        <select
          value={sort.by ?? "priority"}
          onChange={(e) =>
            onSortChange({
              ...sort,
              by: e.target.value as "priority" | "age" | "project",
            })
          }
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="priority">Priority</option>
          <option value="age">Age</option>
          <option value="project">Project</option>
        </select>
      </label>

      {/* Sort Order */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Order</span>
        <select
          value={sort.order ?? "desc"}
          onChange={(e) =>
            onSortChange({ ...sort, order: e.target.value as "asc" | "desc" })
          }
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>
  );
}
