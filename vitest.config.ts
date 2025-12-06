import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['node_modules', 'e2e/**/*'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/verovio.d.ts', 'e2e/'],
    },
  },
})
