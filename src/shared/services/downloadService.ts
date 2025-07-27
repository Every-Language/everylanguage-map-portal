import { supabase } from './supabase';

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
   * Get presigned download URLs for the given file paths
   */
  async getDownloadUrls(
    filePaths: string[], 
    options: DownloadOptions = {}
  ): Promise<DownloadUrlResponse> {
    const { expirationHours = 24 } = options;

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Extract filenames from full URLs if needed
      const processedFilePaths = filePaths.map(filePath => {
        // If it's a full URL, extract just the filename
        if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
          const filename = filePath.split('/').pop() || filePath;
          console.log(`Extracted filename "${filename}" from URL "${filePath}"`);
          return filename;
        }
        return filePath;
      });

      console.log('Requesting download URLs for files:', processedFilePaths);

      // Call the edge function
      const response = await fetch(`${this.supabaseUrl}/functions/v1/get-download-urls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: processedFilePaths,
          expirationHours,
        }),
      });

      console.log('Edge function response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error response:', errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
          console.error('Parsed error data:', errorData);
        } catch {
          // If JSON parsing fails, use the raw text
          if (errorText) {
            errorMessage = `HTTP ${response.status}: ${errorText}`;
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result: DownloadUrlResponse = await response.json();
      console.log('Successfully got download URLs:', result);
      
      // Map the response back to original file paths if we had full URLs
      if (processedFilePaths.some((path, index) => path !== filePaths[index])) {
        const mappedUrls: Record<string, string> = {};
        const mappedErrors: Record<string, string> = {};
        const mappedFailedFiles: string[] = [];
        
        filePaths.forEach((originalPath, index) => {
          const processedPath = processedFilePaths[index];
          
          if (result.urls[processedPath]) {
            mappedUrls[originalPath] = result.urls[processedPath];
          }
          
          if (result.errors && result.errors[processedPath]) {
            mappedErrors[originalPath] = result.errors[processedPath];
          }
          
          if (result.failedFiles && result.failedFiles.includes(processedPath)) {
            mappedFailedFiles.push(originalPath);
          }
        });
        
        return {
          ...result,
          urls: mappedUrls,
          errors: mappedErrors,
          failedFiles: mappedFailedFiles
        };
      }
      
      return result;

    } catch (error) {
      console.error('Failed to get download URLs:', error);
      throw error instanceof Error ? error : new Error('Unknown error getting download URLs');
    }
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
    remotePath: string,
    filename: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    try {
      options.onProgress?.(5);

      // Get the presigned URL
      const urlResponse = await this.getDownloadUrls([remotePath], options);
      
      if (!urlResponse.success || !urlResponse.urls[remotePath]) {
        const error = urlResponse.errors?.[remotePath] || 'Failed to get download URL';
        throw new Error(error);
      }

      options.onProgress?.(15);

      const signedUrl = urlResponse.urls[remotePath];
      
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
   * Download multiple files in batch (future enhancement)
   */
  async downloadBatch(
    files: Array<{ remotePath: string; filename: string }>,
    options: DownloadOptions = {}
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const filePaths = files.map(f => f.remotePath);
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // Get all presigned URLs at once
      const urlResponse = await this.getDownloadUrls(filePaths, options);
      
      if (!urlResponse.success) {
        throw new Error('Failed to get any download URLs');
      }

      // Download each file sequentially (could be made parallel if needed)
      for (const file of files) {
        try {
          const signedUrl = urlResponse.urls[file.remotePath];
          
          if (!signedUrl) {
            const error = urlResponse.errors?.[file.remotePath] || 'No URL available';
            errors.push(`${file.filename}: ${error}`);
            failed++;
            continue;
          }

          await this.downloadFile(signedUrl, file.filename, options);
          successful++;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${file.filename}: ${errorMessage}`);
          failed++;
        }
      }

      return { successful, failed, errors };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Batch download failed: ${errorMessage}`);
      
      return { 
        successful: 0, 
        failed: files.length, 
        errors 
      };
    }
  }
}

// Export a singleton instance
export const downloadService = new DownloadService(); 