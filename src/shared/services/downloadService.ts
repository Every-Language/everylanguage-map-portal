import { supabase } from './supabase';

/**
 * @deprecated Legacy interface for old download API. Use DownloadUrlByIdResponse instead.
 */
export interface DownloadUrlResponse {
  success: boolean;
  urls: Record<string, string>;
  expiresIn: number;
  totalFiles: number;
  successfulUrls: number;
  failedFiles?: string[];
  errors?: Record<string, string>;
}

export interface DownloadOptions {
  expirationHours?: number;
  onProgress?: (progress: number) => void;
}

export class DownloadService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!this.supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
  }

  /**
   * @deprecated Legacy method removed. Use getDownloadUrlsById instead.
   */
  async getDownloadUrls(): Promise<DownloadUrlResponse> {
    throw new Error('getDownloadUrls is deprecated. Use getDownloadUrlsById instead.');
  }

  /**
   * Get presigned download URLs by media/image IDs (new by-id API)
   */
  async getDownloadUrlsById(
    params: { mediaFileIds?: string[]; imageIds?: string[]; expirationHours?: number }
  ): Promise<{ success: boolean; expiresIn: number; media?: Record<string, string>; images?: Record<string, string>; errors?: Record<string, string> }> {
    const { mediaFileIds = [], imageIds = [], expirationHours = 24 } = params;

    if (mediaFileIds.length === 0 && imageIds.length === 0) {
      throw new Error('Provide at least one mediaFileId or imageId');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No authentication session found');
    }

    const response = await fetch(`${this.supabaseUrl}/functions/v1/get-download-urls-by-id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mediaFileIds, imageIds, expirationHours })
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const err = JSON.parse(text);
        throw new Error(err.error || `HTTP ${response.status}: ${response.statusText}`);
      } catch {
        throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return await response.json();
  }

  /**
   * Download a file from a presigned URL
   */
  async downloadFile(
    signedUrl: string, 
    filename: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    const { onProgress } = options;

    try {
      onProgress?.(0);

      // Fetch the file content
      const response = await fetch(signedUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body available');
      }

      onProgress?.(20);

      // Read the response as a blob directly (more efficient for binary files)
      const blob = await response.blob();
      
      onProgress?.(90);

      // Determine the MIME type from the response or filename
      let mimeType = response.headers.get('content-type') || 'application/octet-stream';
      
      // For audio files, ensure proper MIME type
      if (filename.toLowerCase().endsWith('.m4a')) {
        mimeType = 'audio/mp4';
      } else if (filename.toLowerCase().endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (filename.toLowerCase().endsWith('.wav')) {
        mimeType = 'audio/wav';
      }

      // Create a new blob with the correct MIME type
      const typedBlob = new Blob([blob], { type: mimeType });
      
      // Create download link and trigger download
      const downloadUrl = window.URL.createObjectURL(typedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = filename;
      a.setAttribute('rel', 'noopener noreferrer');
      
      // Add to DOM, click, and remove
      document.body.appendChild(a);
      a.click();
      
      // Clean up immediately
      document.body.removeChild(a);
      
      // Use setTimeout to ensure the download starts before revoking the URL
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      onProgress?.(100);

      console.log(`✅ Successfully downloaded: ${filename}`);

    } catch (error) {
      console.error('Download failed:', error);
      throw error instanceof Error ? error : new Error('Unknown download error');
    }
  }

  /**
   * Download a single audio file (convenience method)
   */
  async downloadAudioFile(
    mediaFileId: string,
    filename: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    try {
      options.onProgress?.(5);

      // Get the presigned URL by ID
      const byId = await this.getDownloadUrlsById({ mediaFileIds: [mediaFileId], expirationHours: options.expirationHours });
      const signedUrl = byId.media?.[mediaFileId];
      if (!byId.success || !signedUrl) {
        const error = byId.errors?.[mediaFileId] || 'Failed to get download URL';
        throw new Error(error);
      }

      options.onProgress?.(15);
      
      // Try the blob download approach first
      try {
        await this.downloadFile(signedUrl, filename, options);
      } catch (downloadError) {
        console.warn('Blob download failed, trying direct URL approach:', downloadError);
        
        // Fallback: create a direct link (less preferred but more compatible)
        this.downloadViaDirect(signedUrl, filename);
        options.onProgress?.(100);
      }

    } catch (error) {
      console.error(`Failed to download audio file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Fallback download method using direct URL
   */
  private downloadViaDirect(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    
    // For better browser compatibility
    a.style.display = 'none';
    document.body.appendChild(a);
    
    // Force download by setting attributes
    a.setAttribute('download', filename);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
    
    console.log(`📥 Initiated direct download: ${filename}`);
  }

  /**
   * @deprecated Batch download method removed. Implement using getDownloadUrlsById if needed.
   */
  async downloadBatch(): Promise<{ successful: number; failed: number; errors: string[] }> {
    throw new Error('downloadBatch is deprecated. Use getDownloadUrlsById for batch operations.');
  }
}

// Export a singleton instance
export const downloadService = new DownloadService(); 