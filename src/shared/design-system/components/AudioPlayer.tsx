import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  LoadingSpinner
} from '../components';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface AudioPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioUrl?: string;
  title?: string;
  subtitle?: string;
}

export function AudioPlayer({ 
  open, 
  onOpenChange, 
  audioUrl, 
  title = 'Audio Player',
  subtitle 
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes or URL changes
  useEffect(() => {
    if (!open || !audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [open, audioUrl]);

  // Audio event handlers
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleError = () => {
    setError('Failed to load audio file');
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Control functions
  const togglePlay = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (newMuted) {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = volume;
    }
  };

  // Format time utility
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{title}</DialogTitle>
              {subtitle && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="ml-2 flex-shrink-0"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Audio Element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadStart={handleLoadStart}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onError={handleError}
              onEnded={handleEnded}
              preload="metadata"
            />
          )}

          {/* Error Display */}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center py-2">
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner className="mr-2" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Loading audio...
              </span>
            </div>
          )}

          {/* Controls */}
          {audioUrl && !error && (
            <>
              {/* Progress Bar */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={togglePlay}
                  disabled={isLoading}
                  className="rounded-full w-12 h-12 p-0"
                >
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : isPlaying ? (
                    <PauseIcon className="h-6 w-6" />
                  ) : (
                    <PlayIcon className="h-6 w-6" />
                  )}
                </Button>
              </div>

              {/* Volume Controls */}
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
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </>
          )}

          {/* No Audio URL */}
          {!audioUrl && !isLoading && (
            <div className="text-center py-4 text-neutral-600 dark:text-neutral-400">
              No audio file to play
            </div>
          )}
        </div>

        <style>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.2);
          }
          
          .slider::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
} 