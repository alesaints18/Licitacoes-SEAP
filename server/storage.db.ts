import { db } from "./db";
import { 
  users, type User, type InsertUser, 
  departments, type Department, type InsertDepartment,
  biddingModalities, type BiddingModality, type InsertBiddingModality,
  resourceSources, type ResourceSource, type InsertResourceSource,
  processes, type Process, type InsertProcess,
  processSteps, type ProcessStep, type InsertProcessStep,
  processParticipants, type ProcessParticipant, type InsertProcessParticipant
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, or, count, sql, inArray, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return false;
    }
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user) return undefined;

    // Verificar se o usuário está ativo
    if (user.isActive === false) return undefined;
    
    // Verificar se a senha começa com $2b$ (hash bcrypt)
    // Se não, verificar diretamente (compatibilidade com senhas em texto simples)
    let passwordMatch = false;
    
    if (user.password.startsWith('$2b$')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Compatibilidade: verificar senha em texto simples
      passwordMatch = password === user.password;
      
      // Se a senha estiver correta, atualize para hash bcrypt
      if (passwordMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.updateUser(user.id, { password: hashedPassword });
      }
    }
    
    if (!passwordMatch) return undefined;

    return user;
  }

  // Department operations
  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  // Bidding modality operations
  async getBiddingModality(id: number): Promise<BiddingModality | undefined> {
    const [modality] = await db.select().from(biddingModalities).where(eq(biddingModalities.id, id));
    return modality;
  }

  async getBiddingModalities(): Promise<BiddingModality[]> {
    return await db.select().from(biddingModalities);
  }

  async createBiddingModality(modality: InsertBiddingModality): Promise<BiddingModality> {
    const [newModality] = await db.insert(biddingModalities).values(modality).returning();
    return newModality;
  }

  // Resource source operations
  async getResourceSource(id: number): Promise<ResourceSource | undefined> {
    const [source] = await db.select().from(resourceSources).where(eq(resourceSources.id, id));
    return source;
  }

  async getResourceSources(): Promise<ResourceSource[]> {
    return await db.select().from(resourceSources);
  }

  async createResourceSource(source: InsertResourceSource): Promise<ResourceSource> {
    const [newSource] = await db.insert(resourceSources).values(source).returning();
    return newSource;
  }

  // Process operations
  async getProcess(id: number, userId?: number): Promise<Process | undefined> {
    const [process] = await db.select().from(processes).where(eq(processes.id, id));
    
    // Se o userId for fornecido, verificar permissões
    if (process && userId) {
      // O usuário tem acesso se:
      // 1. É o responsável pelo processo
      if (process.responsibleId === userId) {
        return process;
      }
      
      // 2. Pertence ao departamento atual do processo
      const user = await this.getUser(userId);
      if (user) {
        const department = await this.getDepartment(process.currentDepartmentId);
        if (department && user.department === department.name) {
          return process;
        }
      }
      
      // 3. É um participante ativo do processo
      const [participant] = await db
        .select()
        .from(processParticipants)
        .where(
          and(
            eq(processParticipants.processId, id),
            eq(processParticipants.userId, userId),
            eq(processParticipants.isActive, true)
          )
        );
      
      if (participant) {
        return process;
      }
      
      // Se nenhuma das condições acima for verdadeira, o usuário não tem acesso
      return undefined;
    }
    
    return process;
  }

  async getProcesses(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
    userId?: number; // Adicionar userId para filtrar processos do usuário
  }): Promise<Process[]> {
    // Obter todos os processos inicialmente
    let query = db.select().from(processes);
    
    // Aplicar filtros se fornecidos
    const conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(eq(processes.pbdocNumber, filters.pbdocNumber));
    }
    
    if (filters?.modalityId) {
      conditions.push(eq(processes.modalityId, filters.modalityId));
    }
    
    if (filters?.sourceId) {
      conditions.push(eq(processes.sourceId, filters.sourceId));
    }
    
    if (filters?.responsibleId) {
      conditions.push(eq(processes.responsibleId, filters.responsibleId));
    }
    
    if (filters?.status) {
      conditions.push(eq(processes.status, filters.status));
    }
    
    // Se houver condições, aplicá-las à consulta
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Ordenar por data de atualização decrescente
    query = query.orderBy(desc(processes.updatedAt));
    
    // Executar a consulta
    let allProcesses = await query;
    
    // Se userId for fornecido, filtrar os processos que o usuário tem acesso
    if (filters?.userId) {
      // Obter informações do usuário
      const user = await this.getUser(filters.userId);
      if (!user) return [];
      
      // Verificar se o usuário é admin
      const isAdmin = user.role === 'admin';
      
      // Se não for admin, aplicar restrições de acesso
      if (!isAdmin) {
        console.log(`Obtendo processos para usuário: ${filters.userId} (${user.username})`);
        console.log("Usuário não é admin - aplicando restrições de acesso");
        
        // Obter processos onde o usuário é responsável ou participante
        // ou que estão no departamento atual do usuário
        
        // 1. Obter o departamento do usuário
        console.log(`Usuário ${user.username} (ID: ${user.id}) pertence ao departamento ${user.department}`);
        const [userDepartment] = await db
          .select()
          .from(departments)
          .where(eq(departments.name, user.department));
        
        if (!userDepartment) {
          console.log(`Departamento ${user.department} não encontrado para o usuário ${user.id}`);
          return [];
        }
        
        // 2. Obter os IDs dos processos onde o usuário é participante
        const userParticipations = await db
          .select()
          .from(processParticipants)
          .where(
            and(
              eq(processParticipants.userId, user.id),
              eq(processParticipants.isActive, true)
            )
          );
        
        const participantProcessIds = userParticipations.map(p => p.processId);
        console.log(`Usuário ${user.username} é participante de ${participantProcessIds.length} processos`);
        
        // 3. Filtrar os processos com regras ESTRITAS de acesso
        // A ÚNICA condição que determina a visibilidade do processo é:
        // - O departamento atual do processo é exatamente o mesmo do usuário
        // NÃO MOSTRAR processos em que o usuário é apenas responsável ou participante
        // CRITÉRIO EXCLUSIVO: Pertencer ao departamento atual
        allProcesses = allProcesses.filter(p => {
          // Verificar SOMENTE se o processo está no departamento atual do usuário
          const isInCurrentDepartment = p.currentDepartmentId === userDepartment.id;
          
          // REGRA DEFINITIVA: O processo SÓ é visível se estiver no departamento atual do usuário
          // Nenhuma outra condição é aceita
          return isInCurrentDepartment;
        });
        
        console.log(`Consulta retornou ${allProcesses.length} processos`);
      }
    }
    
    console.log(`Processos encontrados para usuário ${filters?.userId}: ${allProcesses.length}`);
    return allProcesses;
  }

  async createProcess(process: InsertProcess): Promise<Process> {
    const [newProcess] = await db.insert(processes).values(process).returning();
    return newProcess;
  }

  async updateProcess(id: number, processData: Partial<InsertProcess>): Promise<Process | undefined> {
    const [updatedProcess] = await db
      .update(processes)
      .set(processData)
      .where(eq(processes.id, id))
      .returning();
    return updatedProcess;
  }

  async deleteProcess(id: number): Promise<boolean> {
    const result = await db.delete(processes).where(eq(processes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Process participants operations
  async getProcessParticipants(processId: number): Promise<ProcessParticipant[]> {
    return await db
      .select()
      .from(processParticipants)
      .where(eq(processParticipants.processId, processId));
  }

  async addProcessParticipant(participant: InsertProcessParticipant): Promise<ProcessParticipant> {
    const [newParticipant] = await db
      .insert(processParticipants)
      .values(participant)
      .returning();
    return newParticipant;
  }

  async removeProcessParticipant(processId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(processParticipants)
      .where(and(
        eq(processParticipants.processId, processId),
        eq(processParticipants.userId, userId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async transferProcessToDepartment(processId: number, departmentId: number, userId: number): Promise<Process | undefined> {
    try {
      // 1. Obter o processo atual
      const process = await this.getProcess(processId);
      if (!process) {
        throw new Error("Processo não encontrado");
      }

      // Verificar departamento anterior
      const oldDepartmentId = process.currentDepartmentId;
      
      console.log(`Transferindo processo ${processId} do departamento ${oldDepartmentId} para ${departmentId}`);

      // 2. Atualizar o setor atual do processo
      const [updatedProcess] = await db
        .update(processes)
        .set({
          currentDepartmentId: departmentId,
          updatedAt: new Date(),
        })
        .where(eq(processes.id, processId))
        .returning();
      
      // 3. Remover TODOS os participantes atuais do processo para garantir visibilidade correta
      console.log(`Removendo todos os participantes atuais do processo ${processId}`);
      await db
        .delete(processParticipants)
        .where(eq(processParticipants.processId, processId));
      
      // 4. Adicionar o usuário que está fazendo a transferência como participante (se não for o responsável)
      if (process.responsibleId !== userId) {
        console.log(`Adicionando usuário ${userId} como participante do processo ${processId}`);
        await db
          .insert(processParticipants)
          .values({
            processId,
            userId,
            isActive: true,
            notifications: true
          });
      }
      
      // 5. Registrar a transferência no histórico do processo
      console.log(`Registrando transferência do processo ${processId} para o departamento ${departmentId}`);
      await db
        .insert(processSteps)
        .values({
          processId,
          action: `Transferido para o departamento ${departmentId}`,
          userId,
          createdAt: new Date()
        });
        
      return updatedProcess;
    } catch (error) {
      console.error("Erro ao transferir processo:", error);
      throw error;
    }
  }

  // Process steps operations
  async getProcessSteps(processId: number): Promise<ProcessStep[]> {
    try {
      const steps = await db
        .select()
        .from(processSteps)
        .where(eq(processSteps.processId, processId))
        .orderBy(processSteps.id);
      
      return steps || [];
    } catch (error) {
      console.error("Erro na consulta de etapas:", error);
      throw new Error("Falha ao buscar etapas do processo");
    }
  }

  async createProcessStep(step: InsertProcessStep): Promise<ProcessStep> {
    const [newStep] = await db.insert(processSteps).values(step).returning();
    return newStep;
  }

  async updateProcessStep(id: number, stepData: Partial<InsertProcessStep>): Promise<ProcessStep | undefined> {
    const [updatedStep] = await db
      .update(processSteps)
      .set(stepData)
      .where(eq(processSteps.id, id))
      .returning();
    return updatedStep;
  }

  // Analytics functions
  async getProcessesStatistics(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    canceled: number;
  }> {
    // Filtrar processos de acordo com os parâmetros
    const baseQuery = db.select().from(processes);
    
    // Construir condições
    const conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(eq(processes.pbdocNumber, filters.pbdocNumber));
    }
    
    if (filters?.modalityId) {
      conditions.push(eq(processes.modalityId, filters.modalityId));
    }
    
    if (filters?.sourceId) {
      conditions.push(eq(processes.sourceId, filters.sourceId));
    }
    
    if (filters?.responsibleId) {
      conditions.push(eq(processes.responsibleId, filters.responsibleId));
    }
    
    // Aplicar condições
    let filteredProcesses: Process[];
    if (conditions.length > 0) {
      filteredProcesses = await baseQuery.where(and(...conditions));
    } else {
      filteredProcesses = await baseQuery;
    }
    
    // Contar os status
    const total = filteredProcesses.length;
    const completed = filteredProcesses.filter(p => p.status === 'completed').length;
    const inProgress = filteredProcesses.filter(p => p.status === 'in_progress').length;
    const canceled = filteredProcesses.filter(p => p.status === 'canceled').length;
    
    return {
      total,
      completed,
      inProgress,
      canceled
    };
  }

  async getProcessesByMonth(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{month: number; count: number}[]> {
    // Obter todos os processos
    const baseQuery = db.select().from(processes);
    
    // Construir condições
    const conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(eq(processes.pbdocNumber, filters.pbdocNumber));
    }
    
    if (filters?.modalityId) {
      conditions.push(eq(processes.modalityId, filters.modalityId));
    }
    
    if (filters?.sourceId) {
      conditions.push(eq(processes.sourceId, filters.sourceId));
    }
    
    if (filters?.responsibleId) {
      conditions.push(eq(processes.responsibleId, filters.responsibleId));
    }
    
    if (filters?.status) {
      conditions.push(eq(processes.status, filters.status));
    }
    
    // Aplicar condições
    let allProcesses: Process[];
    if (conditions.length > 0) {
      allProcesses = await baseQuery.where(and(...conditions));
    } else {
      allProcesses = await baseQuery;
    }
    
    // Agrupar por mês
    const processesByMonth = new Map<number, number>();
    for (let i = 1; i <= 12; i++) {
      processesByMonth.set(i, 0);
    }
    
    allProcesses.forEach(process => {
      const createdAt = new Date(process.createdAt);
      const month = createdAt.getMonth() + 1; // Janeiro é 0, então adicionar 1
      const currentCount = processesByMonth.get(month) || 0;
      processesByMonth.set(month, currentCount + 1);
    });
    
    // Converter para array de objetos
    return Array.from(processesByMonth.entries()).map(([month, count]) => ({ month, count }));
  }

  async getProcessesBySource(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{sourceId: number; count: number}[]> {
    // Obter todos os processos
    const baseQuery = db.select().from(processes);
    
    // Construir condições
    const conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(eq(processes.pbdocNumber, filters.pbdocNumber));
    }
    
    if (filters?.modalityId) {
      conditions.push(eq(processes.modalityId, filters.modalityId));
    }
    
    if (filters?.sourceId) {
      conditions.push(eq(processes.sourceId, filters.sourceId));
    }
    
    if (filters?.responsibleId) {
      conditions.push(eq(processes.responsibleId, filters.responsibleId));
    }
    
    if (filters?.status) {
      conditions.push(eq(processes.status, filters.status));
    }
    
    // Aplicar condições
    let allProcesses: Process[];
    if (conditions.length > 0) {
      allProcesses = await baseQuery.where(and(...conditions));
    } else {
      allProcesses = await baseQuery;
    }
    
    // Agrupar por fonte de recursos
    const processesBySource = new Map<number, number>();
    
    // Inicializar com todas as fontes de recursos
    const sources = await this.getResourceSources();
    sources.forEach(source => {
      processesBySource.set(source.id, 0);
    });
    
    // Contar processos por fonte
    allProcesses.forEach(process => {
      const sourceId = process.sourceId;
      const currentCount = processesBySource.get(sourceId) || 0;
      processesBySource.set(sourceId, currentCount + 1);
    });
    
    // Converter para array de objetos
    return Array.from(processesBySource.entries()).map(([sourceId, count]) => ({ sourceId, count }));
  }

  async getProcessesByResponsible(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{responsibleId: number; total: number; completed: number}[]> {
    console.log("getProcessesByResponsible - Filtrando com:", filters);
    
    // Obter todos os usuários
    const allUsers = await this.getUsers();
    
    // Obter todos os processos (total)
    const baseQuery = db.select().from(processes);
    
    // Construir condições
    const conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(eq(processes.pbdocNumber, filters.pbdocNumber));
    }
    
    if (filters?.modalityId) {
      conditions.push(eq(processes.modalityId, filters.modalityId));
    }
    
    if (filters?.sourceId) {
      conditions.push(eq(processes.sourceId, filters.sourceId));
    }
    
    if (filters?.status) {
      conditions.push(eq(processes.status, filters.status));
    }
    
    // Aplicar condições para total
    let allProcesses: Process[];
    if (conditions.length > 0) {
      allProcesses = await baseQuery.where(and(...conditions));
    } else {
      allProcesses = await baseQuery;
    }
    
    // Contar total por responsável
    const processesByResponsible = new Map<number, number>();
    
    // Inicializar com todos os usuários
    allUsers.forEach(user => {
      processesByResponsible.set(user.id, 0);
    });
    
    // Contar processos por responsável
    allProcesses.forEach(process => {
      const responsibleId = process.responsibleId;
      const currentCount = processesByResponsible.get(responsibleId) || 0;
      processesByResponsible.set(responsibleId, currentCount + 1);
    });
    
    // Filtrar processos concluídos
    const completedConditions = [...conditions, eq(processes.status, 'completed')];
    
    let completedProcesses: Process[];
    if (completedConditions.length > 0) {
      completedProcesses = await baseQuery.where(and(...completedConditions));
    } else {
      completedProcesses = await baseQuery.where(eq(processes.status, 'completed'));
    }
    
    // Contar concluídos por responsável
    const completedByResponsible = new Map<number, number>();
    
    // Inicializar com todos os usuários
    allUsers.forEach(user => {
      completedByResponsible.set(user.id, 0);
    });
    
    // Contar processos concluídos por responsável
    completedProcesses.forEach(process => {
      const responsibleId = process.responsibleId;
      const currentCount = completedByResponsible.get(responsibleId) || 0;
      completedByResponsible.set(responsibleId, currentCount + 1);
    });
    
    // Combinar totais e concluídos
    return Array.from(processesByResponsible.entries())
      .filter(([_, total]) => total > 0) // Apenas responsáveis com processos
      .map(([responsibleId, total]) => ({
        responsibleId,
        total,
        completed: completedByResponsible.get(responsibleId) || 0
      }));
  }
}