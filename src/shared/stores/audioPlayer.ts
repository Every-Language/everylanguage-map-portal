import { create } from 'zustand';

export interface MediaFileWithVerseInfo {
  id: string;
  filename: string;
  verse_reference: string;
  book_id: string;
  chapter_id: string;
  start_verse_id: string;
  end_verse_id: string;
  check_status: 'pending' | 'approved' | 'rejected' | 'requires_review';
  publish_status: 'pending' | 'published' | 'archived';
  audio_version_id: string;
  project_id?: string;
  duration_seconds?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VerseTimestamp {
  id: string;
  verse_id: string;
  verse_number: number;
  start_time_seconds: number;
  duration_seconds: number;
}

export interface AudioPlayerState {
  // File and playback state
  currentFile: MediaFileWithVerseInfo | null;
  audioUrl: string | null;
  isVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  playbackSpeed: number;

  // Layout state
  playerWidth: number;
  isResizing: boolean;
  minWidth: number;
  maxWidth: number;

  // Verse tracking
  currentVerse: VerseTimestamp | null;
  verseTimestamps: VerseTimestamp[];

  // Actions
  playFile: (file: MediaFileWithVerseInfo, audioUrl: string) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  closePlayer: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPlaybackSpeed: (speed: number) => void;
  setPlayerWidth: (width: number) => void;
  setResizing: (resizing: boolean) => void;
  setCurrentVerse: (verse: VerseTimestamp | null) => void;
  setVerseTimestamps: (timestamps: VerseTimestamp[]) => void;
  jumpToVerse: (timestamp: number) => void;
  skipForward: () => void;
  skipBackward: () => void;
  skipToNextVerse: () => void;
  skipToPreviousVerse: () => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
  // Initial state
  currentFile: null,
  audioUrl: null,
  isVisible: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isLoading: false,
  error: null,
  playbackSpeed: 1,

  // Layout state
  playerWidth: 400,
  isResizing: false,
  minWidth: 320,
  maxWidth: 800,

  // Verse tracking
  currentVerse: null,
  verseTimestamps: [],

  // Actions
  playFile: (file: MediaFileWithVerseInfo, audioUrl: string) => {
    const { audioUrl: currentAudioUrl } = get();
    
    // Clean up previous blob URL if it exists
    if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudioUrl);
    }
    
    set({
      currentFile: file,
      audioUrl,
      isVisible: true,
      isPlaying: false, // Will be set to true when audio actually starts playing
      currentTime: 0,
      duration: 0,
      isLoading: true,
      error: null, // Clear any previous errors
      currentVerse: null,
      verseTimestamps: [], // Will be loaded separately
    });
  },

  pausePlayback: () => {
    set({ isPlaying: false });
  },

  resumePlayback: () => {
    set({ isPlaying: true });
  },

  stopPlayback: () => {
    set({
      isPlaying: false,
      currentTime: 0,
    });
  },

  closePlayer: () => {
    const { audioUrl } = get();
    
    // Clean up blob URL if it exists
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    
    set({
      currentFile: null,
      audioUrl: null,
      isVisible: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,
      currentVerse: null,
      verseTimestamps: [],
    });
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setDuration: (duration: number) => {
    set({ duration });
  },

  setVolume: (volume: number) => {
    set({ volume, isMuted: volume === 0 });
  },

  setMuted: (muted: boolean) => {
    set({ isMuted: muted });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  setPlayerWidth: (width: number) => {
    const { minWidth, maxWidth } = get();
    const clampedWidth = Math.min(Math.max(width, minWidth), maxWidth);
    set({ playerWidth: clampedWidth });
  },

  setResizing: (resizing: boolean) => {
    set({ isResizing: resizing });
  },

  setCurrentVerse: (verse: VerseTimestamp | null) => {
    set({ currentVerse: verse });
  },

  setVerseTimestamps: (timestamps: VerseTimestamp[]) => {
    set({ verseTimestamps: timestamps });
  },

  jumpToVerse: (timestamp: number) => {
    set({ currentTime: timestamp });
  },

  skipForward: () => {
    const { currentTime, duration } = get();
    const newTime = Math.min(currentTime + 10, duration);
    set({ currentTime: newTime });
  },

  skipBackward: () => {
    const { currentTime } = get();
    const newTime = Math.max(currentTime - 10, 0);
    set({ currentTime: newTime });
  },

  skipToNextVerse: () => {
    const { currentTime, verseTimestamps } = get();
    const nextVerse = verseTimestamps.find(v => v.start_time_seconds > currentTime);
    if (nextVerse) {
      set({ currentTime: nextVerse.start_time_seconds });
    }
  },

  skipToPreviousVerse: () => {
    const { currentTime, verseTimestamps } = get();
    // Find the verse before the current time, but not the current verse
    const previousVerses = verseTimestamps
      .filter(v => v.start_time_seconds < currentTime - 1) // -1 second buffer
      .sort((a, b) => b.start_time_seconds - a.start_time_seconds);
    
    if (previousVerses.length > 0) {
      set({ currentTime: previousVerses[0].start_time_seconds });
    } else {
      // Go to beginning if no previous verse
      set({ currentTime: 0 });
    }
  },
})); 