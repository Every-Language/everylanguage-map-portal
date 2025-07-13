// Common type definitions

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MediaFile {
  id: string;
  project_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  duration: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'cancelled'; 