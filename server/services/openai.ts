import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
}

export interface ChatResponse {
  response: string;
  tokensUsed: number;
  model: string;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    dimensions: response.data[0].embedding.length,
    model: "text-embedding-3-small",
  };
}

export async function generateChatResponse(
  query: string, 
  context: string[], 
  model: string = "gpt-4o"
): Promise<ChatResponse> {
  const contextText = context.length > 0 
    ? `Context from knowledge base:\n${context.join('\n\n')}\n\n`
    : '';

  const prompt = `${contextText}User question: ${query}

Please provide a comprehensive answer based on the provided context. If context is provided, reference it in your response. If no relevant context is available, provide a helpful general answer.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return {
    response: response.choices[0].message.content || "",
    tokensUsed: response.usage?.total_tokens || 0,
    model,
  };
}

export async function testOpenAIConnection(): Promise<boolean> {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error("OpenAI connection failed:", error);
    return false;
  }
}
