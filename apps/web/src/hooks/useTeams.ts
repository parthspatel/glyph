import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v1';

// Types
export interface TeamSummary {
  team_id: string;
  name: string;
  description: string | null;
  status: string;
  parent_team_id: string | null;
  member_count: number;
  sub_team_count: number;
}

export interface TeamListResponse {
  items: TeamSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface TeamDetailResponse {
  team_id: string;
  name: string;
  description: string | null;
  status: string;
  parent_team_id: string | null;
  capacity: number | null;
  specializations: string[];
  member_count: number;
  leader_count: number;
  sub_teams: TeamSummary[];
  created_at: string;
  updated_at: string;
}

export interface TeamTreeNode {
  team_id: string;
  name: string;
  description: string | null;
  status: string;
  depth: number;
  member_count: number;
  sub_team_count: number;
}

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  joined_at: string;
  allocation_percentage: number | null;
}

export interface TeamMemberListResponse {
  items: TeamMember[];
  total: number;
  limit: number;
  offset: number;
}

interface UseTeamsParams {
  limit?: number;
  offset?: number;
  rootOnly?: boolean;
}

export function useTeams(params: UseTeamsParams = {}) {
  const { limit = 20, offset = 0, rootOnly = false } = params;

  return useQuery({
    queryKey: ['teams', { limit, offset, rootOnly }],
    queryFn: async (): Promise<TeamListResponse> => {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (rootOnly) queryParams.set('root_only', 'true');

      const res = await fetch(`${API_BASE}/teams?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      return res.json();
    },
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: async (): Promise<TeamDetailResponse> => {
      const res = await fetch(`${API_BASE}/teams/${teamId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch team');
      return res.json();
    },
    enabled: !!teamId,
  });
}

export function useTeamTree(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId, 'tree'],
    queryFn: async (): Promise<{ items: TeamTreeNode[] }> => {
      const res = await fetch(`${API_BASE}/teams/${teamId}/tree`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch team tree');
      return res.json();
    },
    enabled: !!teamId,
  });
}

export function useTeamMembers(
  teamId: string,
  params: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: ['team', teamId, 'members', { limit, offset }],
    queryFn: async (): Promise<TeamMemberListResponse> => {
      const res = await fetch(
        `${API_BASE}/teams/${teamId}/members?limit=${limit}&offset=${offset}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch team members');
      return res.json();
    },
    enabled: !!teamId,
  });
}

export function useAddTeamMember(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      role?: string;
      allocation_percentage?: number;
    }) => {
      const res = await fetch(`${API_BASE}/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to add member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    },
  });
}

export function useRemoveTeamMember(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to remove member');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    },
  });
}

export function useUpdateTeamMember(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      ...data
    }: {
      userId: string;
      role?: string;
      allocation_percentage?: number;
    }) => {
      const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    },
  });
}
