import React, { useRef, useEffect, useState } from 'react';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Button } from '../design-system';
import { 
  XMarkIcon,
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  BookOpenIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

// Type for verse timing data
interface VerseTimestamp {
  id: string;
  verse_id: string;
  start_time_seconds: number;
  duration_seconds: number;
  verse_number: number;
}

export function CornerAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isVersesExpanded, setIsVersesExpanded] = useState(false);
  
  const {
    currentFile,
    audioUrl,
    isVisible,
    isPlaying,
    currentTime,
    duration,
    pausePlayback,
    resumePlayback,
    closePlayer,
    setCurrentTime,
    setDuration,
    setLoading,
    setError,
  } = useAudioPlayerStore();

  // Fetch verse timestamps for the current media file
  const { data: verseTimestamps = [] } = useQuery({
    queryKey: ['media_files_verses', currentFile?.id],
    queryFn: async () => {
      if (!currentFile?.id) return [];
      
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
        .eq('media_file_id', currentFile.id)
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
    enabled: !!currentFile?.id && isVisible,
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

  // Sync player state with store
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.play().catch((error: unknown) => {
        console.error('Error playing audio:', error);
        setError('Failed to play audio');
      });
    } else {
      audioElement.pause();
    }
  }, [isPlaying, setError]);

  const handlePlay = () => {
    resumePlayback();
  };

  const handlePause = () => {
    pausePlayback();
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setLoading(false);
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
    setLoading(false);
  };

  const handleEnded = () => {
    pausePlayback();
    setCurrentTime(0);
  };

  const handleSkipForward = () => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const newTime = Math.min(audioElement.currentTime + 10, duration);
      audioElement.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkipBackward = () => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const newTime = Math.max(audioElement.currentTime - 10, 0);
      audioElement.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  const jumpToVerse = (timestamp: number) => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Auto-play when new audio is loaded
  useEffect(() => {
    if (audioUrl && isVisible) {
      setTimeout(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
          audioElement.play().catch((error: unknown) => {
            console.error('Auto-play failed:', error);
            setError('Auto-play failed. Click play to start.');
          });
        }
      }, 100);
    }
  }, [audioUrl, isVisible, setError]);

  // Format time utility
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Truncate filename for main title
  const truncateFilename = (filename: string, maxLength: number = 40) => {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength) + '...';
  };

  if (!isVisible || !currentFile) {
    return null;
  }

  return (
    <>
      {/* Hidden HTML5 Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
          onEnded={handleEnded}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      )}

      {/* Audio Player */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* Verses Section (Expandable Above) */}
        {isVersesExpanded && verseTimestamps.length > 0 && (
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden w-[450px] backdrop-blur-sm mb-2 max-h-80">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4 text-accent-400" />
                  <h3 className="text-neutral-100 font-medium text-sm">
                    Verses ({verseTimestamps.length})
                  </h3>
                </div>
                {currentVerse && (
                  <span className="text-xs text-accent-600 bg-neutral-700 px-2 py-1 rounded font-medium">
                    Verse {currentVerse.verse_number}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {verseTimestamps.map((verse) => {
                  const isCurrentVerse = currentVerse?.id === verse.id;
                  
                  return (
                    <button
                      key={verse.id}
                      onClick={() => jumpToVerse(verse.start_time_seconds)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 text-left ${
                        isCurrentVerse
                          ? 'bg-accent-600 text-neutral-900 shadow-md font-medium'
                          : 'bg-neutral-700 text-neutral-200 hover:bg-primary-700 hover:text-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          Verse {verse.verse_number}
                        </span>
                        {isCurrentVerse && (
                          <div className="w-2 h-2 bg-neutral-900 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono">
                          {formatTime(verse.start_time_seconds)}
                        </div>
                        <div className="text-xs opacity-75">
                          {formatTime(verse.duration_seconds)} long
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Player */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden w-[450px] backdrop-blur-sm">
          {/* Progress Bar */}
          <div className="relative h-1 bg-neutral-700 group cursor-pointer" onClick={handleProgressBarClick}>
            <div 
              className="absolute top-0 left-0 h-full bg-accent-500 transition-all duration-150"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ left: duration ? `${(currentTime / duration) * 100}%` : '0%', transform: 'translateX(-50%) translateY(-50%)' }}
            />
          </div>

          <div className="p-4">
            {/* Main Content */}
            <div className="flex items-center gap-4">
              {/* Album Art / Icon */}
              <div className="w-14 h-14 bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <MusicalNoteIcon className="w-7 h-7 text-accent-400" />
              </div>

              {/* Track Info - More spacious layout */}
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-neutral-100 font-medium text-base leading-tight truncate">
                  {truncateFilename(currentFile.filename || 'Audio File')}
                </h3>
                <p className="text-neutral-300 text-sm mt-1 truncate">
                  {currentFile.verse_reference}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>•</span>
                  <span>{formatTime(duration)}</span>
                  {currentVerse && (
                    <>
                      <span>•</span>
                      <span className="text-accent-500 font-medium">v.{currentVerse.verse_number}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Skip Backward */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipBackward}
                  className="w-8 h-8 p-0 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors rounded-full"
                >
                  <BackwardIcon className="w-4 h-4" />
                </Button>

                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="w-10 h-10 p-0 bg-accent-600 hover:bg-accent-500 text-neutral-900 rounded-full transition-colors shadow-md"
                >
                  {isPlaying ? (
                    <PauseIcon className="w-5 h-5" />
                  ) : (
                    <PlayIcon className="w-5 h-5 ml-0.5" />
                  )}
                </Button>

                {/* Skip Forward */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipForward}
                  className="w-8 h-8 p-0 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors rounded-full"
                >
                  <ForwardIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Verses Toggle & Close */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Verses Toggle - More descriptive */}
                {verseTimestamps.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVersesExpanded(!isVersesExpanded)}
                    className={`w-8 h-8 p-0 transition-colors rounded-full ${
                      isVersesExpanded 
                        ? 'text-accent-500 bg-neutral-700' 
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                    }`}
                    title={`${isVersesExpanded ? 'Hide' : 'Show'} verse list (${verseTimestamps.length} verses)`}
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </Button>
                )}

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePlayer}
                  className="w-8 h-8 p-0 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors rounded-full ml-1"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Custom scrollbar for verses */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #57534e;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d4b138;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #edc94a;
        }
      `}</style>
    </>
  );
} 