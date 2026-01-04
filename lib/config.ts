export const AI_CONFIG = {
  ollamaBaseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'qwen3-vl:8b',
};
