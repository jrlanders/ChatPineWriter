import { type User, type InsertUser, type Document, type InsertDocument, type Query, type InsertQuery, type ApiLog } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  clearDocuments(): Promise<void>;
  
  createQuery(query: InsertQuery): Promise<Query>;
  getQueries(): Promise<Query[]>;
  updateQuery(id: string, updates: Partial<Query>): Promise<Query | undefined>;
  
  createApiLog(log: Omit<ApiLog, 'id' | 'timestamp'>): Promise<ApiLog>;
  getApiLogs(): Promise<ApiLog[]>;
  clearApiLogs(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private documents: Map<string, Document>;
  private queries: Map<string, Query>;
  private apiLogs: Map<string, ApiLog>;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.queries = new Map();
    this.apiLogs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      embedding: null,
      createdAt: new Date(),
      metadata: insertDocument.metadata || null,
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async clearDocuments(): Promise<void> {
    this.documents.clear();
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = randomUUID();
    const query: Query = {
      ...insertQuery,
      id,
      embedding: null,
      response: null,
      contextDocuments: null,
      similarityScores: null,
      tokensUsed: null,
      responseTime: null,
      createdAt: new Date(),
    };
    this.queries.set(id, query);
    return query;
  }

  async getQueries(): Promise<Query[]> {
    return Array.from(this.queries.values());
  }

  async updateQuery(id: string, updates: Partial<Query>): Promise<Query | undefined> {
    const query = this.queries.get(id);
    if (!query) return undefined;
    
    const updatedQuery = { ...query, ...updates };
    this.queries.set(id, updatedQuery);
    return updatedQuery;
  }

  async createApiLog(log: Omit<ApiLog, 'id' | 'timestamp'>): Promise<ApiLog> {
    const id = randomUUID();
    const apiLog: ApiLog = {
      ...log,
      id,
      timestamp: new Date(),
    };
    this.apiLogs.set(id, apiLog);
    return apiLog;
  }

  async getApiLogs(): Promise<ApiLog[]> {
    return Array.from(this.apiLogs.values()).sort((a, b) => 
      (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    );
  }

  async clearApiLogs(): Promise<void> {
    this.apiLogs.clear();
  }
}

export const storage = new MemStorage();
