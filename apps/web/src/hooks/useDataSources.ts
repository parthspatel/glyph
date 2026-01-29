/**
 * React hooks for data source management.
 * Uses TanStack Query for caching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// Types
export interface DataSource {
  data_source_id: string;
  project_id: string;
  name: string;
  source_type: string;
  config: Record<string, unknown>;
  validation_mode: string;
  last_sync_at: string | null;
  item_count: number;
  error_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataSourceListResponse {
  items: DataSource[];
  total: number;
}

export interface CreateDataSourceRequest {
  name: string;
  source_type: string;
  config: Record<string, unknown>;
  validation_mode?: string;
}

export interface UpdateDataSourceRequest {
  name?: string;
  config?: Record<string, unknown>;
  validation_mode?: string;
  is_active?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  sample_files?: string[];
}

// Query keys
export const dataSourceKeys = {
  all: ['data-sources'] as const,
  lists: () => [...dataSourceKeys.all, 'list'] as const,
  list: (projectId: string) => [...dataSourceKeys.lists(), projectId] as const,
  details: () => [...dataSourceKeys.all, 'detail'] as const,
  detail: (projectId: string, id: string) => [...dataSourceKeys.details(), projectId, id] as const,
};

// API functions
const dataSourcesApi = {
  list: (projectId: string) =>
    api.get<DataSourceListResponse>(`/projects/${projectId}/data-sources`),

  get: (projectId: string, id: string) =>
    api.get<DataSource>(`/projects/${projectId}/data-sources/${id}`),

  create: (projectId: string, data: CreateDataSourceRequest) =>
    api.post<DataSource>(`/projects/${projectId}/data-sources`, data),

  update: (projectId: string, id: string, data: UpdateDataSourceRequest) =>
    api.patch<DataSource>(`/projects/${projectId}/data-sources/${id}`, data),

  delete: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/data-sources/${id}`),

  testConnection: (projectId: string, id: string) =>
    api.post<ConnectionTestResult>(`/projects/${projectId}/data-sources/${id}/test`),

  triggerSync: (projectId: string, id: string) =>
    api.post(`/projects/${projectId}/data-sources/${id}/sync`),
};

/**
 * Fetch data sources for a project.
 */
export function useDataSources(projectId: string | undefined) {
  return useQuery({
    queryKey: dataSourceKeys.list(projectId!),
    queryFn: () => dataSourcesApi.list(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Fetch a single data source.
 */
export function useDataSource(projectId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: dataSourceKeys.detail(projectId!, id!),
    queryFn: () => dataSourcesApi.get(projectId!, id!),
    enabled: !!projectId && !!id,
  });
}

/**
 * Create a new data source.
 */
export function useCreateDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateDataSourceRequest }) =>
      dataSourcesApi.create(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.list(projectId) });
    },
  });
}

/**
 * Update a data source.
 */
export function useUpdateDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      id,
      data
    }: {
      projectId: string;
      id: string;
      data: UpdateDataSourceRequest
    }) => dataSourcesApi.update(projectId, id, data),
    onSuccess: (result, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.list(projectId) });
      queryClient.setQueryData(
        dataSourceKeys.detail(projectId, result.data_source_id),
        result
      );
    },
  });
}

/**
 * Delete a data source.
 */
export function useDeleteDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: string; id: string }) =>
      dataSourcesApi.delete(projectId, id),
    onSuccess: (_, { projectId, id }) => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.list(projectId) });
      queryClient.removeQueries({ queryKey: dataSourceKeys.detail(projectId, id) });
    },
  });
}

/**
 * Test connection to a data source.
 */
export function useTestDataSourceConnection() {
  return useMutation({
    mutationFn: ({ projectId, dataSourceId }: { projectId: string; dataSourceId: string }) =>
      dataSourcesApi.testConnection(projectId, dataSourceId),
  });
}

/**
 * Trigger sync for a data source.
 */
export function useTriggerDataSourceSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, dataSourceId }: { projectId: string; dataSourceId: string }) =>
      dataSourcesApi.triggerSync(projectId, dataSourceId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.list(projectId) });
    },
  });
}
