/* eslint-disable react-refresh/only-export-components */
import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock providers for components that need context
interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  // Create a new QueryClient for each test to avoid state pollution
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        staleTime: 0,
        gcTime: 0, // Updated from cacheTime
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Audio testing utilities
export const createMockAudioElement = () => {
  const mockAudio = {
    currentTime: 0,
    duration: 100,
    volume: 1,
    muted: false,
    paused: true,
    ended: false,
    readyState: 4, // HAVE_ENOUGH_DATA
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    canPlayType: vi.fn().mockReturnValue('probably'),
    // Simulate time update events
    simulateTimeUpdate: function(time: number) {
      this.currentTime = time
      const event = new Event('timeupdate')
      this.addEventListener.mock.calls.forEach(([eventType, handler]) => {
        if (eventType === 'timeupdate' && handler) {
          handler(event)
        }
      })
    },
    // Simulate loading events
    simulateLoad: function() {
      const event = new Event('loadeddata')
      this.addEventListener.mock.calls.forEach(([eventType, handler]) => {
        if (eventType === 'loadeddata' && handler) {
          handler(event)
        }
      })
    },
    // Simulate error events
    simulateError: function() {
      const event = new Event('error')
      this.addEventListener.mock.calls.forEach(([eventType, handler]) => {
        if (eventType === 'error' && handler) {
          handler(event)
        }
      })
    }
  }
  
  return mockAudio
}

// Keyboard event helpers
export const pressKey = (key: string, element?: Element) => {
  const target = element || document
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  target.dispatchEvent(event)
}

// Wait for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

// Mock file creation utility
export const createMockFile = (
  name: string = 'test.mp3',
  type: string = 'audio/mpeg',
  size: number = 1024
): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock URL creation for testing file uploads
export const createMockFileURL = (file: File): string => {
  return `blob:${file.name}`
}

// Helper to trigger file drop events
export const createFileDropEvent = (files: File[]) => {
  const dataTransfer = new DataTransfer()
  files.forEach(file => dataTransfer.items.add(file))
  
  return new DragEvent('drop', {
    bubbles: true,
    dataTransfer
  })
}

// Re-export specific testing utilities to avoid fast refresh issues
export { render as renderRTL, screen, fireEvent, waitFor } from '@testing-library/react'
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event' 