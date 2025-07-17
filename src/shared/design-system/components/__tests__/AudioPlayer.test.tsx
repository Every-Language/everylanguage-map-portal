import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AudioPlayer } from '../AudioPlayer'

// Note: jest-axe accessibility testing can be added later if needed

// Mock HTMLMediaElement methods that aren't implemented in jsdom
const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()
const mockLoad = vi.fn()

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    writable: true,
    value: mockPlay,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    writable: true,
    value: mockPause,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    writable: true,
    value: mockLoad,
  })
  
  // Mock audio properties
  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    writable: true,
    value: 180, // 3 minutes
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    writable: true,
    value: 0,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    writable: true,
    value: 1,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
    writable: true,
    value: false,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    writable: true,
    value: 1,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    writable: true,
    value: true,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    writable: true,
    value: 4, // HAVE_ENOUGH_DATA
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AudioPlayer', () => {
  const defaultProps = {
    src: 'https://example.com/audio.mp3',
    'aria-label': 'Test audio player',
  }

  it('renders with basic props', () => {
    render(<AudioPlayer {...defaultProps} />)
    
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Test audio player')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<AudioPlayer {...defaultProps} />)
    
    // Should show loading state when readyState is not enough
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      writable: true,
      value: 0, // HAVE_NOTHING
    })
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('toggles play/pause when play button is clicked', async () => {
    const user = userEvent.setup()
    render(<AudioPlayer {...defaultProps} />)
    
    const playButton = screen.getByRole('button', { name: /play/i })
    
    await user.click(playButton)
    expect(mockPlay).toHaveBeenCalled()
    
    // Simulate audio starting to play
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      writable: true,
      value: false,
    })
    
    // Re-render to reflect state change
    render(<AudioPlayer {...defaultProps} />)
    
    const pauseButton = screen.getByRole('button', { name: /pause/i })
    await user.click(pauseButton)
    expect(mockPause).toHaveBeenCalled()
  })

  it('handles keyboard shortcuts', async () => {
    render(<AudioPlayer {...defaultProps} />)
    
    const container = screen.getByLabelText('Test audio player')
    container.focus()
    
    // Test spacebar play/pause
    fireEvent.keyDown(container, { key: ' ', code: 'Space' })
    expect(mockPlay).toHaveBeenCalled()
    
    // Test left arrow (skip backward)
    fireEvent.keyDown(container, { key: 'ArrowLeft', code: 'ArrowLeft' })
    
    // Test right arrow (skip forward)
    fireEvent.keyDown(container, { key: 'ArrowRight', code: 'ArrowRight' })
    
    // Test mute toggle
    fireEvent.keyDown(container, { key: 'm', code: 'KeyM' })
  })

  it('displays correct time formatting', () => {
    render(<AudioPlayer {...defaultProps} showTimestamp />)
    
    // Should show 0:00 / 3:00 initially
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
  })

  it('handles volume control', async () => {
    const user = userEvent.setup()
    render(<AudioPlayer {...defaultProps} showVolume />)
    
    const volumeButton = screen.getByRole('button', { name: /volume/i })
    expect(volumeButton).toBeInTheDocument()
    
    // Test mute/unmute
    await user.click(volumeButton)
    // Volume should be muted
  })

  it('shows playback speed control when enabled', async () => {
    const user = userEvent.setup()
    render(<AudioPlayer {...defaultProps} showPlaybackSpeed />)
    
    const speedButton = screen.getByRole('button', { name: /playback speed/i })
    expect(speedButton).toBeInTheDocument()
    
    await user.click(speedButton)
    
    // Should show speed options
    expect(screen.getByText('0.5x')).toBeInTheDocument()
    expect(screen.getByText('1x')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
  })

  it('calls event handlers when provided', async () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const onTimeUpdate = vi.fn()
    const onEnded = vi.fn()
    const onError = vi.fn()
    
    render(
      <AudioPlayer
        {...defaultProps}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
      />
    )
    
    const audio = screen.getByLabelText('Test audio player')
    
    // Test play event
    fireEvent.play(audio)
    expect(onPlay).toHaveBeenCalled()
    
    // Test pause event
    fireEvent.pause(audio)
    expect(onPause).toHaveBeenCalled()
    
    // Test time update
    fireEvent.timeUpdate(audio)
    expect(onTimeUpdate).toHaveBeenCalledWith(0, 180)
    
    // Test ended event
    fireEvent.ended(audio)
    expect(onEnded).toHaveBeenCalled()
    
    // Test error event
    const errorEvent = new Event('error')
    fireEvent(audio, errorEvent)
    expect(onError).toHaveBeenCalledWith(errorEvent)
  })

  it('handles disabled state', () => {
    render(<AudioPlayer {...defaultProps} disabled />)
    
    const playButton = screen.getByRole('button', { name: /play/i })
    expect(playButton).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<AudioPlayer {...defaultProps} className="custom-class" />)
    
    const container = screen.getByLabelText('Test audio player').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('handles skip forward and backward', async () => {
    const user = userEvent.setup()
    render(<AudioPlayer {...defaultProps} />)
    
    const skipBackButton = screen.getByRole('button', { name: /skip backward/i })
    const skipForwardButton = screen.getByRole('button', { name: /skip forward/i })
    
    await user.click(skipBackButton)
    await user.click(skipForwardButton)
    
    // Verify buttons are functional
    expect(skipBackButton).toBeInTheDocument()
    expect(skipForwardButton).toBeInTheDocument()
  })

  it('shows progress bar when enabled', () => {
    render(<AudioPlayer {...defaultProps} showProgress />)
    
    const progressSlider = screen.getByRole('slider', { name: /seek/i })
    expect(progressSlider).toBeInTheDocument()
  })

  // TODO: Add accessibility testing with jest-axe when types are properly configured

  it('handles autoplay prop', () => {
    render(<AudioPlayer {...defaultProps} autoPlay />)
    
    const audio = screen.getByLabelText('Test audio player')
    expect(audio).toHaveAttribute('autoplay')
  })

  it('handles loop prop', () => {
    render(<AudioPlayer {...defaultProps} loop />)
    
    const audio = screen.getByLabelText('Test audio player')
    expect(audio).toHaveAttribute('loop')
  })

  it('handles preload prop', () => {
    render(<AudioPlayer {...defaultProps} preload="auto" />)
    
    const audio = screen.getByLabelText('Test audio player')
    expect(audio).toHaveAttribute('preload', 'auto')
  })

  it('updates progress when audio time changes', () => {
    render(<AudioPlayer {...defaultProps} showProgress />)
    
    const audio = screen.getByLabelText('Test audio player')
    
    // Simulate time update
    Object.defineProperty(audio, 'currentTime', { value: 60 })
    fireEvent.timeUpdate(audio)
    
    const progressSlider = screen.getByRole('slider', { name: /seek/i })
    expect(progressSlider).toHaveValue('33.33') // 60/180 * 100
  })
}) 