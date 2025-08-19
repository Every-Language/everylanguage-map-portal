import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ForwardIcon,
  BackwardIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../design-system/components/Button';
import { Card, CardContent, CardHeader } from '../design-system/components/Card';
import { Select, SelectItem } from '../design-system/components/Select';
import { LoadingSpinner } from '../design-system/components/LoadingSpinner';
import { ConfirmationModal } from '../components/Modals/ConfirmationModal';
import { useToast } from '../design-system/hooks/useToast';
import { supabase } from '../services/supabase';
import { useAudioPlayerStore, type VerseTimestamp } from '../stores/audioPlayer';
import { 
  useVerseFeedbackByMediaFile, 
  useCreateVerseFeedback, 
  useDeleteVerseFeedback 
} from '../hooks/query/verse-feedback';
import { 
  useUpdateMediaFileStatus,
  useBatchUpdateMediaFilePublishStatus 
} from '../hooks/query/media-files';
import { cn } from '../design-system/utils';

interface VerseFeedback {
  id: string;
  verse_id: string;
  feedback_type: 'approved' | 'change_required';
  feedback_text: string | null;
  actioned: 'pending' | 'actioned' | 'rejected';
  created_at: string | null;
  updated_at: string | null;
  verses: { verse_number: number };
  created_by_user: { email: string | null; first_name: string | null; last_name: string | null } | null;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export function GlobalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Store state
  const {
    currentFile,
    audioUrl,
    isVisible,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    playbackSpeed,
    playerWidth,
    currentVerse,
    verseTimestamps,
    pausePlayback,
    resumePlayback,
    closePlayer,
    setCurrentTime,
    setDuration,
    setVolume,
    setMuted,
    setLoading,
    setError,
    setPlaybackSpeed,
    setPlayerWidth,
    setResizing,
    setCurrentVerse,
    setVerseTimestamps,
    jumpToVerse,
    skipToNextVerse,
    skipToPreviousVerse
  } = useAudioPlayerStore();

  // Local state for feedback form
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackVerseNumber, setFeedbackVerseNumber] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'approved' | 'change_required'>('all');
  const [actionedFilter, setActionedFilter] = useState<'all' | 'pending' | 'actioned' | 'rejected'>('all');

  // Confirmation modals
  const [checkStatusConfirm, setCheckStatusConfirm] = useState<{
    show: boolean;
    status: 'approved' | 'rejected' | 'requires_review';
  }>({ show: false, status: 'approved' });
  
  const [publishStatusConfirm, setPublishStatusConfirm] = useState<{
    show: boolean;
    status: 'pending' | 'published' | 'archived';
  }>({ show: false, status: 'pending' });

  // Data fetching
  const { data: verseFeedback = [], refetch: refetchFeedback } = useVerseFeedbackByMediaFile(currentFile?.id || null);
  
  // Mutations
  const createFeedbackMutation = useCreateVerseFeedback();
  const deleteFeedbackMutation = useDeleteVerseFeedback();
  const updateCheckStatusMutation = useUpdateMediaFileStatus();
  const updatePublishStatusMutation = useBatchUpdateMediaFilePublishStatus();

  // Fetch verse timestamps when file changes
  useEffect(() => {
    if (!currentFile?.id) return;

    const fetchVerseTimestamps = async () => {
      try {
        const { data, error } = await supabase
          .from('media_files_verses')
          .select(`
            id,
            verse_id,
            start_time_seconds,
            duration_seconds,
            verses!verse_id(verse_number)
          `)
          .eq('media_file_id', currentFile.id)
          .order('start_time_seconds', { ascending: true });

        if (error) {
          console.error('Error fetching verse timestamps:', error);
          return;
        }

        const timestamps: VerseTimestamp[] = (data || []).map(verse => ({
          id: verse.id,
          verse_id: verse.verse_id,
          start_time_seconds: verse.start_time_seconds,
          duration_seconds: verse.duration_seconds,
          verse_number: (verse.verses as { verse_number: number })?.verse_number || 0,
        }));

        setVerseTimestamps(timestamps);
      } catch (error) {
        console.error('Error fetching verse timestamps:', error);
      }
    };

    fetchVerseTimestamps();
  }, [currentFile?.id, setVerseTimestamps]);

  // Update current verse based on time
  useEffect(() => {
    const current = verseTimestamps.find((verse, index) => {
      const nextVerse = verseTimestamps[index + 1];
      return currentTime >= verse.start_time_seconds && 
             (!nextVerse || currentTime < nextVerse.start_time_seconds);
    });
    setCurrentVerse(current || null);
  }, [currentTime, verseTimestamps, setCurrentVerse]);

  // Audio event handlers
  const handlePlay = () => resumePlayback();
  const handlePause = () => pausePlayback();
  const handleLoadStart = () => setLoading(true);
  const handleCanPlay = () => setLoading(false);
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

  // Sync player state with audio element
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

  // Sync current time with audio element
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement && Math.abs(audioElement.currentTime - currentTime) > 1) {
      audioElement.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync volume with audio element
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync playback speed with audio element
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Control functions
  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (duration * parseFloat(e.target.value)) / 100;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    setMuted(false);
  };

  const toggleMute = () => {
    setMuted(!isMuted);
  };

  // Resizing functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setPlayerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [setPlayerWidth, setResizing]);

  // Feedback form handlers
  const handleSubmitFeedback = async () => {
    if (!currentFile || !feedbackVerseNumber || !feedbackText.trim()) {
      toast({ title: 'Please select a verse and enter feedback text', variant: 'error' });
      return;
    }

    // Find the verse ID from verse number
    const selectedVerse = verseTimestamps.find(v => v.verse_number === parseInt(feedbackVerseNumber));
    if (!selectedVerse) {
      toast({ title: 'Invalid verse selection', variant: 'error' });
      return;
    }

    try {
      await createFeedbackMutation.mutateAsync({
        media_files_id: currentFile.id,
        verse_id: selectedVerse.verse_id,
        feedback_type: 'change_required',
        feedback_text: feedbackText.trim()
      });

      setShowFeedbackForm(false);
      setFeedbackVerseNumber('');
      setFeedbackText('');
      refetchFeedback();
      toast({ title: 'Feedback submitted successfully', variant: 'success' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({ title: 'Failed to submit feedback', variant: 'error' });
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await deleteFeedbackMutation.mutateAsync(feedbackId);
      refetchFeedback();
      toast({ title: 'Feedback deleted successfully', variant: 'success' });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({ title: 'Failed to delete feedback', variant: 'error' });
    }
  };

  // File action handlers
  const handleCheckStatusChange = async (status: 'approved' | 'rejected' | 'requires_review') => {
    if (!currentFile) return;

    try {
      await updateCheckStatusMutation.mutateAsync({
        fileId: currentFile.id,
        status
      });
      
      // Update the current file state
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      toast({ title: `Check status updated to ${status}`, variant: 'success' });
    } catch (error) {
      console.error('Error updating check status:', error);
      toast({ title: 'Failed to update check status', variant: 'error' });
    }
  };

  const handlePublishStatusChange = async (status: 'pending' | 'published' | 'archived') => {
    if (!currentFile) return;

    try {
      await updatePublishStatusMutation.mutateAsync({
        fileIds: [currentFile.id],
        status
      });
      
      // Update the current file state
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      toast({ title: `Publish status updated to ${status}`, variant: 'success' });
    } catch (error) {
      console.error('Error updating publish status:', error);
      toast({ title: 'Failed to update publish status', variant: 'error' });
    }
  };

  // Filter feedback
  const filteredFeedback = (verseFeedback || []).filter((feedback: VerseFeedback) => {
    const matchesType = feedbackFilter === 'all' || feedback.feedback_type === feedbackFilter;
    const matchesActioned = actionedFilter === 'all' || feedback.actioned === actionedFilter;
    return matchesType && matchesActioned;
  });

  if (!isVisible || !currentFile) {
    return null;
  }

  return (
    <>
      <div 
        className="fixed inset-y-0 right-0 z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex"
        style={{ width: `${playerWidth}px` }}
        ref={playerRef}
      >
        {/* Resize Handle */}
        <div
          ref={resizeHandleRef}
          className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-primary-500 cursor-col-resize flex-shrink-0 group"
          onMouseDown={handleMouseDown}
        >
          <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-8 bg-white dark:bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audio Player</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePlayer}
              className="h-8 w-8 p-0"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
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

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Title Section */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentFile.filename}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentFile.verse_reference}
                  {currentVerse && (
                    <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
                      • Currently: Verse {currentVerse.verse_number}
                    </span>
                  )}
                </p>
              </CardHeader>
            </Card>

            {/* Audio Controls Section */}
            <Card>
              <CardHeader className="pb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Audio Controls</h4>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div>
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
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipToPreviousVerse}
                    disabled={!verseTimestamps.length}
                  >
                    <BackwardIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="h-12 w-12 rounded-full p-0"
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : isPlaying ? (
                      <PauseIcon className="h-6 w-6" />
                    ) : (
                      <PlayIcon className="h-6 w-6" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipToNextVerse}
                    disabled={!verseTimestamps.length}
                  >
                    <ForwardIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* Volume and Speed Controls */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Volume */}
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Volume</label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        className="h-8 w-8 p-0"
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
                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-primary"
                      />
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Speed</label>
                    <Select
                      value={playbackSpeed.toString()}
                      onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                    >
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </Select>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verse Timestamps Section */}
            {verseTimestamps.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Verse Navigation</h4>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-2">
                    {verseTimestamps.map((verse) => (
                      <Button
                        key={verse.id}
                        variant={currentVerse?.id === verse.id ? "primary" : "outline"}
                        size="sm"
                        onClick={() => jumpToVerse(verse.start_time_seconds)}
                        className="h-8 text-xs"
                      >
                        {verse.verse_number}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Feedback</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Feedback
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feedback Form */}
                {showFeedbackForm && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Verse Number</label>
                      <Select 
                        value={feedbackVerseNumber} 
                        onValueChange={setFeedbackVerseNumber}
                        placeholder="Select verse"
                      >
                        {verseTimestamps.map(verse => (
                          <SelectItem key={verse.id} value={verse.verse_number.toString()}>
                            Verse {verse.verse_number}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Feedback Text</label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Enter your feedback..."
                        className="w-full h-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleSubmitFeedback}>
                        Submit Feedback
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowFeedbackForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Feedback Filters */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
                    <Select value={feedbackFilter} onValueChange={(value: string) => setFeedbackFilter(value as 'all' | 'approved' | 'change_required')}>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="change_required">Change Required</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Status</label>
                    <Select value={actionedFilter} onValueChange={(value: string) => setActionedFilter(value as 'all' | 'pending' | 'actioned' | 'rejected')}>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="actioned">Actioned</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </Select>
                  </div>
                </div>

                {/* Feedback List */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredFeedback.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No feedback found
                    </p>
                  ) : (
                    filteredFeedback.map((feedback: VerseFeedback) => (
                      <div key={feedback.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Verse {feedback.verses.verse_number}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              feedback.feedback_type === 'approved' 
                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                            )}>
                              {feedback.feedback_type === 'approved' ? 'Approved' : 'Change Required'}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              feedback.actioned === 'pending' 
                                ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                                : feedback.actioned === 'actioned'
                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                            )}>
                              {feedback.actioned}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFeedback(feedback.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        {feedback.feedback_text && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {feedback.feedback_text}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          By {feedback.created_by_user?.first_name} {feedback.created_by_user?.last_name} ({feedback.created_by_user?.email || 'Unknown'})
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* File Actions Section */}
            <Card>
              <CardHeader className="pb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">File Actions</h4>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Community Check Actions */}
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">
                    Community Check
                  </label>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCheckStatusConfirm({ show: true, status: 'approved' })}
                      className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCheckStatusConfirm({ show: true, status: 'requires_review' })}
                      className="text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Requires Review
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current status: <span className="font-medium">{currentFile.check_status}</span>
                  </p>
                </div>

                {/* Publish Actions */}
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">
                    Publish Status
                  </label>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPublishStatusConfirm({ show: true, status: 'pending' })}
                      disabled={currentFile.check_status !== 'approved'}
                    >
                      Set Pending
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPublishStatusConfirm({ show: true, status: 'published' })}
                      disabled={currentFile.check_status !== 'approved'}
                      className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400 dark:text-green-400 dark:border-green-600 dark:hover:text-green-300 dark:hover:border-green-500"
                    >
                      Publish
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPublishStatusConfirm({ show: true, status: 'archived' })}
                      className="text-gray-600 hover:text-gray-700 border-gray-300 hover:border-gray-400"
                    >
                      Archive
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current status: <span className="font-medium">{currentFile.publish_status}</span>
                    {currentFile.check_status !== 'approved' && (
                      <span className="text-orange-600"> (Cannot publish before community check approval)</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        open={checkStatusConfirm.show}
        onOpenChange={(open) => setCheckStatusConfirm({ ...checkStatusConfirm, show: open })}
        onConfirm={() => {
          handleCheckStatusChange(checkStatusConfirm.status);
          setCheckStatusConfirm({ ...checkStatusConfirm, show: false });
        }}
        title={`Confirm Check Status Change`}
        description={`Are you sure you want to change the check status to "${checkStatusConfirm.status}"?`}
        confirmText="Confirm"
        variant="warning"
      />

      <ConfirmationModal
        open={publishStatusConfirm.show}
        onOpenChange={(open) => setPublishStatusConfirm({ ...publishStatusConfirm, show: open })}
        onConfirm={() => {
          handlePublishStatusChange(publishStatusConfirm.status);
          setPublishStatusConfirm({ ...publishStatusConfirm, show: false });
        }}
        title={`Confirm Publish Status Change`}
        description={`Are you sure you want to change the publish status to "${publishStatusConfirm.status}"?`}
        confirmText="Confirm"
        variant="warning"
      />
    </>
  );
} 