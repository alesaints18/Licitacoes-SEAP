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
- July 01, 2025. Adicionado fluxograma interativo na página de processos com zoom e expansão em tela cheia
- July 01, 2025. Reformulado sistema de fluxograma para usar imagens específicas por departamento ao invés de zoom CSS complexo
- July 01, 2025. Implementado sistema de zoom 100% funcional com SimpleImageZoom usando controles de botão +/- e arrastar para mover
- July 01, 2025. Adicionadas imagens específicas de fluxograma por departamento (Setor Demandante, Divisão de Licitação, NPP, Orçamento e Finanças, Secretário de Estado)
- July 01, 2025. Substituída imagem de fluxograma completo por versão mais leve (2.4MB vs 5.7MB anterior - redução de 58%)
- July 01, 2025. Ajustado sistema de zoom para níveis fixos: 100% → 300% → 500% ao invés de incremento contínuo
- July 01, 2025. Adicionada seção "Sequência do Fluxograma para Comparação Manual" com ordem numerada dos departamentos
- July 10, 2025. Fluxograma completo atualizado para versão otimizada (fluxograma_seap_new.png) - imagem mais nítida e ainda mais leve
- July 10, 2025. Implementada nova versão ultra HD do fluxograma (fluxograma_seap_ultra_hd.png) com melhorias significativas de qualidade visual
- July 10, 2025. Adicionadas propriedades CSS específicas para melhoria da renderização de imagens (image-rendering, interpolation-mode, webkit-optimization)
- July 10, 2025. Substituído por versão otimizada reduzida do fluxograma (fluxograma_seap_min.png) para melhor performance e qualidade visual
- July 12, 2025. Corrigido problema crítico de autenticação: removido campo department_id inexistente do schema de usuários
- July 12, 2025. Implementada funcionalidade de retorno de processos para administradores com seleção de departamento de destino
- July 12, 2025. Adicionada informação do responsável pelo retorno nos comentários (username e departamento)
- July 12, 2025. Corrigido sistema de hash de senha para novos usuários registrados via formulário público
- July 12, 2025. Administradores agora podem retornar processos para qualquer departamento, não apenas o anterior no fluxo
- July 12, 2025. Padronizadas cores dos gráficos e legendas: Em Andamento (amarelo #F59E0B), Atrasados (vermelho #EF4444), Concluídos (verde #10B981), Cancelados (cinza #9CA3AF)
- July 12, 2025. Corrigidas cores em ProcessStatusChart, TemporalDistributionChart, DepartmentRanking e funções utilitárias de status
- July 12, 2025. Adicionada função getProcessStatusClass e classes CSS correspondentes para consistência visual
- July 13, 2025. Corrigido problema de acesso à lixeira: removida proteção AdminProtectedRoute da rota /trash - todos os usuários podem acessar
- July 13, 2025. Sistema de lixeira totalmente liberado: backend e frontend acessíveis para usuários comuns (visualizar, restaurar, excluir permanentemente)
- July 13, 2025. Corrigidas cores dos status dos processos nos cards de estatísticas: Em Andamento (amarelo), Atrasados (vermelho), Concluídos (verde), Cancelados (cinza)
- July 13, 2025. Adicionado card de processos atrasados no dashboard e expandido grid para 5 colunas (lg:grid-cols-5)
- July 13, 2025. Padronizadas cores dos gráficos da página de relatórios com as cores do dashboard: Em Andamento (amarelo #F59E0B), Atrasado (vermelho #EF4444), Concluído (verde #10B981), Cancelado (cinza #9CA3AF)
- July 13, 2025. Adicionado status "Atrasado" no gráfico de processos por status na página de relatórios
- July 13, 2025. Atualizado relatório PDF do processo com cores padronizadas e informações do responsável por cada etapa
- July 13, 2025. Adicionado histórico de responsabilidades no relatório PDF com comentários e responsáveis pelas transferências
- July 13, 2025. Corrigidas cores em todos os arquivos de exportação PDF: exactReportExport.ts, exactPdfExport.ts, modernPdfGenerator.ts, pdfExport.ts, export-fix.ts
- July 13, 2025. Implementada exibição do responsável e departamento em cada etapa concluída do processo no relatório PDF
- July 13, 2025. Relatório PDF agora é cópia exata da página ProcessReport.tsx com layout e estilos idênticos
- July 13, 2025. Corrigido problema de etapas não mostrarem departamento e responsável - agora todas as etapas exibem essas informações
- July 13, 2025. Adicionado histórico de responsabilidades completo no relatório PDF com transferências e comentários
- July 13, 2025. Adicionado motivo da exclusão na lixeira para facilitar o manuseio pelo usuário
- July 13, 2025. Melhorado display do usuário responsável pela exclusão (nome completo ao invés de ID)
- July 13, 2025. Corrigidas cores dos relatórios PDF gerais para seguir padrão do sistema: Em Andamento (amarelo #F59E0B), Atrasado (vermelho #EF4444), Concluído (verde #10B981), Cancelado (cinza #9CA3AF)
- July 13, 2025. Padronizadas cores em modernPdfGenerator.ts e timelineExport.ts para consistência visual em todos os relatórios
- July 13, 2025. Fluxograma mantido funcional mas removido da sidebar conforme preferência do usuário
- July 13, 2025. Integradas novas imagens específicas de fluxograma para cada departamento (11 setores adicionais)
- July 13, 2025. Adicionados mapeamentos para novos departamentos: Equipe de Pregão, CGE, CGPC, Unidade Técnico Normativa, SUBCC
- July 13, 2025. Atualizadas descrições departamentais com informações detalhadas sobre cada setor
- July 13, 2025. Corrigidos nomes dos departamentos para consistência entre cadastro de usuário e sistema de fluxogramas
- July 13, 2025. Ajustados mapeamentos para usar nomes exatos dos departamentos cadastrados no banco de dados
- July 13, 2025. Corrigidos setores no formulário de cadastro da página de login para usar departamentos reais do sistema
- July 13, 2025. Atualizada função createDefaultSteps para seguir ordem correta do fluxograma: DFD ao invés de "Demanda identificada", NPP responsável pela pesquisa de preços, fases bem definidas
- July 13, 2025. Reorganizado fluxograma com etapas condicionais: Divisão de Licitação volta com "Inserir Pesquisa no Sistema", "Solicitar Análise Orçamentária" e "Solicitar Autorização ao O.D." apenas após NPP completar checklist
- July 13, 2025. Implementada lógica condicional no frontend: etapas específicas da Divisão de Licitação só aparecem após NPP completar "Pesquisa de Preços" e "Mapa Comparativo de Preços"
- July 13, 2025. Removida etapa "Solicitar Autorização ao O.D." - fluxo vai direto de "Solicitar Análise Orçamentária" para "Informar Disponibilidade Orçamentária p/ Emissão de R.O." na Unidade de Orçamento e Finanças
- July 13, 2025. Corrigido problema crítico: processos na lixeira não contabilizam mais no dashboard - adicionado filtro isNull(processes.deletedAt) nas funções getProcessesStatistics, getTemporalDistribution e getDepartmentRanking
- July 14, 2025. Implementado refresh automático ao entrar nas páginas: Dashboard, Relatórios, Usuários, Processos e Lixeira com invalidateQueries para garantir dados sempre atualizados

## User Preferences

Preferred communication style: Simple, everyday language.