import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Automatically unmount and clean up rendered components after each test
afterEach(() => {
  cleanup()
})
