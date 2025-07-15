import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Settings,
  Loader2
} from 'lucide-react'
import { Button } from './Button'
import { Slider } from './Slider'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { cn } from '../utils'

export interface AudioPlayerProps {
  src: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onLoadStart?: () => void
  onLoadedData?: () => void
  onError?: (error: Event) => void
  showVolume?: boolean
  showPlaybackSpeed?: boolean
  showTimestamp?: boolean
  showProgress?: boolean
  disabled?: boolean
  'aria-label'?: string
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const SKIP_SECONDS = 5

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  className,
  autoPlay = false,
  loop = false,
  preload = 'metadata',
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onLoadStart,
  onLoadedData,
  onError,
  showVolume = true,
  showPlaybackSpeed = true,
  showTimestamp = true,
  showProgress = true,
  disabled = false,
  'aria-label': ariaLabel = 'Audio player'
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Format time in mm:ss or hh:mm:ss format
  const formatTime = useCallback((time: number): string => {
    if (isNaN(time) || time < 0) return '00:00'
    
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Play/pause toggle
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || disabled) return

    try {
      if (isPlaying) {
        await audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error)
      setError('Failed to play audio')
    }
  }, [isPlaying, disabled])

  // Skip forward/backward
  const skipForward = useCallback(() => {
    if (!audioRef.current || disabled) return
    const newTime = Math.min(audioRef.current.currentTime + SKIP_SECONDS, duration)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration, disabled])

  const skipBackward = useCallback(() => {
    if (!audioRef.current || disabled) return
    const newTime = Math.max(audioRef.current.currentTime - SKIP_SECONDS, 0)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [disabled])

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (!audioRef.current || disabled) return
    const clampedTime = Math.max(0, Math.min(time, duration))
    audioRef.current.currentTime = clampedTime
    setCurrentTime(clampedTime)
  }, [duration, disabled])

  // Volume control
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!audioRef.current) return
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    audioRef.current.volume = clampedVolume
    setVolume(clampedVolume)
    setIsMuted(clampedVolume === 0)
  }, [])

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    if (isMuted) {
      audioRef.current.volume = volume || 0.5
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume])

  // Playback speed control
  const handlePlaybackSpeedChange = useCallback((speed: number) => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  // Progress bar interaction
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || disabled || !duration) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = (event.clientX - rect.left) / rect.width
    const newTime = percentage * duration
    seekTo(newTime)
  }, [seekTo, duration, disabled])

  // Progress bar drag handling
  const handleProgressMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    setIsDragging(true)
    handleProgressClick(event)
  }, [handleProgressClick, disabled])

  const handleProgressMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !progressRef.current || disabled) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const newTime = percentage * duration
    seekTo(newTime)
  }, [isDragging, seekTo, duration, disabled])

  const handleProgressMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return
    
    // Only handle shortcuts if audio player is focused or no input is focused
    const activeElement = document.activeElement
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        togglePlayPause()
        break
      case 'ArrowLeft':
        event.preventDefault()
        skipBackward()
        break
      case 'ArrowRight':
        event.preventDefault()
        skipForward()
        break
      case 'ArrowUp':
        event.preventDefault()
        handleVolumeChange(Math.min(1, volume + 0.1))
        break
      case 'ArrowDown':
        event.preventDefault()
        handleVolumeChange(Math.max(0, volume - 0.1))
        break
      case 'KeyM':
        event.preventDefault()
        toggleMute()
        break
    }
  }, [togglePlayPause, skipBackward, skipForward, handleVolumeChange, volume, toggleMute, disabled])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }

    const handleTimeUpdate = () => {
      if (!isDragging) {
        const current = audio.currentTime
        setCurrentTime(current)
        onTimeUpdate?.(current, duration)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
      onLoadedData?.()
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setError(null)
      onLoadStart?.()
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleError = (event: Event) => {
      setIsLoading(false)
      setError('Failed to load audio')
      onError?.(event)
    }

    const handleVolumeChange = () => {
      setVolume(audio.volume)
      setIsMuted(audio.muted)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('volumechange', handleVolumeChange)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [isDragging, duration, onPlay, onPause, onTimeUpdate, onLoadedData, onLoadStart, onEnded, onError])

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Mouse event listeners for progress bar dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleProgressMouseMove)
      document.addEventListener('mouseup', handleProgressMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleProgressMouseMove)
        document.removeEventListener('mouseup', handleProgressMouseUp)
      }
    }
  }, [isDragging, handleProgressMouseMove, handleProgressMouseUp])

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div 
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
        className
      )}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        preload={preload}
        loop={loop}
        autoPlay={autoPlay}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Progress bar */}
      {showProgress && (
        <div className="mb-4">
          <div
            ref={progressRef}
            className={cn(
              'h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative',
              'hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            role="progressbar"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-label="Audio progress"
          >
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full shadow-md',
                'transform -translate-x-1/2 transition-all duration-150',
                isDragging && 'scale-125'
              )}
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center gap-2 mb-4">
        {/* Play/Pause button */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          disabled={disabled || isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Skip backward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={skipBackward}
          disabled={disabled}
          aria-label={`Skip backward ${SKIP_SECONDS} seconds`}
          className="flex-shrink-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Skip forward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={skipForward}
          disabled={disabled}
          aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
          className="flex-shrink-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Volume control */}
        {showVolume && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              disabled={disabled}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="hidden sm:block w-20">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={(value) => handleVolumeChange(value[0] / 100)}
                max={100}
                step={1}
                disabled={disabled}
                aria-label="Volume"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Playback speed control */}
        {showPlaybackSpeed && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label="Playback speed"
                className="flex-shrink-0"
              >
                <Settings className="h-4 w-4" />
                <span className="ml-1 text-xs">{playbackSpeed}x</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40">
              <div className="grid gap-2">
                <p className="text-sm font-medium">Playback Speed</p>
                {PLAYBACK_SPEEDS.map((speed) => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handlePlaybackSpeedChange(speed)}
                    className="justify-start"
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Time display */}
        {showTimestamp && (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 font-mono ml-auto">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p className="font-medium">Keyboard shortcuts:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <span>Space: Play/Pause</span>
          <span>← →: Skip ±{SKIP_SECONDS}s</span>
          <span>↑ ↓: Volume ±10%</span>
          <span>M: Mute/Unmute</span>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer 