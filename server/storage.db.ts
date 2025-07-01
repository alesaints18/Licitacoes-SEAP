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
import { eq, and, or, count, sql, inArray } from "drizzle-orm";
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
    // Se userId for fornecido, verifica se o usuário tem acesso ao processo
    if (userId) {
      // Verifica se o usuário é admin
      const [admin] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.role, 'admin')
        ));

      // Se não for admin, verifica regras de acesso
      if (!admin) {
        // Obtém o usuário para verificar seu departamento
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) return undefined;
        
        // Obtém o processo
        const [process] = await db.select().from(processes).where(eq(processes.id, id));
        if (!process) return undefined;
        
        // Verifica se o usuário é participante ativo do processo
        const [participant] = await db
          .select()
          .from(processParticipants)
          .where(and(
            eq(processParticipants.processId, id),
            eq(processParticipants.userId, userId),
            eq(processParticipants.isActive, true)
          ));
        
        // Verifica se o processo está no departamento do usuário
        // Aqui precisamos converter a string "department" para número para comparação
        const userDepartmentId = parseInt(user.department);
        const isUserDepartment = (process.currentDepartmentId === userDepartmentId);
        
        // Se não for participante E o processo não estiver no departamento do usuário, retorna undefined
        if (!participant && !isUserDepartment) {
          console.log(`Acesso negado: Usuário ${userId} não tem acesso ao processo ${id}`);
          return undefined;
        }
      }
    }
    
    const [process] = await db.select().from(processes).where(eq(processes.id, id));
    return process;
  }

  async getProcesses(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
    userId?: number;
  }): Promise<Process[]> {
    try {
      const conditions: any[] = [];
      
      // Aplicar filtros básicos se fornecidos
      if (filters) {
        if (filters.pbdocNumber) {
          conditions.push(sql`${processes.pbdocNumber} ILIKE ${`%${filters.pbdocNumber}%`}`);
        }
        
        if (filters.modalityId) {
          conditions.push(eq(processes.modalityId, filters.modalityId));
        }
        
        if (filters.sourceId) {
          conditions.push(eq(processes.sourceId, filters.sourceId));
        }
        
        if (filters.responsibleId) {
          conditions.push(eq(processes.responsibleId, filters.responsibleId));
        }
        
        if (filters.status) {
          conditions.push(eq(processes.status, filters.status as any));
        }
      }
      
      // Verificar se precisa filtrar por acesso do usuário
      if (filters?.userId) {
        // Verificar se é admin
        const [adminUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.id, filters.userId),
            eq(users.role, 'admin')
          ));
          
        if (!adminUser) {
          console.log(`Usuário ${filters.userId} não é admin - aplicando restrições de acesso`);
          
          // Buscar o usuário
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, filters.userId));
            
          if (!user) {
            return [];
          }
          
          // Buscar o departamento do usuário
          const [userDept] = await db
            .select()
            .from(departments)
            .where(eq(departments.name, user.department));
            
          if (!userDept) {
            return [];
          }
          
          const departmentId = userDept.id;
          console.log(`Usuário ${user.username} (ID: ${user.id}) pertence ao departamento ${user.department} (ID: ${departmentId})`);
          
          // Buscar processos onde o usuário é participante ativo
          const participantProcesses = await db
            .select()
            .from(processParticipants)
            .where(and(
              eq(processParticipants.userId, user.id),
              eq(processParticipants.isActive, true)
            ));
            
          console.log(`Usuário ${user.username} é participante de ${participantProcesses.length} processos`);
          
          // Lista de IDs de processos onde o usuário é participante
          const participantProcessIds = participantProcesses.map(p => p.processId);
          
          // Aplicar condição OR usando SQL literal para máxima compatibilidade:
          // 1. O processo pertence ao departamento do usuário, OU
          // 2. O usuário é responsável pelo processo, OU
          // 3. O usuário é participante ativo do processo
          if (participantProcessIds.length > 0) {
            conditions.push(sql`(${processes.currentDepartmentId} = ${departmentId} OR ${processes.responsibleId} = ${user.id} OR ${processes.id} IN (${participantProcessIds.join(',')}))`);
          } else {
            conditions.push(sql`(${processes.currentDepartmentId} = ${departmentId} OR ${processes.responsibleId} = ${user.id})`);
          }
        } else {
          console.log(`Usuário ${filters.userId} é admin - vendo todos os processos`);
        }
      }
      
      // Executar a consulta
      if (conditions.length > 0) {
        const result = await db
          .select()
          .from(processes)
          .where(and(...conditions))
          .orderBy(processes.createdAt);
          
        console.log(`Consulta retornou ${result.length} processos`);
        return result;
      } else {
        const result = await db
          .select()
          .from(processes)
          .orderBy(processes.createdAt);
          
        console.log(`Consulta retornou ${result.length} processos (sem filtros)`);
        return result;
      }
    } catch (error) {
      console.error("Erro ao buscar processos:", error);
      return [];
    }
  }

  async createProcess(process: InsertProcess): Promise<Process> {
    const [newProcess] = await db.insert(processes).values(process).returning();
    return newProcess;
  }
  
  // Implementação das funções de participantes do processo
  async getProcessParticipants(processId: number): Promise<ProcessParticipant[]> {
    const participants = await db
      .select()
      .from(processParticipants)
      .where(eq(processParticipants.processId, processId));
    return participants;
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
    return result.rowCount > 0;
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
            .set({ isActive: false })
            .where(and(
              eq(processParticipants.processId, processId),
              eq(processParticipants.departmentId, oldDepartmentId)
            ));
            
          // Registrar a inativação como um evento de log
          console.log(`Departamento ${oldDepartment.name} perdeu acesso ao processo ${processId}`);
        }
      }
      
      // 4. Adicionar o usuário atual como participante no novo departamento
      // Verificar se o usuário já é participante
      const [existingParticipant] = await db
        .select()
        .from(processParticipants)
        .where(and(
          eq(processParticipants.processId, processId),
          eq(processParticipants.userId, userId),
          eq(processParticipants.departmentId, departmentId)
        ));
      
      if (existingParticipant) {
        // Se já existe, apenas atualizar para ativo
        await db
          .update(processParticipants)
          .set({ isActive: true })
          .where(and(
            eq(processParticipants.processId, processId),
            eq(processParticipants.userId, userId),
            eq(processParticipants.departmentId, departmentId)
          ));
      } else {
        // Adicionar novo registro
        await db
          .insert(processParticipants)
          .values({
            processId,
            userId,
            departmentId,
            role: 'editor',
            isActive: true,
          });
      }
      
      // 5. Registrar a transferência como uma etapa do processo
      await this.createProcessStep({
        processId,
        stepName: `Transferência para setor ${departmentId}`,
        departmentId,
        isCompleted: true,
        completedBy: userId,
        observations: `Processo transferido do setor ${oldDepartmentId} para ${departmentId}`
      });
      
      console.log(`Processo ${processId} transferido para o setor ${departmentId} pelo usuário ${userId}`);
      
      return updatedProcess;
    } catch (error) {
      console.error("Erro ao transferir processo:", error);
      return undefined;
    }
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

  // Process step operations
  async getProcessSteps(processId: number): Promise<ProcessStep[]> {
    return await db
      .select()
      .from(processSteps)
      .where(eq(processSteps.processId, processId));
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

  // Dashboard analytics
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
    console.log("getProcessesStatistics - Filtrando com:", filters);
    
    // Construir condições de filtro
    let conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(sql`${processes.pbdocNumber} LIKE ${`%${filters.pbdocNumber}%`}`);
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
    
    // Combine as condições com 'AND' ou use uma condição padrão 'true'
    const whereClause = conditions.length > 0
      ? and(...conditions)
      : undefined; // Se não houver condições, não aplique filtro
    
    // Consulta total com filtros
    const totalQuery = whereClause 
      ? db.select({ value: count() }).from(processes).where(whereClause)
      : db.select({ value: count() }).from(processes);
    
    const totalResult = await totalQuery;
    const total = totalResult[0]?.value || 0;
    
    // Consulta completados com filtros + status 'completed'
    const completedConditions = [...(conditions || []), eq(processes.status, 'completed')];
    const completedWhereClause = completedConditions.length > 0 
      ? and(...completedConditions)
      : eq(processes.status, 'completed');
    
    const completedResult = await db
      .select({ value: count() })
      .from(processes)
      .where(completedWhereClause);
    const completed = completedResult[0]?.value || 0;
    
    // Consulta em andamento com filtros + status 'in_progress'
    const inProgressConditions = [...(conditions || []), eq(processes.status, 'in_progress')];
    const inProgressWhereClause = inProgressConditions.length > 0 
      ? and(...inProgressConditions)
      : eq(processes.status, 'in_progress');
    
    const inProgressResult = await db
      .select({ value: count() })
      .from(processes)
      .where(inProgressWhereClause);
    const inProgress = inProgressResult[0]?.value || 0;
    
    // Consulta cancelados com filtros + status 'canceled'
    const canceledConditions = [...(conditions || []), eq(processes.status, 'canceled')];
    const canceledWhereClause = canceledConditions.length > 0 
      ? and(...canceledConditions)
      : eq(processes.status, 'canceled');
    
    const canceledResult = await db
      .select({ value: count() })
      .from(processes)
      .where(canceledWhereClause);
    const canceled = canceledResult[0]?.value || 0;
    
    return { total, completed, inProgress, canceled };
  }

  async getProcessesByMonth(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{month: number; count: number}[]> {
    console.log("getProcessesByMonth - Filtrando com:", filters);
    
    // Construir condições de filtro
    let conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(sql`${processes.pbdocNumber} LIKE ${`%${filters.pbdocNumber}%`}`);
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
    
    // Adicionar condição de ano atual
    const currentYear = new Date().getFullYear();
    conditions.push(sql`EXTRACT(YEAR FROM ${processes.createdAt}) = ${currentYear}`);
    
    // Combine as condições com 'AND'
    const whereClause = conditions.length > 0
      ? and(...conditions)
      : sql`EXTRACT(YEAR FROM ${processes.createdAt}) = ${currentYear}`;
    
    const result = await db
      .select({
        month: sql`EXTRACT(MONTH FROM ${processes.createdAt})::integer`,
        count: count()
      })
      .from(processes)
      .where(whereClause)
      .groupBy(sql`EXTRACT(MONTH FROM ${processes.createdAt})::integer`);

    // Fill in missing months
    const resultMap = new Map<number, number>();
    result.forEach(r => {
      // Ensure month is treated as a number
      const month = typeof r.month === 'number' ? r.month : parseInt(String(r.month), 10);
      resultMap.set(month, r.count);
    });
    
    const filledResults: {month: number; count: number}[] = [];
    for (let i = 1; i <= 12; i++) {
      filledResults.push({
        month: i,
        count: resultMap.get(i) || 0
      });
    }
    
    return filledResults;
  }

  async getProcessesBySource(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{sourceId: number; count: number}[]> {
    console.log("getProcessesBySource - Filtrando com:", filters);
    
    // Construir condições de filtro
    let conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(sql`${processes.pbdocNumber} LIKE ${`%${filters.pbdocNumber}%`}`);
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
      conditions.push(eq(processes.status, filters.status as any));
    }
    
    // Combine as condições com 'AND' ou não aplique filtro
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const query = whereClause 
      ? db.select({
          sourceId: processes.sourceId,
          count: count()
        })
        .from(processes)
        .where(whereClause)
        .groupBy(processes.sourceId)
      : db.select({
          sourceId: processes.sourceId,
          count: count()
        })
        .from(processes)
        .groupBy(processes.sourceId);
    
    return await query;
  }

  async getProcessesByResponsible(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{responsibleId: number; total: number; completed: number}[]> {
    console.log("getProcessesByResponsible - Filtrando com:", filters);
    
    // Construir condições de filtro
    let conditions = [];
    
    if (filters?.pbdocNumber) {
      conditions.push(sql`${processes.pbdocNumber} LIKE ${`%${filters.pbdocNumber}%`}`);
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
      conditions.push(sql`${processes.status}::text = ${filters.status}`);
    }
    
    // Combine as condições com 'AND' ou não aplique filtro
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Consulta total com filtros
    const totalQuery = whereClause 
      ? db.select({
          responsibleId: processes.responsibleId,
          total: count()
        })
        .from(processes)
        .where(whereClause)
        .groupBy(processes.responsibleId)
      : db.select({
          responsibleId: processes.responsibleId,
          total: count()
        })
        .from(processes)
        .groupBy(processes.responsibleId);
    
    const totalByResponsible = await totalQuery;
      
    // Consulta completados com filtros + status 'completed'
    const completedConditions = [...conditions];
    completedConditions.push(sql`${processes.status}::text = 'completed'`);
    
    const completedWhereClause = completedConditions.length > 0 
      ? and(...completedConditions)
      : sql`${processes.status}::text = 'completed'`;
    
    const completedByResponsible = await db
      .select({
        responsibleId: processes.responsibleId,
        completed: count()
      })
      .from(processes)
      .where(completedWhereClause)
      .groupBy(processes.responsibleId);
    
    const responsibleCompletedMap = new Map<number, number>();
    completedByResponsible.forEach(r => 
      responsibleCompletedMap.set(r.responsibleId, r.completed)
    );
    
    return totalByResponsible.map(r => ({
      responsibleId: r.responsibleId,
      total: r.total,
      completed: responsibleCompletedMap.get(r.responsibleId) || 0
    }));
  }
}