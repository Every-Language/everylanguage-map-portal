import React, { useState, useRef, useEffect, useCallback } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  LoadingSpinner,
  Alert
} from '../../../../shared/design-system';
import { 
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import type { MediaFileWithVerseInfo } from '../../../../shared/hooks/query/media-files';

// Temporary verse-agnostic object for the modal
export interface TempVerse {
  id: string; // Temporary ID for React keys
  timestamp: number; // In seconds
  order: number; // Display order (1, 2, 3...)
  verse_id?: string; // Only set when loaded from DB
  verse_number?: number; // The actual verse number this represents
}

interface VerseMarkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaFile: MediaFileWithVerseInfo | null;
  audioUrl: string | null;
  onSave: (verses: TempVerse[], totalAudioDuration: number) => Promise<void>;
  existingVerses?: Array<{
    verse_id: string;
    verse_timestamp: number;
    verse_number?: number;
  }>;
  isLoading?: boolean;
  isLoadingAudio?: boolean;
}

export const VerseMarkingModal: React.FC<VerseMarkingModalProps> = ({
  open,
  onOpenChange,
  mediaFile,
  audioUrl,
  onSave,
  existingVerses = [],
  isLoading = false,
  isLoadingAudio = false
}) => {
  const audioPlayerRef = useRef<AudioPlayer>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  
  // Temporary verses state
  const [tempVerses, setTempVerses] = useState<TempVerse[]>([]);

  // Calculate verse constraints based on media file
  const verseConstraints = React.useMemo(() => {
    if (!mediaFile) return { minVerseNumber: 1, maxVerseNumber: 1, maxVerses: 1 };
    
    const startVerseNumber = mediaFile.start_verse_number;
    const endVerseNumber = mediaFile.end_verse_number;
    const maxVerses = endVerseNumber - startVerseNumber + 1;
    
    return {
      minVerseNumber: startVerseNumber,
      maxVerseNumber: endVerseNumber,
      maxVerses
    };
  }, [mediaFile]);

  // Initialize temporary verses from existing data
  useEffect(() => {
    if (open && existingVerses.length > 0) {
      const converted = existingVerses
        .map((verse, index) => ({
          id: `temp-${Date.now()}-${index}`,
          timestamp: verse.verse_timestamp,
          order: index + 1,
          verse_id: verse.verse_id,
          verse_number: verse.verse_number || (verseConstraints.minVerseNumber + index)
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      setTempVerses(converted);
    } else if (open) {
      setTempVerses([]);
    }
  }, [open, existingVerses, verseConstraints.minVerseNumber]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentTime(0);
      setError(null);
      setAudioLoading(false);
    }
  }, [open]);

  // Audio event handlers using react-h5-audio-player callbacks
  const handlePlay = () => {
    // Audio player handles play state internally
  };

  const handlePause = () => {
    // Audio player handles pause state internally
  };

  const handleLoadStart = () => {
    setAudioLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setAudioLoading(false);
  };

  const handleTimeUpdate = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    setDuration(audio.duration || 0);
  };

  const handleError = () => {
    setError('Failed to load audio file');
    setAudioLoading(false);
  };

  const handleEnded = () => {
    setCurrentTime(0);
  };

  // Auto-play when new audio is loaded (optional)
  useEffect(() => {
    if (audioUrl && open) {
      // Small delay to ensure audio is loaded
      setTimeout(() => {
        const audioElement = audioPlayerRef.current?.audio?.current;
        if (audioElement) {
          // Don't auto-play, let user control it
          setAudioLoading(false);
        }
      }, 100);
    }
  }, [audioUrl, open]);

  // Jump to specific timestamp
  const jumpToTimestamp = useCallback((timestamp: number) => {
    const audioElement = audioPlayerRef.current?.audio?.current;
    if (audioElement) {
      audioElement.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  }, []);

  // Validate verse duration constraint
  const validateVerseDuration = useCallback((newTimestamp: number, verseId?: string) => {
    const minDuration = 0.3;
    const otherVerses = tempVerses.filter(v => v.id !== verseId);
    
    // Check if this timestamp conflicts with existing verses
    for (const verse of otherVerses) {
      const timeDiff = Math.abs(verse.timestamp - newTimestamp);
      if (timeDiff < minDuration) {
        return `Verses must be at least ${minDuration} seconds apart`;
      }
    }
    
    // Check if this verse would have minimum duration
    const sortedVerses = [...otherVerses, { timestamp: newTimestamp }].sort((a, b) => a.timestamp - b.timestamp);
    const currentIndex = sortedVerses.findIndex(v => v.timestamp === newTimestamp);
    
    if (currentIndex < sortedVerses.length - 1) {
      const nextVerse = sortedVerses[currentIndex + 1];
      const verseDuration = nextVerse.timestamp - newTimestamp;
      if (verseDuration < minDuration) {
        return `This verse would be too short (${verseDuration.toFixed(2)}s). Minimum duration is ${minDuration}s`;
      }
    }
    
    if (currentIndex > 0) {
      const prevVerse = sortedVerses[currentIndex - 1];
      const prevVerseDuration = newTimestamp - prevVerse.timestamp;
      if (prevVerseDuration < minDuration) {
        return `Previous verse would be too short (${prevVerseDuration.toFixed(2)}s). Minimum duration is ${minDuration}s`;
      }
    }
    
    return null;
  }, [tempVerses]);

  // Verse management functions
  const addVerseAtCurrentTime = useCallback(() => {
    // Check if we've reached the maximum number of verses
    if (tempVerses.length >= verseConstraints.maxVerses) {
      setError(`Cannot add more verses. This audio file can only have ${verseConstraints.maxVerses} verse(s) (${mediaFile?.verse_reference}).`);
      return;
    }

    // Validate verse duration constraint
    const validationError = validateVerseDuration(currentTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newVerseNumber = verseConstraints.minVerseNumber + tempVerses.length;
    
    const newVerse: TempVerse = {
      id: `temp-${Date.now()}`,
      timestamp: parseFloat(currentTime.toFixed(2)), // 2 decimal places precision
      order: tempVerses.length + 1,
      verse_number: newVerseNumber
    };

    // Insert verse in chronological order and reorder
    const newVerses = [...tempVerses, newVerse]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((verse, index) => ({ 
        ...verse, 
        order: index + 1,
        verse_number: verseConstraints.minVerseNumber + index
      }));

    setTempVerses(newVerses);
    setError(null); // Clear any previous errors
  }, [currentTime, tempVerses, verseConstraints, mediaFile?.verse_reference, validateVerseDuration]);

  const removeVerse = useCallback((verseId: string) => {
    const newVerses = tempVerses
      .filter(verse => verse.id !== verseId)
      .map((verse, index) => ({ 
        ...verse, 
        order: index + 1,
        verse_number: verseConstraints.minVerseNumber + index
      }));
    
    setTempVerses(newVerses);
    setError(null); // Clear any previous errors
  }, [tempVerses, verseConstraints.minVerseNumber]);

  const updateVerseTimestamp = useCallback((verseId: string, newTimestamp: number) => {
    // Validate verse duration constraint
    const validationError = validateVerseDuration(newTimestamp, verseId);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newVerses = tempVerses
      .map(verse => verse.id === verseId ? { ...verse, timestamp: parseFloat(newTimestamp.toFixed(2)) } : verse)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((verse, index) => ({ 
        ...verse, 
        order: index + 1,
        verse_number: verseConstraints.minVerseNumber + index
      }));
    
    setTempVerses(newVerses);
    setError(null); // Clear validation errors
  }, [tempVerses, verseConstraints.minVerseNumber, validateVerseDuration]);

  const handleSave = async () => {
    if (!mediaFile) return;

    setIsSaving(true);
    try {
      // Use duration if available, otherwise estimate based on largest timestamp + 10 seconds
      const effectiveDuration = duration > 0 
        ? duration 
        : Math.max(...tempVerses.map(v => v.timestamp), 0) + 10;
      
      await onSave(tempVerses, effectiveDuration);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving verses:', error);
      setError('Failed to save verses');
    } finally {
      setIsSaving(false);
    }
  };

  // Get the current verse being played
  const getCurrentVerse = () => {
    return tempVerses.find((verse, index) => {
      const nextVerse = tempVerses[index + 1];
      return currentTime >= verse.timestamp && (!nextVerse || currentTime < nextVerse.timestamp);
    });
  };

  // Format time utility
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentVerse = getCurrentVerse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle>Verse Marking</DialogTitle>
              
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

        <div className="flex flex-col space-y-4 flex-1 overflow-hidden">
          {/* Loading State for Audio URL */}
          {isLoadingAudio && (
            <div className="flex items-center justify-center py-8 text-neutral-600 dark:text-neutral-400">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Loading audio file...</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}



          {/* Audio Player - Compact */}
          {audioUrl && !isLoadingAudio && (
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 flex-shrink-0">
              <div className="audio-player-container">
                <AudioPlayer
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onLoadStart={handleLoadStart}
                  onCanPlay={handleCanPlay}
                  onListen={handleTimeUpdate}
                  onLoadedMetaData={handleLoadedMetadata}
                  onError={handleError}
                  onEnded={handleEnded}
                  showJumpControls={true}
                  showSkipControls={false}
                  showDownloadProgress={false}
                  customAdditionalControls={[]}
                  customVolumeControls={[]}
                  layout="horizontal-reverse"
                  className="!bg-transparent !shadow-none"
                />
              </div>
            </div>
          )}

          {/* Add Verse Button - Compact */}
          {audioUrl && !isLoadingAudio && (
            <div className="flex justify-center flex-shrink-0">
              <Button
                onClick={addVerseAtCurrentTime}
                disabled={audioLoading || tempVerses.length >= verseConstraints.maxVerses}
                className="flex items-center space-x-2"
                size="sm"
              >
                <PlusIcon className="h-4 w-4" />
                <span>
                  Mark Verse {verseConstraints.minVerseNumber + tempVerses.length} at {formatTime(currentTime)}
                </span>
              </Button>
            </div>
          )}

          {/* Verses List - Optimized for height */}
          {audioUrl && !isLoadingAudio && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-base font-medium text-primary-600 dark:text-primary-400">
                  Marked Verses ({tempVerses.length}/{verseConstraints.maxVerses})
                </h3>
                {currentVerse && (
                  <span className="text-xs text-primary-600 dark:text-primary-400">
                    Currently playing: Verse {currentVerse.verse_number}
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {tempVerses.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    <p>No verses marked. Click "Mark Verse" to add verses at specific timestamps.</p>
                  </div>
                ) : (
                  tempVerses.map((verse) => (
                    <div
                      key={verse.id}
                      onClick={() => jumpToTimestamp(verse.timestamp)}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer hover:bg-opacity-80 ${
                        currentVerse?.id === verse.id
                          ? 'bg-accent-50 dark:bg-accent-900/10'
                          : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="font-medium text-sm flex-shrink-0 text-primary-600 dark:text-primary-400">
                          Verse {verse.verse_number}
                        </span>
                        <input
                          type="number"
                          value={verse.timestamp.toFixed(2)}
                          onChange={(e) => updateVerseTimestamp(verse.id, parseFloat(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()} // Prevent row click when editing
                          className="w-20 px-2 py-1 text-xs rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                          step="0.01"
                          min="0"
                          max={duration > 0 ? duration : undefined}
                        />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                          ({formatTime(verse.timestamp)})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click when removing
                            removeVerse(verse.id);
                          }}
                          className="text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-200 p-1"
                          title="Remove verse"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading || isLoadingAudio}
          >
            {isSaving ? 'Saving...' : 'Save Verses'}
          </Button>
        </DialogFooter>

        <style>{`
          .audio-player-container {
            --rhap_theme-color: #d4b138;
            --rhap_background-color: transparent;
            --rhap_bar-color: #e7e5e4;
            --rhap_time-color: #78716c;
            --rhap_font-family: inherit;
          }
          
          .rhap_container {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          
          .rhap_header {
            display: none !important;
          }
          
          .rhap_main {
            background: transparent !important;
          }
          
          .rhap_progress-section {
            margin-bottom: 8px !important;
            flex: 1 !important;
          }
          
          .rhap_controls-section {
            margin: 0 !important;
            justify-content: center !important;
          }
          
          .rhap_main-controls {
            justify-content: center !important;
          }
          
          .rhap_play-pause-button {
            background: #f5f5f4 !important;
            border: 1px solid #d6d3d1 !important;
            border-radius: 50% !important;
            width: 36px !important;
            height: 36px !important;
          }
          
          .rhap_play-pause-button:hover {
            background: #e7e5e4 !important;
          }
          
          .rhap_skip-button {
            background: transparent !important;
            border: none !important;
            color: #78716c !important;
          }
          
          .rhap_skip-button:hover {
            color: #44403c !important;
          }
          
          .rhap_time {
            color: #78716c !important;
            font-size: 11px !important;
          }
          
          .rhap_progress-bar {
            background-color: #e7e5e4 !important;
            height: 8px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            position: relative !important;
          }
          
          .rhap_progress-filled {
            background-color: #d4b138 !important;
            border-radius: 4px !important;
            height: 100% !important;
          }
          
          .rhap_progress-indicator {
            background-color: #d4b138 !important;
            width: 14px !important;
            height: 14px !important;
            border: 2px solid #ffffff !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
            margin-top: -3px !important;
            cursor: pointer !important;
          }
          
          .rhap_progress-container {
            margin: 0 12px !important;
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
          }
          
          .rhap_additional-controls {
            margin: 0 !important;
          }
          
          .rhap_volume-controls {
            margin: 0 !important;
          }
          
          /* Dark mode styles */
          .dark .rhap_play-pause-button {
            background: #44403c !important;
            border-color: #57534e !important;
          }
          
          .dark .rhap_play-pause-button:hover {
            background: #57534e !important;
          }
          
          .dark .rhap_skip-button {
            color: #a8a29e !important;
          }
          
          .dark .rhap_skip-button:hover {
            color: #d6d3d1 !important;
          }
          
          .dark .rhap_time {
            color: #a8a29e !important;
          }
          
          .dark .rhap_progress-bar {
            background-color: #57534e !important;
          }
          
          .dark .rhap_progress-filled {
            background-color: #d4b138 !important;
          }
          
          .dark .rhap_progress-indicator {
            background-color: #d4b138 !important;
            border-color: #1c1b1a !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}; 