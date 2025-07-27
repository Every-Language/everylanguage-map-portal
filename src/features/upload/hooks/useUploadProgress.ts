import { useState, useEffect, useCallback } from 'react';
import type { UploadProgressData, UploadProgressResponse } from '../../../shared/services/bulkUploadService';
import { supabase } from '../../../shared/services/supabase';

export interface UseUploadProgressOptions {
  /**
   * How often to poll for progress updates (in milliseconds)
   * @default 2000
   */
  pollingInterval?: number;
  
  /**
   * Whether to automatically stop polling when all uploads are complete
   * @default true
   */
  autoStopOnComplete?: boolean;
}

export interface UseUploadProgressReturn {
  /** Current progress data from the backend */
  progressData: UploadProgressData | null;
  
  /** Whether a progress check is currently in progress */
  isLoading: boolean;
  
  /** Any error that occurred during progress checking */
  error: string | null;
  
  /** Manually trigger a progress check */
  refetch: () => Promise<void>;
  
  /** Start tracking progress for the given media file IDs */
  startTracking: (mediaFileIds: string[]) => void;
  
  /** Stop tracking progress */
  stopTracking: () => void;
  
  /** Whether tracking is currently active */
  isTracking: boolean;
}

/**
 * Hook for tracking upload progress using the new backend endpoint
 */
export function useUploadProgress(options: UseUploadProgressOptions = {}): UseUploadProgressReturn {
  const {
    pollingInterval = 2000,
    autoStopOnComplete = true
  } = options;

  const [progressData, setProgressData] = useState<UploadProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaFileIds, setMediaFileIds] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [pollingInterval_, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  /**
   * Check upload progress for the current media file IDs
   */
  const checkProgress = useCallback(async () => {
    if (mediaFileIds.length === 0) {
      console.warn('No media file IDs to check progress for');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required for progress tracking');
      }

      // Get Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Call the progress endpoint
      const response = await fetch(`${supabaseUrl}/functions/v1/get-upload-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          mediaFileIds 
        }),
      });

      if (!response.ok) {
        throw new Error(`Progress check failed: ${response.statusText}`);
      }

      const result: UploadProgressResponse = await response.json();

      if (result.success && result.data) {
        setProgressData(result.data);
        
        // Auto-stop if all uploads are complete and auto-stop is enabled
        if (autoStopOnComplete && 
            (result.data.progress.status === 'completed' || result.data.progress.status === 'failed')) {
          console.log('🎉 All uploads completed, auto-stopping progress tracking');
          stopTracking();
        }
      } else {
        throw new Error(result.error || 'Failed to get progress data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Upload progress check failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [mediaFileIds, autoStopOnComplete]);

  /**
   * Start tracking progress for given media file IDs
   */
  const startTracking = useCallback((fileIds: string[]) => {
    console.log('🔔 Starting upload progress tracking for:', fileIds);
    
    // Stop any existing tracking
    if (pollingInterval_) {
      clearInterval(pollingInterval_);
    }

    // Update state
    setMediaFileIds(fileIds);
    setIsTracking(true);
    setError(null);
    setProgressData(null);

    // Start polling if we have file IDs
    if (fileIds.length > 0) {
      // Immediate check
      checkProgress();
      
      // Set up polling
      const interval = setInterval(checkProgress, pollingInterval);
      setPollingInterval(interval);
    }
  }, [checkProgress, pollingInterval, pollingInterval_]);

  /**
   * Stop tracking progress
   */
  const stopTracking = useCallback(() => {
    console.log('🛑 Stopping upload progress tracking');
    
    if (pollingInterval_) {
      clearInterval(pollingInterval_);
      setPollingInterval(null);
    }
    
    setIsTracking(false);
    setMediaFileIds([]);
  }, [pollingInterval_]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    if (!isTracking) {
      console.warn('Cannot refetch - tracking is not active');
      return;
    }
    await checkProgress();
  }, [checkProgress, isTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval_) {
        clearInterval(pollingInterval_);
      }
    };
  }, [pollingInterval_]);

  return {
    progressData,
    isLoading,
    error,
    refetch,
    startTracking,
    stopTracking,
    isTracking,
  };
} 