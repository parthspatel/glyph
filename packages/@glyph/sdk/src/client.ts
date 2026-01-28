/**
 * Glyph API Client
 */

import type { Task, Annotation, Project } from '@glyph/types';

export interface GlyphClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export class GlyphClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: GlyphClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Tasks
  async getTasks(): Promise<{ tasks: Task[]; total: number }> {
    return this.fetch('/api/v1/tasks');
  }

  async getTask(taskId: string): Promise<Task> {
    return this.fetch(`/api/v1/tasks/${taskId}`);
  }

  // Annotations
  async getAnnotations(): Promise<{ annotations: Annotation[]; total: number }> {
    return this.fetch('/api/v1/annotations');
  }

  async getAnnotation(annotationId: string): Promise<Annotation> {
    return this.fetch(`/api/v1/annotations/${annotationId}`);
  }

  async createAnnotation(data: Partial<Annotation>): Promise<Annotation> {
    return this.fetch('/api/v1/annotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Projects
  async getProjects(): Promise<{ projects: Project[]; total: number }> {
    return this.fetch('/api/v1/projects');
  }

  async getProject(projectId: string): Promise<Project> {
    return this.fetch(`/api/v1/projects/${projectId}`);
  }

  // Health
  async health(): Promise<{ status: string; version: string }> {
    return this.fetch('/health');
  }
}
