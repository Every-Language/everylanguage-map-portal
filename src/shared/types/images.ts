// Image types based on the real database schema
export interface ImageSet {
  id: string;
  name: string;
  remote_path?: string;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Image {
  id: string;
  remote_path: string;
  target_type: 'chapter' | 'book' | 'sermon' | 'passage' | 'verse' | 'podcast' | 'film_segment' | 'audio_segment';
  target_id: string;
  set_id?: string | null;
  created_by?: string | null;
  publish_status: 'pending' | 'published' | 'archived';
  version: number;
  deleted_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ImageWithDetails extends Image {
  filename: string;
  downloadUrl?: string;
  setName?: string;
  targetName?: string; // Display name for the target (e.g., "Genesis", "Genesis 1", etc.)
}

// Upload interfaces
export interface ImageUploadRequest {
  fileName: string;
  target_type: 'chapter' | 'book' | 'sermon' | 'passage' | 'verse' | 'podcast' | 'film_segment' | 'audio_segment';
  target_id: string;
  set_id?: string;
  setName?: string;
  createNewSet?: boolean;
  setRemotePath?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ImageUploadResponse {
  success: boolean;
  data?: {
    imageId: string;
    setId?: string;
    downloadUrl: string;
    fileSize: number;
    remotePath: string;
    version: number;
  };
  error?: string;
}

// Processed image file for upload
export interface ProcessedImageFile {
  file: File;
  name: string;
  size: number;
  type: string;
  id: string;
  
  // Auto-detected from filename
  detectedBookName?: string;
  detectedBookId?: string;
  
  // User selections
  selectedTargetType: 'chapter' | 'book' | 'sermon' | 'passage' | 'verse' | 'podcast' | 'film_segment' | 'audio_segment';
  selectedTargetId?: string;
  selectedSetId?: string;
  
  // Validation
  validationErrors: string[];
  isValid: boolean;
  
  // Upload state
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
} 