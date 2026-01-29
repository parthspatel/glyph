import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v1';

// Types matching the API responses
export interface ContactInfo {
  phone: string | null;
  slack_handle: string | null;
  office_location: string | null;
}

export interface QualityProfileResponse {
  overall_score: number | null;
  accuracy_score: number | null;
  consistency_score: number | null;
  speed_percentile: number | null;
  total_annotations: number;
  approved_annotations: number;
  rejected_annotations: number;
}

export interface UserSkillResponse {
  certification_id: string;
  skill_id: string;
  skill_name: string;
  proficiency_level: string | null;
  certified_by: string | null;
  certified_at: string;
  expires_at: string | null;
  status: string;
}

export interface UserDetailResponse {
  user_id: string;
  email: string;
  display_name: string;
  status: string;
  timezone: string | null;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact_info: ContactInfo;
  global_role: string;
  quality_profile: QualityProfileResponse;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserRequest {
  display_name?: string;
  timezone?: string;
  department?: string;
  bio?: string;
  avatar_url?: string;
  contact_info?: ContactInfo;
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async (): Promise<UserDetailResponse> => {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch user: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<UserDetailResponse> => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch current user: ${res.status}`);
      }
      return res.json();
    },
  });
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserRequest): Promise<UserDetailResponse> => {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user', userId], data);
      // Also update currentUser if it's the same user
      const currentUser = queryClient.getQueryData<UserDetailResponse>(['currentUser']);
      if (currentUser?.user_id === userId) {
        queryClient.setQueryData(['currentUser'], data);
      }
    },
  });
}

export function useUserSkills(userId: string) {
  return useQuery({
    queryKey: ['user', userId, 'skills'],
    queryFn: async (): Promise<UserSkillResponse[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/skills`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch skills: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!userId,
  });
}
