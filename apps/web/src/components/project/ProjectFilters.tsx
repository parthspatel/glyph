/**
 * Project filtering controls.
 * Includes view toggle, search, status filter, and type filter.
 */

import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback, useEffect, useState } from 'react';
import type { ProjectFilter, ProjectStatus } from '../../api/projects';

type ViewType = 'my' | 'team' | 'all';

interface ProjectFiltersProps {
  filter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
}

const STATUS_OPTIONS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export function ProjectFilters({ filter, onFilterChange }: ProjectFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(filter.search ?? '');

  // Sync URL params to filter
  const urlFilter = useMemo((): ProjectFilter => ({
    status: (searchParams.get('status') as ProjectStatus) || undefined,
    search: searchParams.get('search') || undefined,
    project_type_id: searchParams.get('type') || undefined,
  }), [searchParams]);

  // Update parent when URL changes
  useEffect(() => {
    onFilterChange(urlFilter);
  }, [urlFilter, onFilterChange]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filter.search ?? '')) {
        updateParams({ search: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    });
  }, [setSearchParams]);

  const currentView = (searchParams.get('view') as ViewType) ?? 'all';

  const handleViewChange = (view: ViewType) => {
    updateParams({ view: view === 'all' ? null : view });
  };

  const handleStatusChange = (status: string) => {
    updateParams({ status: status === 'all' ? null : status });
  };

  return (
    <div className="project-filters">
      {/* View toggle */}
      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${currentView === 'my' ? 'active' : ''}`}
          onClick={() => handleViewChange('my')}
        >
          My Projects
        </button>
        <button
          className={`view-toggle-btn ${currentView === 'team' ? 'active' : ''}`}
          onClick={() => handleViewChange('team')}
        >
          Team
        </button>
        <button
          className={`view-toggle-btn ${currentView === 'all' ? 'active' : ''}`}
          onClick={() => handleViewChange('all')}
        >
          All
        </button>
      </div>

      {/* Search */}
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input"
        />
        {searchInput && (
          <button
            className="search-clear"
            onClick={() => {
              setSearchInput('');
              updateParams({ search: null });
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Status filter */}
      <select
        value={filter.status ?? 'all'}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="filter-select"
      >
        {STATUS_OPTIONS.map(opt => (
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

  const filter = useMemo((): ProjectFilter => ({
    status: (searchParams.get('status') as ProjectStatus) || undefined,
    search: searchParams.get('search') || undefined,
    project_type_id: searchParams.get('type') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
  }), [searchParams]);

  const setFilter = useCallback((updates: Partial<ProjectFilter>) => {
    setSearchParams(prev => {
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
  }, [setSearchParams]);

  return { filter, setFilter };
}
