import { create } from 'zustand';
import type { MediaFileWithVerseInfo } from '../hooks/query/media-files';

export interface AudioPlayerState {
  // Current playback
  currentFile: MediaFileWithVerseInfo | null;
  audioUrl: string | null;
  isVisible: boolean;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
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
  skipForward: () => void;
  skipBackward: () => void;
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

  // Actions
  playFile: (file: MediaFileWithVerseInfo, audioUrl: string) => {
    set({
      currentFile: file,
      audioUrl,
      isVisible: true,
      isPlaying: false, // Will be set to true when audio actually starts playing
      currentTime: 0,
      duration: 0,
      isLoading: true,
      error: null, // Clear any previous errors
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
    set({
      currentFile: null,
      audioUrl: null,
      isVisible: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,
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
})); 