# Guia de Implantação - Sistema de Controle de Processos de Licitação

Este documento apresenta instruções para implantação, configuração e utilização do Sistema de Controle de Processos de Licitação desenvolvido para a Secretaria de Administração Penitenciária.

## Sumário

1. [Requisitos do Sistema](#requisitos-do-sistema)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Inicialização](#inicialização)
5. [Acesso ao Sistema](#acesso-ao-sistema)
6. [Guia de Usuário](#guia-de-usuário)
7. [Manutenção](#manutenção)
8. [Solução de Problemas](#solução-de-problemas)

## Requisitos do Sistema

- Node.js 18.x ou superior
- PostgreSQL 14.x ou superior
- Acesso à internet para carregamento de dependências

## Instalação

1. Clone o repositório para o servidor de destino:
   ```bash
   git clone <URL-DO-REPOSITORIO>
   cd <DIRETORIO-DO-PROJETO>
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Construa a aplicação para produção:
   ```bash
   npm run build
   ```

## Configuração

1. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

   ```env
   DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco
   SESSION_SECRET=chave_secreta_para_sessoes
   NODE_ENV=production
   PORT=5000
   ```

   Substitua os valores pelos correspondentes ao seu ambiente:
   - `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL
   - `SESSION_SECRET`: String aleatória e segura para criptografia das sessões
   - `PORT`: Porta em que o servidor será executado (padrão: 5000)

2. Execute as migrações do banco de dados:
   ```bash
   npm run db:push
   ```

## Inicialização

1. Para iniciar o sistema em modo produção:
   ```bash
   npm start
   ```

2. Para manter o serviço em execução contínua, recomendamos o uso de um gerenciador de processos como PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "licitacao-sistema"
   pm2 save
   pm2 startup
   ```

## Acesso ao Sistema

1. O sistema estará disponível em:
   ```
   http://[IP-OU-DOMINIO]:[PORTA]
   ```

2. Credenciais padrão para primeiro acesso:
   - Usuário: admin
   - Senha: admin123

3. **IMPORTANTE**: Altere a senha padrão do usuário administrador após o primeiro acesso.

## Guia de Usuário

### Tela de Login

- Acesse o sistema com suas credenciais
- Utilize o botão de tema para alternar entre modo claro e escuro
- Novos usuários podem se cadastrar, mas precisam ser aprovados por um administrador

### Dashboard

- Visualize estatísticas dos processos de licitação
- Defina metas mensais (apenas administradores)
- Filtre dados por número de processo, modalidade, fonte de recurso e responsável

### Processos

- Visualize, adicione, edite e exclua processos de licitação
- Acompanhe o status e histórico de cada processo
- Gerencie etapas e documentos associados

### Relatórios

- Gere relatórios personalizados (apenas administradores)
- Exporte dados em formato PDF
- Visualize gráficos e estatísticas avançadas

### Configurações

- Gerencie usuários e permissões (apenas administradores)
- Configure modalidades de licitação e fontes de recursos
- Ajuste preferências do sistema

## Manutenção

1. Backup do banco de dados:
   ```bash
   pg_dump -U usuario -d nome_do_banco > backup_$(date +%Y%m%d).sql
   ```

2. Atualização do sistema:
   ```bash
   git pull
   npm install
   npm run build
   pm2 restart licitacao-sistema
   ```

## Solução de Problemas

### O sistema não inicia

1. Verifique se o arquivo `.env` está configurado corretamente
2. Confirme se o banco de dados está acessível
3. Verifique os logs de erro:
   ```bash
   pm2 logs licitacao-sistema
   ```

### Erro de autenticação

1. Verifique se o banco de dados possui o usuário administrador padrão
2. Se necessário, reinicie a senha do administrador via banco de dados:
   ```sql
   UPDATE users SET password = '$2b$10$s1Nrh44aOc8jCfDxXfqIRuHQVvWWs7K0y2yKpjRlIXDxM9eRmMO/2' WHERE username = 'admin';
   ```

### Problemas de desempenho

1. Verifique o uso de recursos do servidor (CPU, memória, disco)
2. Considere otimizar o banco de dados:
   ```sql
   VACUUM ANALYZE;
   ```

Para suporte adicional, entre em contato com a equipe de desenvolvimento.