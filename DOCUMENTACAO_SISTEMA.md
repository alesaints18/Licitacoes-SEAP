# Documentação do Sistema de Controle de Processos de Licitação

## Visão Geral

O Sistema de Controle de Processos de Licitação é uma aplicação web desenvolvida para a Secretaria de Administração Penitenciária, destinada a gerenciar e monitorar processos licitatórios de forma eficiente e transparente.

## Arquitetura

A aplicação utiliza uma arquitetura moderna de três camadas:

1. **Frontend**: Desenvolvido em React com TypeScript, utilizando biblioteca de componentes Shadcn UI
2. **Backend**: API REST em Node.js/Express com TypeScript
3. **Banco de Dados**: PostgreSQL gerenciado pelo Drizzle ORM

## Recursos Principais

### 1. Gestão de Usuários

- Sistema de autenticação seguro com senhas criptografadas
- Diferentes níveis de acesso (administrador e usuário comum)
- Fluxo de aprovação para novos cadastros
- Gerenciamento de perfis e informações pessoais

### 2. Dashboard Analítico

- Visualização estatística do estado dos processos
- Métricas de desempenho e acompanhamento de metas
- Filtragem avançada por diversos parâmetros
- Gráficos interativos para análise de dados

### 3. Gestão de Processos

- Cadastro detalhado de processos licitatórios
- Acompanhamento do fluxo de tramitação
- Registro de datas, responsáveis e documentos
- Status e classificação por prioridade

### 4. Etapas do Processo

- Definição de etapas personalizadas para cada processo
- Atribuição de responsáveis e departamentos
- Acompanhamento de prazos e status
- Registro de observações e documentos

### 5. Relatórios

- Geração de relatórios customizados
- Exportação em formato PDF
- Visualizações gráficas e tabulares
- Análises comparativas e históricas

### 6. Modalidades e Fontes de Recursos

- Gestão de modalidades de licitação
- Registro de fontes de recursos
- Vinculação aos processos
- Análise de distribuição por fonte

### 7. Personalização

- Interface adaptável (modo claro/escuro)
- Configurações de metas mensais
- Preferências de usuário
- Interface responsiva para diferentes dispositivos

## Tecnologias Utilizadas

- **Frontend**:
  - React 18
  - TypeScript
  - TanStack Query para gerenciamento de estado
  - Recharts para visualizações gráficas
  - Tailwind CSS para estilização
  - Radix UI para componentes acessíveis

- **Backend**:
  - Node.js
  - Express
  - TypeScript
  - Passport.js para autenticação
  - Zod para validação de dados

- **Banco de Dados**:
  - PostgreSQL
  - Drizzle ORM
  - Drizzle Kit para migrações

- **Ferramentas de Desenvolvimento**:
  - Vite
  - ESBuild
  - TypeScript
  - TanStack Query DevTools

## Segurança

O sistema implementa diversas medidas de segurança:

- Autenticação baseada em sessão
- Armazenamento seguro de senhas com bcrypt
- Validação de entrada em todos os formulários
- Proteção de rotas sensíveis
- Prevenção contra ataques comuns (CSRF, XSS)
- Sanitização de dados

## Implantação Recomendada

### Requisitos de Servidor

- **Hardware Recomendado**:
  - CPU: 2+ núcleos
  - RAM: 4GB+
  - Armazenamento: 20GB+ SSD

- **Software**:
  - Sistema Operacional: Linux (recomendado Ubuntu 20.04+)
  - Node.js 18+
  - PostgreSQL 14+
  - Nginx como proxy reverso

### Escalabilidade

Para implantações maiores, considere:

- Configuração de balanceamento de carga
- Otimizações de banco de dados
- Implementação de CDN para assets estáticos
- Monitoramento e alerta de performance

## Manutenção e Suporte

Recomendações para manutenção contínua:

- Backups diários do banco de dados
- Atualizações regulares das dependências
- Monitoramento de logs e erros
- Testes periódicos de segurança
- Plano de recuperação de desastres

## Limitações Conhecidas

- O sistema está otimizado para navegadores modernos (Chrome, Firefox, Edge)
- A exportação de PDF com grande volume de dados pode ser lenta
- Relatórios muito complexos podem impactar o desempenho

## Evolução Futura

Sugestões para próximas versões:

- Integração com sistemas externos (SEI, ComprasNet)
- Aplicativo móvel para notificações e aprovações
- Assinatura digital de documentos
- Geração automatizada de editais
- Implementação de workflow configurável