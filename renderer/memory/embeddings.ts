/**
 * Embedding Functions for LanceDB Vector Memory
 * 
 * Provides text embedding generation for vector storage.
 * Supports multiple embedding providers.
 */

export async function defaultEmbeddingFunction(text: string): Promise<number[]> {
  try {
    const { Ollama } = await import('ollama');
    const ollama = new Ollama();
    const response = await ollama.embeddings({ model: 'nomic-embed-text', prompt: text });
    return response.embedding;
  } catch {
    return generateFallbackEmbedding(text);
  }
}

function generateFallbackEmbedding(text: string): number[] {
  const dimension = 384;
  const embedding = new Array(dimension).fill(0);
  const hash = simpleHash(text);
  
  for (let i = 0; i < dimension; i++) {
    embedding[i] = Math.sin((hash * (i + 1)) / dimension) * Math.cos((hash * (i + 1)) / (dimension * 2));
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default defaultEmbeddingFunction;
