import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { insertUserSchema, insertDepartmentSchema, insertBiddingModalitySchema, 
         insertResourceSourceSchema, insertProcessSchema, insertProcessStepSchema,
         insertProcessParticipantSchema, processParticipants } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

// Configuração para meta mensal
let monthlyGoal = 200; // Valor padrão

// Clientes WebSocket conectados
const clients = new Set<WebSocket>();

// Função para enviar mensagem para todos os clientes conectados
function broadcast(data: any) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuração para servir arquivos estáticos da pasta de downloads
  app.use('/downloads', express.static(path.join(process.cwd(), 'public', 'downloads'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.rar') || path.endsWith('.zip')) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment');
      }
    }
  }));
  
  // Rota direta para download do arquivo (agora usando o middleware static)
  app.get('/download-app', (req, res) => {
    // Redirecionar para o arquivo estático
    res.redirect('/downloads/SEAP-PB-v1.0.0.zip');
  });
  
  // Rota para a página de download pública - sem restrição de autenticação
  app.get('/download', (req, res) => {
    // Log de acesso para fins de auditoria
    console.log('Acesso à página de download pública');
    res.sendFile(path.join(process.cwd(), 'public', 'download.html'));
  });
  // Configurar trust proxy para que as sessões funcionem corretamente em produção
  app.set('trust proxy', 1);
  
  // Setup session
  const SessionStore = MemoryStore(session);
  app.use(session({
    name: 'seap-session',
    secret: process.env.SESSION_SECRET || 'seap-pb-bidding-system-secure-key-2025',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      secure: false, // Sempre false para garantir compatibilidade
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    },
    store: new SessionStore({
      checkPeriod: 86400000 // 24 hours
    }),
  }));

  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return done(null, false, { message: "Credenciais inválidas." });
      }
      
      if (!user.isActive) {
        return done(null, false, { message: "Sua conta ainda não foi ativada por um administrador." });
      }
      
      return done(null, user);
    } catch (error) {
      console.error("Erro na autenticação:", error);
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  // Authentication endpoints
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error("Erro na autenticação:", err);
        return res.status(500).json({ message: "Erro interno na autenticação" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Erro no login:", loginErr);
          return res.status(500).json({ message: "Erro ao estabelecer sessão" });
        }
        
        console.log("Login bem-sucedido para:", user.username);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Não autenticado" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
  
  // Registro de usuários públicos
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Valide os dados de entrada
      const validatedData = insertUserSchema.parse({
        ...req.body,
        role: 'common' // Força o papel como 'common' para segurança
      });
      
      // Verifique se o nome de usuário já existe
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      // Crie o usuário como inativo (aguardando aprovação do administrador)
      const user = await storage.createUser({
        ...validatedData,
        isActive: false // Usuário precisa ser ativado por um administrador
      });
      
      res.status(201).json({ 
        ...user, 
        password: '***',
        message: "Cadastro realizado com sucesso. Aguarde a aprovação de um administrador para acessar o sistema."
      });
    } catch (error: any) {
      res.status(400).json({ message: "Dados de usuário inválidos", error: error.message });
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  };

  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && (req.user as any)?.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: "Acesso proibido" });
  };

  // User routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários", error });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json({ ...user, password: '***' });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuário", error });
    }
  });

  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json({ ...user, password: '***' });
    } catch (error) {
      res.status(400).json({ message: "Dados de usuário inválidos", error });
    }
  });

  app.patch('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: "Erro ao atualizar usuário", error });
    }
  });
  
  app.delete('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se é o usuário administrador padrão
      if (id === 1) {
        return res.status(403).json({ message: "Não é possível excluir o usuário administrador padrão" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Implementar a exclusão do usuário
      await storage.deleteUser(id);
      
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro ao excluir usuário", error });
    }
  });

  // Department routes
  app.get('/api/departments', isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar departamentos", error });
    }
  });

  app.post('/api/departments', isAdmin, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      res.status(400).json({ message: "Dados de departamento inválidos", error });
    }
  });

  // Bidding modality routes
  app.get('/api/modalities', isAuthenticated, async (req, res) => {
    try {
      const modalities = await storage.getBiddingModalities();
      res.json(modalities);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar modalidades", error });
    }
  });

  app.post('/api/modalities', isAdmin, async (req, res) => {
    try {
      const validatedData = insertBiddingModalitySchema.parse(req.body);
      const modality = await storage.createBiddingModality(validatedData);
      res.status(201).json(modality);
    } catch (error) {
      res.status(400).json({ message: "Dados de modalidade inválidos", error });
    }
  });

  // Resource source routes
  app.get('/api/sources', isAuthenticated, async (req, res) => {
    try {
      const sources = await storage.getResourceSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar fontes de recurso", error });
    }
  });
  
  // Rota alternativa para manter consistência com o nome do modelo
  app.get('/api/resource-sources', isAuthenticated, async (req, res) => {
    try {
      const sources = await storage.getResourceSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar fontes de recurso", error });
    }
  });

  app.post('/api/sources', isAdmin, async (req, res) => {
    try {
      const validatedData = insertResourceSourceSchema.parse(req.body);
      const source = await storage.createResourceSource(validatedData);
      res.status(201).json(source);
    } catch (error) {
      res.status(400).json({ message: "Dados de fonte de recurso inválidos", error });
    }
  });

  // Process routes
  app.get('/api/processes', isAuthenticated, async (req, res) => {
    try {
      const { pbdoc, modality, source, responsible, status } = req.query;
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;
      const userDepartment = (req.user as any).department;
      
      // ADMIN TEM ACESSO TOTAL A TODOS OS PROCESSOS
      if (userRole === 'admin') {
        const filters = {
          pbdocNumber: pbdoc as string | undefined,
          modalityId: modality ? parseInt(modality as string) : undefined,
          sourceId: source ? parseInt(source as string) : undefined,
          responsibleId: responsible ? parseInt(responsible as string) : undefined,
          status: status as string | undefined
          // NÃO filtrar por departamento para admin
        };
        
        const processes = await storage.getProcesses(filters);
        return res.json(processes);
      }
      
      // USUÁRIOS COMUNS: Visibilidade restrita por departamento
      const departmentIdMap: { [key: string]: number } = {
        "Setor Demandante": 1,
        "TI": 1,
        "Divisão de Licitação": 2,
        "Licitações": 2,
        " Núcleo de Pesquisa  de Preços – NPP  Núcleo de Pes": 3,
        "Unidade de  Orçamento e  Finanças": 4,
        "Financeiro": 4,
        "Secretário de Estado da Administração  Penitenciária - SEAP": 5,
        " Comitê Gestor do Plano de  Contingência - CGPC": 6,
        "Unidade Técnico Normativa": 7,
        "Procuradoria Geral do Estado - PGE": 8,
        " Controladoria Geral do Estado – CGE": 9,
        "Equipe de Pregão": 10,
        "Subgerência de Contratos e  Convênios - SUBCC": 11
      };

      const userDepartmentId = departmentIdMap[userDepartment];
      
      if (!userDepartmentId) {
        return res.status(403).json({ message: "Departamento não reconhecido" });
      }
      
      const filters = {
        pbdocNumber: pbdoc as string | undefined,
        modalityId: modality ? parseInt(modality as string) : undefined,
        sourceId: source ? parseInt(source as string) : undefined,
        responsibleId: responsible ? parseInt(responsible as string) : undefined,
        status: status as string | undefined,
        currentDepartmentId: userDepartmentId
      };
      
      const allProcesses = await storage.getProcesses(filters);
      
      // FILTRO ADICIONAL DE SEGURANÇA para usuários comuns
      const filteredProcesses = allProcesses.filter(process => {
        return process.currentDepartmentId === userDepartmentId;
      });
      
      res.json(filteredProcesses);
    } catch (error) {
      console.error("Erro ao buscar processos:", error);
      res.status(500).json({ message: "Erro ao buscar processos", error });
    }
  });

  app.get('/api/processes/:id', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Busca o processo verificando se o usuário tem acesso
      const process = await storage.getProcess(processId, userId);
      
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado ou acesso negado" });
      }
      res.json(process);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processo", error });
    }
  });

  app.post('/api/processes', isAuthenticated, async (req, res) => {
    try {
      console.log('Dados recebidos para criação de processo:', JSON.stringify(req.body, null, 2));
      
      // Pré-processamento para garantir que o formato dos dados esteja correto
      const processData = { ...req.body };
      
      // Testes de validação manual antes de usar o Zod
      if (!processData.pbdocNumber || typeof processData.pbdocNumber !== 'string') {
        return res.status(400).json({
          message: 'Dados inválidos',
          error: 'Número PBDOC é obrigatório e deve ser uma string'
        });
      }
      
      if (!processData.description || typeof processData.description !== 'string') {
        return res.status(400).json({
          message: 'Dados inválidos',
          error: 'Descrição/Objeto é obrigatório e deve ser uma string'
        });
      }
      
      // Verificar e converter campos numéricos
      for (const field of ['modalityId', 'sourceId', 'responsibleId', 'currentDepartmentId']) {
        if (processData[field] === undefined || processData[field] === null) {
          return res.status(400).json({
            message: 'Dados inválidos',
            error: `Campo ${field} é obrigatório`
          });
        }
        
        const numValue = Number(processData[field]);
        if (isNaN(numValue)) {
          return res.status(400).json({
            message: 'Dados inválidos',
            error: `Campo ${field} deve ser um número válido`
          });
        }
        
        processData[field] = numValue;
      }
      
      // Verificar enum de prioridade
      if (!['low', 'medium', 'high'].includes(processData.priority)) {
        return res.status(400).json({
          message: 'Dados inválidos',
          error: 'Prioridade deve ser low, medium ou high'
        });
      }
      
      // Verificar enum de status
      if (processData.status && !['draft', 'in_progress', 'completed', 'canceled', 'overdue'].includes(processData.status)) {
        return res.status(400).json({
          message: 'Dados inválidos',
          error: 'Status deve ser draft, in_progress, completed, canceled ou overdue'
        });
      }
      
      // Ajustar campos específicos que podem causar problemas de validação
      if (processData.deadline === '') {
        processData.deadline = null;
      }
      
      console.log('Dados pré-processados:', JSON.stringify(processData, null, 2));
      
      // Usar Zod para validação final
      let validatedData;
      // Converter deadline para Date antes da validação, se existir
      if (processData.deadline && typeof processData.deadline === 'string') {
        try {
          processData.deadline = new Date(processData.deadline);
        } catch (error) {
          return res.status(400).json({
            message: 'Dados inválidos',
            error: 'Formato de data inválido para o prazo'
          });
        }
      }

      try {
        validatedData = insertProcessSchema.parse(processData);
      } catch (zodError: any) {
        console.error("Erros de validação Zod:", zodError);
        return res.status(400).json({ 
          message: "Dados de processo inválidos", 
          errors: zodError.errors || zodError.message
        });
      }
      
      // Definir a data em que o responsável assumiu o processo
      validatedData.responsibleSince = new Date();
      
      // Calcular prazo automaticamente baseado na modalidade
      const modality = await storage.getBiddingModality(validatedData.modalityId);
      if (modality) {
        const deadlineDays = modality.deadlineDays || 7; // Default 7 dias se não especificado
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + deadlineDays);
        validatedData.deadline = deadline;
        console.log(`Prazo de entrega calculado automaticamente: ${deadlineDays} dias - ${validatedData.deadline}`);
      }
      
      console.log('Dados validados para criação de processo:', validatedData);
      
      // Criar o processo no banco de dados
      const process = await storage.createProcess(validatedData);
      
      const userId = (req.user as any).id;
      const currentDepartmentId = process.currentDepartmentId;
      
      console.log(`Criando processo: ${process.id}, departamento: ${currentDepartmentId}`);
      
      // Adicionar o criador como participante do processo (role: owner)
      await storage.addProcessParticipant({
        processId: process.id,
        userId: userId,
        departmentId: currentDepartmentId,
        role: 'owner',
        isActive: true
      });
      
      // Se o responsável pelo processo for diferente do criador, adiciona-o também
      if (process.responsibleId !== userId) {
        await storage.addProcessParticipant({
          processId: process.id,
          userId: process.responsibleId,
          departmentId: currentDepartmentId,
          role: 'editor',
          isActive: true
        });
      }
      
      // Notificar todos os clientes sobre o novo processo criado
      broadcast({
        type: 'new_process',
        process,
        message: `Novo processo criado: ${process.description}`,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json(process);
    } catch (error: any) {
      console.error("Erro ao criar processo:", error);
      res.status(400).json({ 
        message: "Dados de processo inválidos", 
        error: error.message || "Erro desconhecido" 
      });
    }
  });

  app.patch('/api/processes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Dados recebidos para atualização do processo ${id}:`, req.body);
      
      // Verificar se o processo existe antes de atualizar
      const existingProcess = await storage.getProcess(id);
      if (!existingProcess) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      
      const processData = req.body;
      
      // Verificar se há alteração do responsável
      if (processData.responsibleId && processData.responsibleId !== existingProcess.responsibleId) {
        // Se o responsável mudou, atualizar a data de início da responsabilidade
        processData.responsibleSince = new Date();
        console.log(`Responsável do processo alterado. Novo responsável: ${processData.responsibleId}, desde: ${processData.responsibleSince}`);
      }
      
      // Converter prazo de entrega para formato de data se existir
      if (processData.deadline && typeof processData.deadline === 'string') {
        processData.deadline = new Date(processData.deadline);
        console.log(`Prazo de entrega definido: ${processData.deadline}`);
      }
      
      const updatedProcess = await storage.updateProcess(id, processData);
      console.log(`Processo ${id} atualizado:`, updatedProcess);
      
      if (!updatedProcess) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      
      // Notificar alteração via WebSocket
      broadcast({
        type: 'process_updated',
        processId: id,
        message: `Processo ${updatedProcess.pbdocNumber} foi atualizado`
      });
      
      res.json(updatedProcess);
    } catch (error) {
      console.error("Erro ao atualizar processo:", error);
      res.status(400).json({ message: "Erro ao atualizar processo", error });
    }
  });

  app.delete('/api/processes/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const deleted = await storage.deleteProcess(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      
      // Notificar exclusão via WebSocket
      broadcast({
        type: 'process_deleted',
        processId: id,
        message: `Processo movido para a lixeira`,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar processo", error });
    }
  });

  // Rotas da lixeira eletrônica
  app.get('/api/processes/deleted', isAdmin, async (req, res) => {
    try {
      const deletedProcesses = await storage.getDeletedProcesses();
      res.json(deletedProcesses);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processos excluídos", error });
    }
  });

  app.post('/api/processes/:id/restore', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const restoredProcess = await storage.restoreProcess(id, userId);
      
      if (!restoredProcess) {
        return res.status(404).json({ message: "Processo não encontrado na lixeira" });
      }
      
      // Notificar restauração via WebSocket
      broadcast({
        type: 'process_restored',
        processId: id,
        message: `Processo ${restoredProcess.pbdocNumber} foi restaurado`,
        timestamp: new Date().toISOString()
      });
      
      res.json(restoredProcess);
    } catch (error) {
      res.status(500).json({ message: "Erro ao restaurar processo", error });
    }
  });

  app.delete('/api/processes/:id/permanent', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.permanentlyDeleteProcess(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      
      // Notificar exclusão permanente via WebSocket
      broadcast({
        type: 'process_permanently_deleted',
        processId: id,
        message: `Processo excluído permanentemente`,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir processo permanentemente", error });
    }
  });
  
  // Rotas para gerenciar participantes de um processo
  app.get('/api/processes/:id/participants', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Verifica se o usuário tem acesso ao processo
      const process = await storage.getProcess(processId, userId);
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado ou acesso negado" });
      }
      
      const participants = await storage.getProcessParticipants(processId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar participantes", error });
    }
  });
  
  app.post('/api/processes/:id/participants', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Verifica se o usuário tem acesso ao processo e se é admin ou owner
      const process = await storage.getProcess(processId, userId);
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado ou acesso negado" });
      }
      
      // Verifica se o usuário tem permissão para adicionar participantes
      const isUserAdmin = (req.user as any).role === 'admin';
      if (!isUserAdmin) {
        // Busca o papel do usuário no processo
        const participants = await storage.getProcessParticipants(processId);
        const userParticipant = participants.find(p => p.userId === userId);
        
        // Apenas donos do processo podem adicionar participantes
        if (!userParticipant || userParticipant.role !== 'owner') {
          return res.status(403).json({ message: "Permissão negada para adicionar participantes" });
        }
      }
      
      // Valida e adiciona o participante
      const validatedData = insertProcessParticipantSchema.parse({
        ...req.body,
        processId
      });
      
      const participant = await storage.addProcessParticipant(validatedData);
      
      // Notificar usuário adicionado ao processo
      broadcast({
        type: 'process_participant_added',
        processId,
        userId: validatedData.userId,
        message: `Você foi adicionado ao processo ${process.pbdocNumber}`,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json(participant);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });
  
  app.delete('/api/processes/:id/participants/:userId', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const participantId = parseInt(req.params.userId);
      const currentUserId = (req.user as any).id;
      
      // Verifica se o usuário tem acesso ao processo e se é admin ou owner
      const process = await storage.getProcess(processId, currentUserId);
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado ou acesso negado" });
      }
      
      // Verifica se o usuário tem permissão para remover participantes
      const isUserAdmin = (req.user as any).role === 'admin';
      if (!isUserAdmin && participantId !== currentUserId) { // Usuários podem remover a si mesmos
        // Busca o papel do usuário no processo
        const participants = await storage.getProcessParticipants(processId);
        const userParticipant = participants.find(p => p.userId === currentUserId);
        
        // Apenas donos do processo podem remover participantes
        if (!userParticipant || userParticipant.role !== 'owner') {
          return res.status(403).json({ message: "Permissão negada para remover participantes" });
        }
      }
      
      const success = await storage.removeProcessParticipant(processId, participantId);
      
      if (!success) {
        return res.status(404).json({ message: "Participante não encontrado" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover participante", error });
    }
  });
  
  // Rota para retornar processo ao departamento anterior
  app.post('/api/processes/:id/return', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const { returnComment } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!returnComment || returnComment.trim() === '') {
        return res.status(400).json({ message: "Comentário de retorno é obrigatório" });
      }

      console.log(`Usuário ${userId} retornando processo ${processId} com comentário: ${returnComment}`);

      const updatedProcess = await storage.returnProcess(processId, returnComment.trim(), userId);
      
      if (!updatedProcess) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }

      // Notificar via WebSocket sobre o retorno
      broadcast({
        type: 'process_returned',
        processId: processId,
        returnComment: returnComment.trim(),
        returnedBy: userId,
        timestamp: new Date().toISOString()
      });

      res.json(updatedProcess);
    } catch (error: any) {
      console.error('Erro ao retornar processo:', error);
      res.status(500).json({ 
        message: "Erro interno do servidor ao retornar processo",
        error: error.message 
      });
    }
  });

  // Rota para transferir processo entre departamentos/setores
  app.post('/api/processes/:id/transfer', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const departmentId = parseInt(req.body.departmentId);
      const userId = (req.user as any).id;
      
      console.log(`INICIANDO TRANSFERÊNCIA: Processo ${processId} para departamento ${departmentId} pelo usuário ${userId}`);
      
      // Verificar se o processo existe e se o usuário tem acesso
      const process = await storage.getProcess(processId, userId);
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado ou você não tem permissão para acessá-lo" });
      }
      
      // Verificar se o departamento de destino existe
      const department = await storage.getDepartment(departmentId);
      if (!department) {
        return res.status(404).json({ message: "Departamento/setor não encontrado" });
      }
      
      // Obter informações do usuário e departamento atual
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      console.log(`Usuário transferindo: ${user.username}, Departamento: ${user.department}`);
      
      const oldDepartmentId = process.currentDepartmentId;
      
      // 1. Atualizar departamento do processo e data do responsável (quando o processo é transferido, o responsável passa a ser o novo usuário)
      const updatedProcess = await storage.updateProcess(processId, {
        currentDepartmentId: departmentId,
        responsibleId: userId,
        responsibleSince: new Date()
      });
      
      if (!updatedProcess) {
        return res.status(500).json({ message: "Erro ao atualizar o departamento do processo" });
      }
      
      // 2. IMPORTANTE: Remover TODOS os participantes do processo
      console.log(`Removendo todos os participantes do processo ${processId} para forçar exclusão de visibilidade`);
      
      // Obter os participantes atuais para log
      const currentParticipants = await storage.getProcessParticipants(processId);
      console.log(`Participantes atuais: ${currentParticipants.length}`);
      
      // Excluir todos os participantes - não usar removeProcessParticipant pois ele remove um por um
      await db.delete(processParticipants).where(eq(processParticipants.processId, processId));
      
      // 3. Adicionar usuário do departamento destino como participante (se não for o responsável)
      if (updatedProcess.responsibleId !== userId) {
        console.log(`Adicionando usuário ${userId} como novo participante do processo ${processId}`);
        await storage.addProcessParticipant({
          processId,
          userId,
          role: 'participant',
          isActive: true,
          departmentId,
          notifications: true
        });
      }
      
      // 4. Registrar a transferência no histórico
      await storage.createProcessStep({
        processId,
        departmentId,
        userId,
        action: `Transferido do departamento ${oldDepartmentId} para ${departmentId}`,
        stepName: "Transferência de Setor",
        createdAt: new Date()
      });
      
      // Notificar via WebSocket sobre a transferência
      broadcast({
        type: 'process_transferred',
        processId,
        oldDepartmentId,
        departmentId,
        message: `Processo ${process.pbdocNumber} transferido de ${oldDepartmentId} para ${department.name}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Transferência concluída: Processo ${processId} transferido para departamento ${departmentId}`);
      
      res.status(200).json(updatedProcess);
    } catch (error) {
      console.error("Erro ao transferir processo:", error);
      res.status(500).json({ message: "Erro ao transferir processo", error: String(error) });
    }
  });

  // Process steps routes
  app.get('/api/processes/:processId/steps', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.processId);
      console.log(`Buscando etapas para o processo ${processId}`);
      
      if (isNaN(processId)) {
        console.log("ID do processo é inválido:", req.params.processId);
        return res.status(400).json({ message: "ID do processo inválido" });
      }
      
      console.log("Iniciando consulta de etapas no storage...");
      const steps = await storage.getProcessSteps(processId);
      console.log(`Etapas encontradas para processo ${processId}:`, steps?.length || 0);
      
      // Retornar array vazio se não houver etapas
      res.json(steps || []);
    } catch (error) {
      console.error("Erro completo ao buscar etapas:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Erro ao buscar etapas do processo", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post('/api/processes/:processId/steps', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.processId);
      const stepData = {
        ...req.body,
        processId,
      };
      
      const validatedData = insertProcessStepSchema.parse(stepData);
      const step = await storage.createProcessStep(validatedData);
      res.status(201).json(step);
    } catch (error) {
      res.status(400).json({ message: "Dados de etapa inválidos", error });
    }
  });

  app.patch('/api/processes/:processId/steps/:stepId', isAuthenticated, async (req, res) => {
    try {
      const stepId = parseInt(req.params.stepId);
      const stepData = req.body;
      
      console.log(`Atualizando etapa ${stepId} com dados:`, stepData);
      
      // If marking as completed, add the user who completed it and timestamp
      if (stepData.isCompleted) {
        stepData.completedBy = (req.user as any).id;
        stepData.completedAt = new Date();
      } else {
        stepData.completedBy = null;
        stepData.completedAt = null;
      }
      
      console.log(`Dados processados para etapa ${stepId}:`, stepData);
      
      const updatedStep = await storage.updateProcessStep(stepId, stepData);
      
      if (!updatedStep) {
        console.log(`Etapa ${stepId} não encontrada`);
        return res.status(404).json({ message: "Etapa não encontrada" });
      }
      
      console.log(`Etapa ${stepId} atualizada com sucesso:`, updatedStep);
      res.json(updatedStep);
    } catch (error) {
      console.error(`Erro ao atualizar etapa ${req.params.stepId}:`, error);
      res.status(400).json({ message: "Erro ao atualizar etapa", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Dashboard analytics routes
  app.get('/api/analytics/process-statistics', isAuthenticated, async (req, res) => {
    try {
      // Extrair filtros da query string
      const { pbdocNumber, modalityId, sourceId, responsibleId, status } = req.query;
      
      // Log para debugging
      console.log('GET /api/analytics/process-statistics - Query params:', req.query);
      
      const filters = {
        pbdocNumber: pbdocNumber as string | undefined,
        modalityId: modalityId ? parseInt(modalityId as string) : undefined,
        sourceId: sourceId ? parseInt(sourceId as string) : undefined,
        responsibleId: responsibleId ? parseInt(responsibleId as string) : undefined,
        status: status as string | undefined
      };
      
      // Log dos filtros processados
      console.log('GET /api/analytics/process-statistics - Filtros processados:', filters);
      
      const stats = await storage.getProcessesStatistics(filters);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas", error });
    }
  });

  app.get('/api/analytics/processes-by-month', isAuthenticated, async (req, res) => {
    try {
      // Extrair filtros da query string
      const { pbdocNumber, modalityId, sourceId, responsibleId, status } = req.query;
      
      const filters = {
        pbdocNumber: pbdocNumber as string | undefined,
        modalityId: modalityId ? parseInt(modalityId as string) : undefined,
        sourceId: sourceId ? parseInt(sourceId as string) : undefined,
        responsibleId: responsibleId ? parseInt(responsibleId as string) : undefined,
        status: status as string | undefined
      };
      
      const data = await storage.getProcessesByMonth(filters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processos por mês", error });
    }
  });

  app.get('/api/analytics/processes-by-source', isAuthenticated, async (req, res) => {
    try {
      // Extrair filtros da query string
      const { pbdocNumber, modalityId, sourceId, responsibleId, status } = req.query;
      
      const filters = {
        pbdocNumber: pbdocNumber as string | undefined,
        modalityId: modalityId ? parseInt(modalityId as string) : undefined,
        sourceId: sourceId ? parseInt(sourceId as string) : undefined,
        responsibleId: responsibleId ? parseInt(responsibleId as string) : undefined,
        status: status as string | undefined
      };
      
      const data = await storage.getProcessesBySource(filters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processos por fonte", error });
    }
  });

  app.get('/api/analytics/processes-by-responsible', isAuthenticated, async (req, res) => {
    try {
      // Extrair filtros da query string
      const { pbdocNumber, modalityId, sourceId, responsibleId, status } = req.query;
      
      const filters = {
        pbdocNumber: pbdocNumber as string | undefined,
        modalityId: modalityId ? parseInt(modalityId as string) : undefined,
        sourceId: sourceId ? parseInt(sourceId as string) : undefined,
        responsibleId: responsibleId ? parseInt(responsibleId as string) : undefined,
        status: status as string | undefined
      };
      
      const data = await storage.getProcessesByResponsible(filters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processos por responsável", error });
    }
  });
  
  // Configuração para meta mensal
  let monthlyGoal = 200; // Valor padrão
  
  app.get('/api/settings/monthly-goal', isAuthenticated, (req, res) => {
    res.json({ value: monthlyGoal });
  });
  
  app.post('/api/settings/monthly-goal', isAdmin, (req, res) => {
    try {
      const { value } = req.body;
      
      if (typeof value !== 'number' || value <= 0) {
        return res.status(400).json({ message: "Valor de meta inválido. Deve ser um número positivo." });
      }
      
      monthlyGoal = value;
      res.json({ value: monthlyGoal });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar meta mensal", error });
    }
  });

  // Endpoints para meta mensal
  app.get('/api/settings/monthly-goal', isAuthenticated, (req, res) => {
    res.json({ value: monthlyGoal });
  });
  
  app.post('/api/settings/monthly-goal', isAdmin, (req, res) => {
    try {
      const { value } = req.body;
      
      if (typeof value !== 'number' || value <= 0) {
        return res.status(400).json({ message: "Valor de meta inválido. Deve ser um número positivo." });
      }
      
      monthlyGoal = value;
      res.json({ value: monthlyGoal });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar meta mensal", error });
    }
  });

  // Rota para geração de relatório de processo em PDF
  app.get('/api/processes/:id/report', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Verificar se o processo existe e se o usuário tem acesso
      const process = await storage.getProcess(processId, userId);
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado ou acesso negado" });
      }
      
      // Buscar dados relacionados
      const modalities = await storage.getBiddingModalities();
      const sources = await storage.getResourceSources();
      const users = await storage.getUsers();
      const departments = await storage.getDepartments();
      const steps = await storage.getProcessSteps(processId);
      
      const modality = modalities.find(m => m.id === process.modalityId);
      const source = sources.find(s => s.id === process.sourceId);
      const responsible = users.find(u => u.id === process.responsibleId);
      const currentDepartment = departments.find(d => d.id === process.currentDepartmentId);
      
      // Gerar HTML do relatório
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório do Processo ${process.pbdocNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
            .header h1 { color: #1e40af; margin-bottom: 5px; }
            .header h2 { color: #1e40af; font-size: 24px; }
            .section { margin-bottom: 25px; }
            .section-title { color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .info-item { margin-bottom: 8px; }
            .info-label { font-weight: bold; color: #374151; }
            .description { background: #f9fafb; padding: 15px; border-radius: 5px; border-left: 4px solid #1e40af; }
            .steps { margin-top: 15px; }
            .step { border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 10px; border-radius: 5px; }
            .step.completed { background: #f0fdf4; border-left: 4px solid #10b981; }
            .step.pending { background: #fefce8; border-left: 4px solid #f59e0b; }
            .return-comments { background: #fef2f2; padding: 15px; border-radius: 5px; border-left: 4px solid #dc2626; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SEAP - Secretaria de Estado da Administração Penitenciária</h1>
            <p>Relatório de Processo Licitatório</p>
            <h2>Processo Nº ${process.pbdocNumber}</h2>
          </div>
          
          <div class="section">
            <h3 class="section-title">Informações Básicas</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Número PBDOC:</span> ${process.pbdocNumber}</div>
              <div class="info-item"><span class="info-label">Status:</span> ${process.status}</div>
              <div class="info-item"><span class="info-label">Modalidade:</span> ${modality?.name || "Não informado"}</div>
              <div class="info-item"><span class="info-label">Prioridade:</span> ${process.priority}</div>
              <div class="info-item"><span class="info-label">Fonte de Recurso:</span> ${source ? `${source.code} - ${source.description}` : "Não informado"}</div>
              <div class="info-item"><span class="info-label">Responsável:</span> ${responsible?.fullName || "Não informado"}</div>
              <div class="info-item"><span class="info-label">Departamento Atual:</span> ${currentDepartment?.name || "Não informado"}</div>
              <div class="info-item"><span class="info-label">Central de Compras:</span> ${process.centralDeCompras || "Não informado"}</div>
            </div>
          </div>
          
          <div class="section">
            <h3 class="section-title">Objeto</h3>
            <div class="description">${process.description}</div>
          </div>
          
          <div class="section">
            <h3 class="section-title">Cronograma</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Data de Criação:</span> ${new Date(process.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div class="info-item"><span class="info-label">Última Atualização:</span> ${new Date(process.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div class="info-item"><span class="info-label">Prazo de Entrega:</span> ${process.deadline ? new Date(process.deadline).toLocaleDateString('pt-BR') : "Não definido"}</div>
            </div>
          </div>
          
          ${process.returnComments ? `
          <div class="section">
            <h3 class="section-title">Comentários de Retorno</h3>
            <div class="return-comments">${process.returnComments}</div>
          </div>
          ` : ''}
          
          ${steps && steps.length > 0 ? `
          <div class="section">
            <h3 class="section-title">Histórico de Etapas</h3>
            <div class="steps">
              ${steps.map((step, index) => {
                const stepDepartment = departments.find(d => d.id === step.departmentId);
                const completedBy = users.find(u => u.id === step.completedBy);
                return `
                  <div class="step ${step.isCompleted ? 'completed' : 'pending'}">
                    <h4>${index + 1}. ${step.stepName}</h4>
                    <p><span class="info-label">Departamento:</span> ${stepDepartment?.name || "Não informado"}</p>
                    ${step.completedBy ? `<p><span class="info-label">Responsável:</span> ${completedBy?.fullName || "Não informado"}</p>` : ''}
                    ${step.completedAt ? `<p><span class="info-label">Data de Conclusão:</span> ${new Date(step.completedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
                    ${step.observations ? `<p><span class="info-label">Observações:</span> ${step.observations}</p>` : ''}
                    <p><span class="info-label">Status:</span> ${step.isCompleted ? 'Concluída' : 'Em andamento'}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>SEAP - Secretaria de Estado da Administração Penitenciária da Paraíba</p>
          </div>
        </body>
        </html>
      `;
      
      // Retornar HTML formatado para impressão/conversão em PDF
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
      
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      res.status(500).json({ message: "Erro ao gerar relatório", error });
    }
  });
  
  const httpServer = createServer(app);
  // Configurar WebSocket Server para atualizações em tempo real
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Nova conexão WebSocket estabelecida');
    
    // Adicionar cliente à lista
    clients.add(ws);
    
    // Enviar mensagem de boas-vindas
    ws.send(JSON.stringify({ type: 'connection', message: 'Conectado com sucesso!' }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensagem recebida:', data);
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Conexão WebSocket fechada');
      clients.delete(ws);
    });
  });
  
  return httpServer;
}
