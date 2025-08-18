import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  category: text("category").notNull(),
  documentId: text("document_id").notNull(),
  embedding: real("embedding").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const queries = pgTable("queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  embedding: real("embedding").array(),
  response: text("response"),
  contextDocuments: jsonb("context_documents"),
  similarityScores: real("similarity_scores").array(),
  tokensUsed: integer("tokens_used"),
  responseTime: real("response_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  status: integer("status").notNull(),
  duration: real("duration").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  content: true,
  category: true,
  documentId: true,
  metadata: true,
});

export const insertQuerySchema = createInsertSchema(queries).pick({
  query: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;
export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
