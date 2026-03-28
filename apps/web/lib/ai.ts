import { anthropic } from '@ai-sdk/anthropic'

export const claude = anthropic('claude-sonnet-4-5')

export const claudeWithCache = anthropic('claude-sonnet-4-5', {
  cacheControl: true,
})
