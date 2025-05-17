import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { insertUserSchema, insertDepartmentSchema, insertBiddingModalitySchema, 
         insertResourceSourceSchema, insertProcessSchema, insertProcessStepSchema } from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

// Configuração para meta mensal
let monthlyGoal = 200; // Valor padrão

export async function registerRoutes(app: Express): Promise<Server> {
  // Rota direta para download do arquivo
  app.get('/download-app', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'SEAP-PB-win-x64.rar');
    res.download(filePath, 'SEAP-PB.rar', (err) => {
      if (err) {
        console.error('Erro ao fazer download do arquivo:', err);
        res.status(500).send('Erro ao baixar o arquivo');
      }
    });
  });
  
  // Rota para a página de download
  app.get('/download-page', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'download-page.html'));
  });
  // Configurar trust proxy para que as sessões funcionem corretamente em produção
  app.set('trust proxy', 1);
  
  // Setup session
  const SessionStore = MemoryStore(session);
  app.use(session({
    name: 'seap-session',
    secret: process.env.SESSION_SECRET || 'seap-pb-bidding-system-secure-key-2025',
    resave: false,
    saveUninitialized: false,
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
      console.log("Tentativa de autenticação para usuário:", username);
      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        console.log("Autenticação falhou para:", username);
        return done(null, false, { message: "Credenciais inválidas." });
      }
      
      if (!user.isActive) {
        console.log("Usuário não está ativo:", username);
        return done(null, false, { message: "Sua conta ainda não foi ativada por um administrador." });
      }
      
      console.log("Autenticação bem-sucedida para:", username);
      return done(null, user);
    } catch (error) {
      console.error("Erro na autenticação:", error);
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    console.log("Serializando usuário:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Desserializando usuário ID:", id);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log("Usuário não encontrado na desserialização:", id);
        return done(null, false);
      }
      
      console.log("Usuário desserializado com sucesso:", user.username);
      done(null, user);
    } catch (error) {
      console.error("Erro durante desserialização:", error);
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
      console.log("Usuário autenticado:", req.user?.username);
      res.json(req.user);
    } else {
      console.log("Usuário não autenticado");
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
      
      const filters = {
        pbdocNumber: pbdoc as string | undefined,
        modalityId: modality ? parseInt(modality as string) : undefined,
        sourceId: source ? parseInt(source as string) : undefined,
        responsibleId: responsible ? parseInt(responsible as string) : undefined,
        status: status as string | undefined
      };
      
      const processes = await storage.getProcesses(filters);
      res.json(processes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processos", error });
    }
  });

  app.get('/api/processes/:id', isAuthenticated, async (req, res) => {
    try {
      const process = await storage.getProcess(parseInt(req.params.id));
      if (!process) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      res.json(process);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processo", error });
    }
  });

  app.post('/api/processes', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertProcessSchema.parse(req.body);
      const process = await storage.createProcess(validatedData);
      res.status(201).json(process);
    } catch (error) {
      res.status(400).json({ message: "Dados de processo inválidos", error });
    }
  });

  app.patch('/api/processes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const processData = req.body;
      const updatedProcess = await storage.updateProcess(id, processData);
      
      if (!updatedProcess) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      
      res.json(updatedProcess);
    } catch (error) {
      res.status(400).json({ message: "Erro ao atualizar processo", error });
    }
  });

  app.delete('/api/processes/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProcess(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar processo", error });
    }
  });

  // Process steps routes
  app.get('/api/processes/:processId/steps', isAuthenticated, async (req, res) => {
    try {
      const processId = parseInt(req.params.processId);
      const steps = await storage.getProcessSteps(processId);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar etapas do processo", error });
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
      
      // If marking as completed, add the user who completed it
      if (stepData.isCompleted) {
        stepData.completedBy = (req.user as any).id;
      }
      
      const updatedStep = await storage.updateProcessStep(stepId, stepData);
      
      if (!updatedStep) {
        return res.status(404).json({ message: "Etapa não encontrada" });
      }
      
      res.json(updatedStep);
    } catch (error) {
      res.status(400).json({ message: "Erro ao atualizar etapa", error });
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
  
  const httpServer = createServer(app);
  return httpServer;
}
