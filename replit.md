# Sistema de Controle de Processos de Licitação

## Overview

The Sistema de Controle de Processos de Licitação is a web application developed for the Secretaria de Administração Penitenciária (Prison Administration Secretariat) in Paraíba, Brazil. It manages and monitors bidding processes (licitações) throughout their lifecycle, providing comprehensive tracking, workflow management, and reporting capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Shadcn UI library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript for type safety
- **API Design**: RESTful API with WebSocket support for real-time updates
- **Session Management**: Express sessions with secure cookie handling
- **Authentication**: Passport.js with local strategy
- **Password Security**: Bcrypt for password hashing

### Data Storage Solutions
- **Primary Database**: PostgreSQL managed through Drizzle ORM
- **Migration System**: Drizzle Kit for schema migrations
- **Connection**: Neon serverless PostgreSQL with WebSocket support
- **Schema**: Strongly typed database schema with Zod validation

## Key Components

### 1. User Management System
- Role-based access control (admin/common users)
- Department-based process visibility
- Secure authentication with password encryption
- User approval workflow for new registrations

### 2. Process Management
- Complete bidding process lifecycle tracking
- Department-based workflow routing
- Deadline monitoring with automated alerts
- Process status tracking (draft, in_progress, completed, canceled, overdue)
- Priority levels (low, medium, high)

### 3. Bidding Modalities & Workflow
- Support for different bidding types (Pregão Eletrônico, Tomada de Preços, etc.)
- Customizable workflow steps for each modality
- Automated step creation based on modality selection
- Department responsibility assignment

### 4. Analytics & Reporting
- Real-time dashboard with process statistics
- Monthly goal tracking and progress monitoring
- Resource distribution analysis
- Department performance rankings
- Temporal distribution charts
- Individual process report generation (HTML-based for browser printing to PDF)

### 5. Real-time Features
- WebSocket integration for live updates
- Notification system for deadlines and updates
- Process transfer notifications
- Real-time data synchronization across clients

## Data Flow

### Process Creation Flow
1. User creates process in "Setor Demandante" (requesting department)
2. System automatically generates default workflow steps based on modality
3. Process moves through departments following predefined workflow
4. Each step can be marked complete with responsible user assignment
5. Deadline tracking begins immediately with automated alerts

### Department Visibility Rules
- **Admin users**: Full access to all processes across departments
- **Common users**: Restricted access to processes within their department
- **Transfer mechanism**: Processes move between departments following workflow
- **Return capability**: Processes can be returned to previous departments with comments

### Authentication & Authorization
1. User login with username/password
2. Session creation with secure cookies
3. Role-based route protection
4. Department-based data filtering
5. Admin-only access to sensitive operations

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management
- **express**: Web server framework
- **drizzle-orm**: Type-safe database operations
- **@neondatabase/serverless**: PostgreSQL connection
- **passport**: Authentication middleware
- **bcrypt**: Password hashing

### UI & Styling Dependencies
- **@radix-ui/***: Primitive UI components
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **recharts**: Chart visualization library
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution
- **esbuild**: Fast bundling for production

## Deployment Strategy

### Production Build Process
1. Frontend build with Vite: `npm run build`
2. Backend compilation with esbuild: TypeScript to ESM
3. Static assets served from `dist/public`
4. Server bundle output to `dist/index.js`

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Secure session encryption key
- **NODE_ENV**: Environment mode (development/production)
- **PORT**: Server port (default: 5000)

### Security Considerations
- Secure session management with HTTP-only cookies
- Password hashing with bcrypt
- Role-based access control
- Department-based data isolation
- CORS and security headers configuration

### WebSocket Setup
- Real-time communication for process updates
- Client reconnection handling
- Broadcast messaging for multi-user scenarios
- Integration with existing HTTP session management

## Changelog
- July 01, 2025. Initial setup
- July 01, 2025. Implementada geração de relatório PDF usando impressão do navegador (solução compatível com ambiente Replit)

## User Preferences

Preferred communication style: Simple, everyday language.