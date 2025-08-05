import { useState } from 'react';
import { 
  useCreateVerseFeedback, 
  useUpdateVerseFeedback,
  useVerseFeedbackByVerse 
} from '@/shared/hooks/query/verse-feedback';
import type { VerseTimestamp, FeedbackType } from '../../types';
import { Button } from '@/shared/design-system/components/Button';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';

interface VerseWithFeedbackProps {
  verse: VerseTimestamp;
  mediaFileId: string;
  isCurrentVerse?: boolean;
  onJumpToVerse?: (timestamp: number) => void;
}

export function VerseWithFeedback({ 
  verse, 
  mediaFileId, 
  isCurrentVerse, 
  onJumpToVerse 
}: VerseWithFeedbackProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch existing feedback for this verse
  const { data: existingFeedback = [] } = useVerseFeedbackByVerse(verse.verse_id, mediaFileId);
  
  // Get the latest feedback (highest version)
  const latestFeedback = existingFeedback && existingFeedback.length > 0 ? existingFeedback[0] : null;
  
  // Mutations for creating/updating feedback
  const createFeedbackMutation = useCreateVerseFeedback();
  const updateFeedbackMutation = useUpdateVerseFeedback();

  // Determine feedback status
  const getFeedbackStatus = () => {
    if (!latestFeedback) return 'pending';
    return latestFeedback.feedback_type;
  };

  const feedbackStatus = getFeedbackStatus();

  // Handle feedback submission
  const handleSubmitFeedback = async (feedbackType: FeedbackType) => {
    try {
      if (latestFeedback) {
        // Update existing feedback
        await updateFeedbackMutation.mutateAsync({
          id: latestFeedback.id,
          feedback_type: feedbackType,
          feedback_text: feedbackText || undefined,
        });
      } else {
        // Create new feedback
        await createFeedbackMutation.mutateAsync({
          media_files_id: mediaFileId,
          verse_id: verse.verse_id,
          feedback_type: feedbackType,
          feedback_text: feedbackText || undefined,
        });
      }
      
      // Clear feedback text after submission
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Get status styling
  const getStatusStyling = () => {
    switch (feedbackStatus) {
      case 'approved':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          icon: CheckCircleIcon,
        };
      case 'change_required':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-800 dark:text-orange-200',
          icon: ExclamationTriangleIcon,
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-600 dark:text-gray-400',
          icon: ClockIcon,
        };
    }
  };

  const statusStyling = getStatusStyling();
  const StatusIcon = statusStyling.icon;

  // Format time display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isLoading = createFeedbackMutation.isPending || updateFeedbackMutation.isPending;

  return (
    <div className={`
      rounded-lg border p-4 transition-all duration-200
      ${isCurrentVerse ? 'ring-2 ring-primary-500 ring-opacity-50' : ''}
      ${statusStyling.bg} ${statusStyling.border}
    `}>
      {/* Verse Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onJumpToVerse?.(verse.start_time_seconds)}
            className="flex items-center space-x-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span className="font-semibold text-lg">Verse {verse.verse_number}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(verse.start_time_seconds)}
            </span>
          </button>
          {isCurrentVerse && (
            <div className="flex items-center space-x-1 text-primary-600 dark:text-primary-400">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">PLAYING</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-5 w-5 ${statusStyling.text}`} />
          <span className={`text-sm font-medium capitalize ${statusStyling.text}`}>
            {feedbackStatus === 'change_required' ? 'Changes Required' : feedbackStatus}
          </span>
        </div>
      </div>

      {/* Feedback Actions */}
      <div className="flex items-center space-x-2 mb-3">
        <Button
          variant={feedbackStatus === 'approved' ? 'success' : 'outline'}
          size="sm"
          onClick={() => handleSubmitFeedback('approved')}
          disabled={isLoading}
          className="flex items-center space-x-1"
        >
          <CheckCircleIcon className="h-4 w-4" />
          <span>Approve</span>
        </Button>

        <Button
          variant={feedbackStatus === 'change_required' ? 'warning' : 'outline'}
          size="sm"
          onClick={() => handleSubmitFeedback('change_required')}
          disabled={isLoading}
          className="flex items-center space-x-1"
        >
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Suggest Change</span>
        </Button>

        {existingFeedback && existingFeedback.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1"
          >
            <ChatBubbleLeftIcon className="h-4 w-4" />
            <span>History ({existingFeedback.length})</span>
          </Button>
        )}
      </div>

      {/* Feedback Text Input */}
      <div className="space-y-2">
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Add feedback notes (optional)..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
          rows={2}
        />
        
        {feedbackText && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (latestFeedback) {
                  handleSubmitFeedback(latestFeedback.feedback_type);
                }
              }}
              disabled={isLoading || !latestFeedback}
              className="text-xs"
            >
              Update Note
            </Button>
          </div>
        )}
      </div>

      {/* Latest Feedback Display */}
      {latestFeedback?.feedback_text && (
        <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
          <p className="text-gray-700 dark:text-gray-300">{latestFeedback.feedback_text}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Version {latestFeedback.version} • 
            {latestFeedback.updated_at && new Date(latestFeedback.updated_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* Feedback History (Expandable) */}
      {isExpanded && existingFeedback && existingFeedback.length > 1 && (
        <div className="mt-3 space-y-2">
          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Feedback History
          </h5>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {existingFeedback.slice(1).map((feedback) => (
              <div key={feedback.id} className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium capitalize ${
                    feedback.feedback_type === 'approved' ? 'text-green-600 dark:text-green-400' : 
                    'text-orange-600 dark:text-orange-400'
                  }`}>
                    {feedback.feedback_type === 'change_required' ? 'Changes Required' : feedback.feedback_type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    v{feedback.version}
                  </span>
                </div>
                {feedback.feedback_text && (
                  <p className="text-gray-700 dark:text-gray-300 mb-1">{feedback.feedback_text}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {feedback.created_at && new Date(feedback.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-2 flex items-center justify-center">
          <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
} 