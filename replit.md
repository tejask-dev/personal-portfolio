# Portfolio Website

## Overview

This is a modern, responsive portfolio website built with React, TypeScript, and Node.js. It features a clean design with smooth animations and a professional presentation of personal information, projects, blog posts, and contact capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and build processes
- **UI Library**: Radix UI components with custom styling
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Animations**: Framer Motion for smooth transitions and interactions
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API**: RESTful API with JSON responses
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error handling middleware

## Key Components

### Database Schema
- **Users**: Basic user authentication (id, username, password)
- **Contacts**: Contact form submissions (name, email, subject, message)
- **Blog Posts**: Blog content management (title, slug, content, tags, publish date)
- **Projects**: Portfolio projects (title, description, technologies, category, featured status)

### Frontend Components
- **Navigation**: Fixed navigation with smooth scrolling
- **Hero Section**: Landing area with personal introduction
- **About Section**: Skills and background information
- **Resume Section**: Education and experience timeline
- **Portfolio Section**: Filterable project showcase
- **Blog Section**: Article listings with metadata
- **Contact Section**: Contact form and social links
- **Footer**: Site footer with additional links

### API Endpoints
- `POST /api/contact` - Submit contact form
- `GET /api/contacts` - Retrieve all contacts (admin)
- `GET /api/blog` - Get all blog posts
- `GET /api/blog/:slug` - Get specific blog post
- `GET /api/projects` - Get all projects (implied from frontend usage)

## Data Flow

1. **Frontend Requests**: React components use React Query to fetch data from API endpoints
2. **API Processing**: Express routes handle requests, validate data with Zod schemas
3. **Database Operations**: Drizzle ORM manages database interactions with PostgreSQL
4. **Response Handling**: API returns JSON responses with proper error handling
5. **UI Updates**: React Query manages cache invalidation and UI updates

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **framer-motion**: Animation library
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **tailwindcss**: Utility-first CSS framework

### UI Components
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **lucide-react**: Icon library
- **class-variance-authority**: Utility for building variant-based component APIs
- **clsx**: Utility for constructing className strings

## Deployment Strategy

### Development Setup
- Development server runs on Node.js with hot module replacement via Vite
- Database migrations managed through Drizzle Kit
- Environment variables required: `DATABASE_URL`

### Build Process
1. Frontend built with Vite to `dist/public` directory
2. Backend bundled with esbuild to `dist/index.js`
3. Static assets served from build directory in production

### Production Deployment
- Single Node.js server serves both API and static files
- Database connection via Neon Database serverless PostgreSQL
- Environment-specific configuration through environment variables

### Key Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run db:push`: Push database schema changes

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and a focus on developer experience and performance.