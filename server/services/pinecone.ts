interface PineconeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

interface PineconeQueryResponse {
  matches: PineconeMatch[];
}

export interface SimilaritySearchResult {
  id: string;
  score: number;
  text: string;
  category: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Mock Pinecone implementation using in-memory similarity search
export class PineconeService {
  private vectors: Map<string, { embedding: number[]; metadata: any }> = new Map();

  async upsert(id: string, embedding: number[], metadata: any): Promise<void> {
    this.vectors.set(id, { embedding, metadata });
  }

  async query(embedding: number[], topK: number = 5, threshold: number = 0.7): Promise<SimilaritySearchResult[]> {
    const results: { id: string; score: number; metadata: any }[] = [];

    for (const [id, vector] of Array.from(this.vectors.entries())) {
      const score = this.cosineSimilarity(embedding, vector.embedding);
      if (score >= threshold) {
        results.push({ id, score, metadata: vector.metadata });
      }
    }

    // Sort by score descending and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    return topResults.map(result => ({
      id: result.id,
      score: result.score,
      text: result.metadata.content || "",
      category: result.metadata.category || "unknown",
      timestamp: result.metadata.createdAt || new Date().toISOString(),
      metadata: result.metadata,
    }));
  }

  async deleteAll(): Promise<void> {
    this.vectors.clear();
  }

  async testConnection(): Promise<boolean> {
    // For mock implementation, always return true
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  getVectorCount(): number {
    return this.vectors.size;
  }
}

export const pineconeService = new PineconeService();
