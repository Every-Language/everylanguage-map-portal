import type { Database } from '@everylanguage/shared-types';
import type { MediaFileWithVerseInfo } from '@/shared/hooks/query/media-files';

// Database types
export type VerseFeedback = Database['public']['Tables']['verse_feedback']['Row'];
export type VerseFeedbackInsert = Database['public']['Tables']['verse_feedback']['Insert'];
export type VerseFeedbackUpdate = Database['public']['Tables']['verse_feedback']['Update'];

// Enum types from database
export type FeedbackType = Database['public']['Enums']['feedback_type'];
export type FeedbackActioned = Database['public']['Enums']['feedback_actioned'];
export type CheckStatus = Database['public']['Enums']['check_status'];

// Verse timestamp interface (matches what's used in CornerAudioPlayer)
export interface VerseTimestamp {
  id: string;
  verse_id: string;
  start_time_seconds: number;
  duration_seconds: number;
  verse_number: number;
}

// Enhanced interfaces for the UI
export interface MediaFileWithFeedback extends MediaFileWithVerseInfo {
  feedbackCount?: number;
  approvedVersesCount?: number;
  pendingVersesCount?: number;
  changesRequiredCount?: number;
}

export interface VerseWithFeedback extends VerseTimestamp {
  feedback?: VerseFeedback[];
  latestFeedback?: VerseFeedback;
  feedbackStatus: 'pending' | 'approved' | 'change_required';
  hasMultipleFeedback: boolean;
}

export interface VerseFeedbackWithUser extends VerseFeedback {
  created_by_user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  updated_by_user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

// UI State types
export type CheckingMode = 'table' | 'checking';

export interface CheckingWorkflowState {
  mode: CheckingMode;
  selectedFile: MediaFileWithFeedback | null;
  currentVerseIndex: number;
  selectedVerses: string[]; // verse IDs for bulk operations
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
}

// Bulk operation types
export interface BulkFeedbackOperation {
  verseIds: string[];
  mediaFileId: string;
  feedbackType: FeedbackType;
  feedbackText?: string;
}

export interface FileStatusUpdateData {
  mediaFileId: string;
  newStatus: CheckStatus;
  reason?: string;
}

// Feedback creation/update types
export interface CreateVerseFeedbackData {
  media_files_id: string;
  verse_id: string;
  feedback_type: FeedbackType;
  feedback_text?: string;
}

export interface UpdateVerseFeedbackData {
  id: string;
  feedback_type?: FeedbackType;
  feedback_text?: string;
  actioned?: FeedbackActioned;
} 