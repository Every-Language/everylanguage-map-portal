// API-related type definitions

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadProgress {
  filename: string;
  percentage: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
} 