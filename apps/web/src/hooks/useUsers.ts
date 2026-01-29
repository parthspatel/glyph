import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v1';

// Types
export interface UserSummary {
  user_id: string;
  email: string;
  display_name: string;
  status: string;
  global_role: string;
  department: string | null;
}

export interface UserListResponse {
  items: UserSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateUserRequest {
  email: string;
  display_name: string;
  department?: string;
  timezone?: string;
  global_role?: string;
}

interface UseUsersParams {
  limit?: number;
  offset?: number;
}

export function useUsers(params: UseUsersParams = {}) {
  const { limit = 20, offset = 0 } = params;

  return useQuery({
    queryKey: ['users', { limit, offset }],
    queryFn: async (): Promise<UserListResponse> => {
      const res = await fetch(`${API_BASE}/users?limit=${limit}&offset=${offset}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json();
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserStatus(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}

export function useBulkUpdateUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userIds,
      update,
    }: {
      userIds: string[];
      update: { status?: string };
    }) => {
      // Execute updates in parallel
      const results = await Promise.allSettled(
        userIds.map((id) =>
          fetch(`${API_BASE}/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(update),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to update ${id}`);
            return res.json();
          })
        )
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed > 0) {
        throw new Error(`${failed} of ${userIds.length} updates failed`);
      }

      return { succeeded, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
