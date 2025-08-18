# AI-Powered Document Search Application

## Overview

This is a full-stack application that implements an AI-powered document search and query system using vector embeddings and semantic similarity. The system allows users to upload documents, generate embeddings for semantic search, and query the knowledge base using natural language. It features a React frontend with shadcn/ui components, an Express.js backend, PostgreSQL database with Drizzle ORM, and integrates with OpenAI for embeddings and chat completion.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Components**: shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management, caching, and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Database**: PostgreSQL with Neon serverless driver for cloud deployment
- **Session Management**: Express sessions with PostgreSQL session store
- **Build System**: esbuild for fast server-side bundling and tsx for development

### Data Storage Solutions
- **Primary Database**: PostgreSQL with tables for users, documents, queries, and API logs
- **Vector Storage**: Mock Pinecone implementation for vector similarity search (in-memory during development)
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple
- **Development Storage**: In-memory storage implementation for rapid prototyping

### Authentication and Authorization
- Basic user authentication system with username/password stored in PostgreSQL
- Session-based authentication using Express sessions
- No external authentication providers currently integrated

### External Dependencies
- **OpenAI API**: For generating text embeddings (text-embedding-3-small) and chat completions (gpt-4o)
- **Neon Database**: Serverless PostgreSQL database hosting
- **Pinecone**: Vector database for similarity search (mocked in current implementation)
- **Drizzle Kit**: Database migration and schema management tools
- **Radix UI**: Headless UI component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TanStack Query**: Server state management and caching library
- **Zod**: TypeScript-first schema validation library

The application follows a clean separation between client and server code, with shared schema definitions for type safety across the full stack. The architecture supports both development and production environments with appropriate build processes and error handling.