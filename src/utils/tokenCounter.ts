// Simple token counter using character-based estimation
// Approximation: ~4 characters per token
const CHARS_PER_TOKEN = 4;

export const CONTEXT_WINDOW = 4096; // 4K tokens

export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function calculateTokenStats(
  messages: Array<{ content: string }>,
  reasoning: string[]
): {
  total: number;
  reason: number;
  window: number;
  percentage: number;
} {
  const windowTokens = messages.reduce((sum, msg) => sum + countTokens(msg.content), 0);
  const reasonTokens = countTokens(reasoning.join(" "));
  const totalTokens = windowTokens + reasonTokens;
  const percentage = (windowTokens / CONTEXT_WINDOW) * 100;

  return {
    total: totalTokens,
    reason: reasonTokens,
    window: windowTokens,
    percentage: Math.round(percentage),
  };
}
