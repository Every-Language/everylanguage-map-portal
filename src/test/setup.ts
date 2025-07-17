/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import { vi, beforeAll, afterAll } from 'vitest'

// Mock Intersection Observer for components that use it
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: class MockIntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

// Mock ResizeObserver for components that use it
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: class MockResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock HTMLMediaElement for audio/video testing
window.HTMLMediaElement.prototype.load = vi.fn()
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
window.HTMLMediaElement.prototype.pause = vi.fn()
window.HTMLMediaElement.prototype.fastSeek = vi.fn()

// Mock Audio constructor
Object.defineProperty(global, 'Audio', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    currentTime: 0,
    duration: 100,
    volume: 1,
    muted: false,
    paused: true,
    ended: false,
    readyState: 4, // HAVE_ENOUGH_DATA
  }))
})

// Mock fetch for API testing
global.fetch = vi.fn()

// Silence console warnings/errors in tests unless explicitly testing them
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:') &&
      (args[0].includes('ReactDOM.render') || args[0].includes('act'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
}) 