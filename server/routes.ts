import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateEmbedding, generateChatResponse, testOpenAIConnection } from "./services/openai";
import { pineconeService } from "./services/pinecone";
import { insertDocumentSchema, insertQuerySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Test connections
  app.get("/api/test-connections", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const [openaiStatus, pineconeStatus] = await Promise.all([
        testOpenAIConnection(),
        pineconeService.testConnection(),
      ]);

      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "GET",
        endpoint: "/api/test-connections",
        status: 200,
        duration: duration / 1000,
      });

      res.json({
        openai: openaiStatus,
        pinecone: pineconeStatus,
        vectorCount: pineconeService.getVectorCount(),
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "GET",
        endpoint: "/api/test-connections",
        status: 500,
        duration: duration / 1000,
      });

      res.status(500).json({ 
        error: "Failed to test connections",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add document to knowledge base
  app.post("/api/documents", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      
      // Generate embedding
      const embeddingResponse = await generateEmbedding(documentData.content);
      
      // Store in local storage
      const document = await storage.createDocument(documentData);
      
      // Store in Pinecone
      const metadata = {
        content: documentData.content,
        category: documentData.category,
        documentId: documentData.documentId,
        createdAt: document.createdAt?.toISOString(),
        ...(documentData.metadata && typeof documentData.metadata === 'object' ? documentData.metadata as Record<string, any> : {}),
      };
      await pineconeService.upsert(document.id, embeddingResponse.embedding, metadata);

      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "POST",
        endpoint: "/api/documents",
        status: 201,
        duration: duration / 1000,
      });

      res.status(201).json({
        document,
        embedding: {
          dimensions: embeddingResponse.dimensions,
          model: embeddingResponse.model,
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "POST",
        endpoint: "/api/documents",
        status: 400,
        duration: duration / 1000,
      });

      res.status(400).json({ 
        error: "Failed to add document",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Process query through RAG pipeline
  app.post("/api/query", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const queryData = insertQuerySchema.parse(req.body);
      
      // Create query record
      const query = await storage.createQuery(queryData);
      
      // Generate embedding for query
      const embeddingResponse = await generateEmbedding(queryData.query);
      
      // Search similar documents in Pinecone
      const topK = parseInt(req.body.topK || "5");
      const threshold = parseFloat(req.body.threshold || "0.7");
      const searchResults = await pineconeService.query(embeddingResponse.embedding, topK, threshold);
      
      // Generate chat response with context
      const chatModel = req.body.chatModel || "gpt-4o";
      const context = searchResults.map(result => result.text);
      const chatResponse = await generateChatResponse(queryData.query, context, chatModel);
      
      // Update query with results
      const updatedQuery = await storage.updateQuery(query.id, {
        embedding: embeddingResponse.embedding,
        response: chatResponse.response,
        contextDocuments: searchResults,
        similarityScores: searchResults.map(r => r.score),
        tokensUsed: chatResponse.tokensUsed,
        responseTime: (Date.now() - startTime) / 1000,
      });

      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "POST",
        endpoint: "/api/query",
        status: 200,
        duration: duration / 1000,
      });

      res.json({
        query: updatedQuery,
        embedding: {
          dimensions: embeddingResponse.dimensions,
          model: embeddingResponse.model,
          preview: embeddingResponse.embedding.slice(0, 10),
        },
        searchResults,
        chatResponse: {
          response: chatResponse.response,
          tokensUsed: chatResponse.tokensUsed,
          model: chatResponse.model,
          contextCount: searchResults.length,
          avgSimilarity: searchResults.length > 0 
            ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length 
            : 0,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "POST",
        endpoint: "/api/query",
        status: 400,
        duration: duration / 1000,
      });

      res.status(400).json({ 
        error: "Failed to process query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get documents
  app.get("/api/documents", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const documents = await storage.getDocuments();
      
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "GET",
        endpoint: "/api/documents",
        status: 200,
        duration: duration / 1000,
      });

      res.json(documents);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "GET",
        endpoint: "/api/documents",
        status: 500,
        duration: duration / 1000,
      });

      res.status(500).json({ 
        error: "Failed to get documents",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Clear knowledge base
  app.delete("/api/documents", async (req, res) => {
    const startTime = Date.now();
    
    try {
      await storage.clearDocuments();
      await pineconeService.deleteAll();
      
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "DELETE",
        endpoint: "/api/documents",
        status: 200,
        duration: duration / 1000,
      });

      res.json({ message: "Knowledge base cleared successfully" });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await storage.createApiLog({
        method: "DELETE",
        endpoint: "/api/documents",
        status: 500,
        duration: duration / 1000,
      });

      res.status(500).json({ 
        error: "Failed to clear knowledge base",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get API logs
  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await storage.getApiLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get API logs",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Clear API logs
  app.delete("/api/logs", async (req, res) => {
    try {
      await storage.clearApiLogs();
      res.json({ message: "API logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to clear API logs",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
