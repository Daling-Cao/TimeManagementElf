import type { PaginatedResponse, Task, TomatoSession, CreateTaskRequest, UpdateTaskRequest, CompleteTaskRequest, CreateTomatoSessionRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await this.request<{ access_token: string; refresh_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = response.access_token;
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    
    return response;
  }

  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    this.token = response.access_token;
    localStorage.setItem('access_token', response.access_token);
    
    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Task methods
  async getTasks(params?: { since?: string; status?: string; type?: string }): Promise<PaginatedResponse<Task>> {
    const queryParams = new URLSearchParams();
    if (params?.since) queryParams.append('since', params.since);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    
    const query = queryParams.toString();
    return this.request<PaginatedResponse<Task>>(`/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(task: CreateTaskRequest): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async completeTask(taskId: string, data: CompleteTaskRequest): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Tomato Session methods
  async getTomatoSessions(params?: { since?: string; task_id?: string }): Promise<PaginatedResponse<TomatoSession>> {
    const queryParams = new URLSearchParams();
    if (params?.since) queryParams.append('since', params.since);
    if (params?.task_id) queryParams.append('task_id', params.task_id);
    
    const query = queryParams.toString();
    return this.request<PaginatedResponse<TomatoSession>>(`/tomatoes${query ? `?${query}` : ''}`);
  }

  async createTomatoSession(session: CreateTomatoSessionRequest): Promise<TomatoSession> {
    return this.request<TomatoSession>('/tomatoes', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  // Statistics methods
  async getTaskStatistics(): Promise<unknown> {
    return this.request<unknown>('/statistics/tasks');
  }

  async getTomatoStatistics(): Promise<unknown> {
    return this.request<unknown>('/statistics/tomato-sessions');
  }

  async getSummaryStatistics(): Promise<unknown> {
    return this.request<unknown>('/statistics/summary');
  }
}

export const apiService = new ApiService(API_BASE_URL);
