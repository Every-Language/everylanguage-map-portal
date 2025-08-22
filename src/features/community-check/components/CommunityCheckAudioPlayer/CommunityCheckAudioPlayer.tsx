import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { MediaFileWithVerseInfo } from '@/shared/hooks/query/media-files';
import type { VerseTimestamp } from '../../types';
import { 
  PlayIcon, 
  PauseIcon, 
  ForwardIcon, 
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/shared/design-system/components/Button';

interface CommunityCheckAudioPlayerProps {
  file: MediaFileWithVerseInfo;
  onVerseChange?: (verse: VerseTimestamp | null) => void;
}

export function CommunityCheckAudioPlayer({ file, onVerseChange }: CommunityCheckAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch verse timestamps for the current media file
  const { data: verseTimestamps = [] } = useQuery({
    queryKey: ['media_files_verses', file.id],
    queryFn: async () => {
      if (!file.id) return [];
      
      const { data, error } = await supabase
        .from('media_files_verses')
        .select(`
          id,
          verse_id,
          start_time_seconds,
          duration_seconds,
          verses!verse_id(
            verse_number
          )
        `)
        .eq('media_file_id', file.id)
        .order('start_time_seconds', { ascending: true });

      if (error) {
        console.error('Error fetching verse timestamps:', error);
        return [];
      }

      return (data || []).map(verse => ({
        id: verse.id,
        verse_id: verse.verse_id,
        start_time_seconds: verse.start_time_seconds,
        duration_seconds: verse.duration_seconds,
        verse_number: (verse.verses as { verse_number: number })?.verse_number || 0,
      })) as VerseTimestamp[];
    },
    enabled: !!file.id,
  });

  // Find current verse based on current time
  const getCurrentVerse = () => {
    return verseTimestamps.find((verse, index) => {
      const nextVerse = verseTimestamps[index + 1];
      return currentTime >= verse.start_time_seconds && 
             (!nextVerse || currentTime < nextVerse.start_time_seconds);
    });
  };

  const currentVerse = getCurrentVerse();

  // Notify parent of verse changes
  useEffect(() => {
    onVerseChange?.(currentVerse || null);
  }, [currentVerse, onVerseChange]);

  // Audio event handlers
  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setDuration(audio.duration);
  };

  const handleError = () => {
    setError('Failed to load audio file');
    setIsLoading(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Control functions
  const togglePlay = () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch((error) => {
        console.error('Error playing audio:', error);
        setError('Failed to play audio');
      });
    }
  };

  const jumpToVerse = (timestamp: number) => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  const skipToNextVerse = () => {
    const currentIndex = verseTimestamps.findIndex(v => v.start_time_seconds <= currentTime);
    const nextVerse = verseTimestamps[currentIndex + 1];
    if (nextVerse) {
      jumpToVerse(nextVerse.start_time_seconds);
    }
  };

  const skipToPreviousVerse = () => {
    const currentIndex = verseTimestamps.findIndex(v => v.start_time_seconds <= currentTime);
    const previousVerse = verseTimestamps[currentIndex - 1];
    if (previousVerse) {
      jumpToVerse(previousVerse.start_time_seconds);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const seekTime = (parseFloat(e.target.value) / 100) * duration;
      audioElement.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const audioElement = audioRef.current;
    if (audioElement) {
      if (isMuted) {
        audioElement.volume = volume;
        setIsMuted(false);
      } else {
        audioElement.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.playbackRate = speed;
    }
  };

  // Format time utility
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Audio URL state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Generate audio URL using download service
  useEffect(() => {
    let currentBlobUrl: string | null = null;
    
    const getAudioUrl = async () => {
      if (!file.id) {
        setError('No audio file available');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Get presigned URL for streaming by ID
        const downloadService = await import('@/shared/services/downloadService');
        const service = new downloadService.DownloadService();
        const result = await service.getDownloadUrlsById({ mediaFileIds: [file.id] });
        const signedUrl = result.media?.[file.id];
        
        if (result.success && signedUrl) {
          // Use blob URL approach for Safari compatibility
          try {
            const blobResponse = await fetch(signedUrl);
            const blob = await blobResponse.blob();
            const blobUrl = URL.createObjectURL(blob);
            currentBlobUrl = blobUrl;
            setAudioUrl(blobUrl);
          } catch (blobError) {
            // Fallback to direct URL if blob creation fails
            setAudioUrl(signedUrl);
          }
        } else {
          setError('Failed to get audio URL');
        }
      } catch (error) {
        console.error('Error getting audio URL:', error);
        setError('Failed to load audio file');
      } finally {
        setIsLoading(false);
      }
    };

    getAudioUrl();
    
    // Cleanup function to revoke blob URL when component unmounts or file changes
    return () => {
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [file.id]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Playback speed options
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {file.filename}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {file.verse_reference}
          {currentVerse && (
            <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
              • Currently: Verse {currentVerse.verse_number}
            </span>
          )}
        </p>
      </div>

      {/* Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
          onEnded={handleEnded}
        />
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          value={duration ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-primary"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={skipToPreviousVerse}
          disabled={!verseTimestamps.length}
          className="flex items-center space-x-1"
        >
          <BackwardIcon className="h-4 w-4" />
          <span>Prev Verse</span>
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={togglePlay}
          disabled={isLoading}
          className="flex items-center justify-center w-12 h-12 rounded-full p-0"
        >
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          ) : isPlaying ? (
            <PauseIcon className="h-6 w-6 ml-0.5" />
          ) : (
            <PlayIcon className="h-6 w-6 ml-0.5" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={skipToNextVerse}
          disabled={!verseTimestamps.length}
          className="flex items-center space-x-1"
        >
          <span>Next Verse</span>
          <ForwardIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="p-1"
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="h-4 w-4" />
            ) : (
              <SpeakerWaveIcon className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume * 100}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-primary"
          />
        </div>

        {/* Playback Speed */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {speedOptions.map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Verse Navigation */}
      {verseTimestamps.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Verses ({verseTimestamps.length})
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {verseTimestamps.map((verse) => (
              <button
                key={verse.id}
                onClick={() => jumpToVerse(verse.start_time_seconds)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  currentVerse?.id === verse.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-200'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {verse.verse_number}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 