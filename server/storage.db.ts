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
import { eq, and, or, count, sql, inArray, like } from "drizzle-orm";
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
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : undefined;
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
    const [created] = await db.insert(departments).values(department).returning();
    return created;
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
    const [created] = await db.insert(biddingModalities).values(modality).returning();
    return created;
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
    const [created] = await db.insert(resourceSources).values(source).returning();
    return created;
  }

  // Process operations
  async getProcess(id: number, userId?: number): Promise<Process | undefined> {
    const [process] = await db.select().from(processes).where(eq(processes.id, id));
    return process;
  }

  async getProcesses(filters?: any): Promise<Process[]> {
    let query = db.select().from(processes);
    
    if (filters?.currentDepartmentId) {
      query = query.where(eq(processes.currentDepartmentId, filters.currentDepartmentId));
    }
    
    return await query;
  }

  async createProcess(process: InsertProcess): Promise<Process> {
    const [created] = await db.insert(processes).values(process).returning();
    return created;
  }

  // Process participant operations
  async getProcessParticipants(processId: number): Promise<ProcessParticipant[]> {
    return await db.select().from(processParticipants).where(eq(processParticipants.processId, processId));
  }

  async addProcessParticipant(participant: InsertProcessParticipant): Promise<ProcessParticipant> {
    const [created] = await db.insert(processParticipants).values(participant).returning();
    return created;
  }

  async removeProcessParticipant(processId: number, userId: number): Promise<boolean> {
    const result = await db.delete(processParticipants)
      .where(and(
        eq(processParticipants.processId, processId),
        eq(processParticipants.userId, userId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async transferProcessToDepartment(processId: number, departmentId: number, userId: number): Promise<Process | undefined> {
    const [updatedProcess] = await db
      .update(processes)
      .set({ currentDepartmentId: departmentId })
      .where(eq(processes.id, processId))
      .returning();
    return updatedProcess;
  }

  // Required interface methods - stub implementations
  async returnProcess(processId: number, returnComment: string, userId: number): Promise<Process | undefined> {
    try {
      console.log(`Tentando retornar processo ${processId} com comentário: ${returnComment}`);
      
      // Buscar o processo atual
      const [currentProcess] = await db
        .select()
        .from(processes)
        .where(eq(processes.id, processId));
      
      if (!currentProcess) {
        console.log(`Processo ${processId} não encontrado`);
        return undefined;
      }
      
      console.log(`Processo encontrado. Departamento atual: ${currentProcess.currentDepartmentId}`);
      
      // Fluxo de departamentos definido no sistema
      const departmentFlow = [1, 2, 3, 4, 5]; // Setor Demandante, Divisão, NPP, Orçamento, Secretário
      
      // Encontrar o índice do departamento atual
      const currentIndex = departmentFlow.findIndex(id => id === currentProcess.currentDepartmentId);
      
      if (currentIndex <= 0) {
        console.log(`Processo no primeiro departamento, não pode ser retornado`);
        return undefined; // Processo já está no primeiro departamento
      }
      
      // Departamento anterior no fluxo
      const previousDepartmentId = departmentFlow[currentIndex - 1];
      
      console.log(`Retornando processo do departamento ${currentProcess.currentDepartmentId} para ${previousDepartmentId}`);
      
      // Atualizar o processo com o novo departamento e comentário de retorno
      const [updatedProcess] = await db
        .update(processes)
        .set({
          currentDepartmentId: previousDepartmentId,
          returnComments: returnComment,
          status: 'in_progress', // Garantir que o status seja adequado
          lastModified: new Date()
        })
        .where(eq(processes.id, processId))
        .returning();
      
      console.log(`Processo ${processId} retornado com sucesso para departamento ${previousDepartmentId}`);
      
      return updatedProcess;
    } catch (error) {
      console.error('Erro ao retornar processo:', error);
      return undefined;
    }
  }

  async updateProcess(id: number, processData: Partial<InsertProcess>): Promise<Process | undefined> {
    const [updated] = await db
      .update(processes)
      .set(processData)
      .where(eq(processes.id, id))
      .returning();
    return updated;
  }

  async deleteProcess(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(processes).where(eq(processes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getDeletedProcesses(): Promise<any[]> {
    return [];
  }

  async restoreProcess(id: number, userId: number): Promise<Process | undefined> {
    return undefined;
  }

  async permanentlyDeleteProcess(id: number): Promise<boolean> {
    return false;
  }

  async getProcessSteps(processId: number): Promise<ProcessStep[]> {
    return await db.select().from(processSteps).where(eq(processSteps.processId, processId));
  }

  async createProcessStep(step: InsertProcessStep): Promise<ProcessStep> {
    const [created] = await db.insert(processSteps).values(step).returning();
    return created;
  }

  async updateProcessStep(id: number, stepData: Partial<InsertProcessStep>): Promise<ProcessStep | undefined> {
    const [updated] = await db
      .update(processSteps)
      .set(stepData)
      .where(eq(processSteps.id, id))
      .returning();
    return updated;
  }

  // Analytics methods - implementações reais
  async getProcessesStatistics(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{
    total: number;
    inProgress: number;
    overdue: number;
    completed: number;
    canceled: number;
  }> {
    console.log('getProcessesStatistics - Filtros recebidos:', filters);

    try {
      // Construir query base
      let query = db
        .select({
          status: processes.status,
          deadline: processes.deadline,
        })
        .from(processes);

      // Aplicar filtros
      const conditions = [];
      if (filters?.pbdocNumber) {
        conditions.push(like(processes.pbdocNumber, `%${filters.pbdocNumber}%`));
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

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query;
      console.log('getProcessesStatistics - Resultados brutos:', results.length);

      // Calcular estatísticas
      const stats = {
        total: results.length,
        inProgress: 0,
        overdue: 0,
        completed: 0,
        canceled: 0,
      };

      const now = new Date();

      results.forEach(process => {
        switch (process.status) {
          case 'completed':
            stats.completed++;
            break;
          case 'canceled':
            stats.canceled++;
            break;
          case 'overdue':
            stats.overdue++;
            break;
          default:
            // Verificar se está atrasado baseado na deadline
            if (process.deadline && new Date(process.deadline) < now) {
              stats.overdue++;
            } else {
              stats.inProgress++;
            }
        }
      });

      console.log('getProcessesStatistics - Estatísticas finais:', stats);
      return stats;

    } catch (error) {
      console.error('Erro em getProcessesStatistics:', error);
      return {
        total: 0,
        inProgress: 0,
        overdue: 0,
        completed: 0,
        canceled: 0,
      };
    }
  }

  async getProcessesByMonth(): Promise<any[]> {
    return [];
  }

  async getProcessesBySource(): Promise<any[]> {
    return [];
  }

  async getProcessesByResponsible(): Promise<any[]> {
    return [];
  }

  async getTemporalDistribution(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }, period?: string): Promise<{
    period: string;
    inProgress: number;
    overdue: number;
    completed: number;
  }[]> {
    console.log('getTemporalDistribution - Filtros recebidos:', filters);
    console.log('getTemporalDistribution - Período:', period);

    try {
      // Construir query base
      let query = db
        .select({
          createdAt: processes.createdAt,
          status: processes.status,
          deadline: processes.deadline,
        })
        .from(processes);

      // Aplicar filtros
      const conditions = [];
      if (filters?.pbdocNumber) {
        conditions.push(like(processes.pbdocNumber, `%${filters.pbdocNumber}%`));
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

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query;
      console.log('getTemporalDistribution - Resultados brutos:', results.length);

      // Agrupar por período (mês/ano)
      const grouped = new Map<string, {
        inProgress: number;
        overdue: number;
        completed: number;
      }>();

      const now = new Date();

      results.forEach(process => {
        const date = new Date(process.createdAt);
        const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!grouped.has(periodKey)) {
          grouped.set(periodKey, {
            inProgress: 0,
            overdue: 0,
            completed: 0
          });
        }

        const stats = grouped.get(periodKey)!;
        
        // Classificar status
        if (process.status === 'completed') {
          stats.completed++;
        } else if (process.status === 'overdue' || (process.deadline && new Date(process.deadline) < now)) {
          stats.overdue++;
        } else {
          stats.inProgress++;
        }
      });

      // Converter para array ordenado
      const temporalData = Array.from(grouped.entries())
        .map(([period, stats]) => ({
          period,
          ...stats
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      console.log('getTemporalDistribution - Dados finais:', temporalData);
      return temporalData;

    } catch (error) {
      console.error('Erro em getTemporalDistribution:', error);
      return [];
    }
  }

  async getDepartmentRanking(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{
    departmentId: number;
    departmentName: string;
    total: number;
    inProgress: number;
    overdue: number;
    completed: number;
  }[]> {
    console.log('getDepartmentRanking - Filtros recebidos:', filters);

    try {
      // Construir query base
      let query = db
        .select({
          currentDepartmentId: processes.currentDepartmentId,
          status: processes.status,
          deadline: processes.deadline,
        })
        .from(processes);

      // Aplicar filtros
      const conditions = [];
      if (filters?.pbdocNumber) {
        conditions.push(like(processes.pbdocNumber, `%${filters.pbdocNumber}%`));
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

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query;
      console.log('getDepartmentRanking - Resultados brutos:', results.length);

      // Buscar departamentos
      const departmentsList = await db.select().from(departments);
      const departmentMap = new Map(departmentsList.map(d => [d.id, d.name]));

      // Agrupar por departamento
      const grouped = new Map<number, {
        total: number;
        inProgress: number;
        overdue: number;
        completed: number;
      }>();

      const now = new Date();

      results.forEach(process => {
        const deptId = process.currentDepartmentId;
        
        if (!grouped.has(deptId)) {
          grouped.set(deptId, {
            total: 0,
            inProgress: 0,
            overdue: 0,
            completed: 0
          });
        }

        const stats = grouped.get(deptId)!;
        stats.total++;
        
        // Classificar status
        if (process.status === 'completed') {
          stats.completed++;
        } else if (process.status === 'overdue' || (process.deadline && new Date(process.deadline) < now)) {
          stats.overdue++;
        } else {
          stats.inProgress++;
        }
      });

      // Converter para array ordenado
      const rankingData = Array.from(grouped.entries())
        .map(([departmentId, stats]) => ({
          departmentId,
          departmentName: departmentMap.get(departmentId) || 'Departamento não encontrado',
          ...stats
        }))
        .sort((a, b) => b.total - a.total);

      console.log('getDepartmentRanking - Dados finais:', rankingData);
      return rankingData;

    } catch (error) {
      console.error('Erro em getDepartmentRanking:', error);
      return [];
    }
  }

  // Convenio operations - stub implementations
  async getConvenios(): Promise<any[]> {
    return [];
  }

  async getConvenio(id: number): Promise<any | undefined> {
    return undefined;
  }

  async createConvenio(convenio: any): Promise<any> {
    return {};
  }

  async updateConvenio(id: number, convenioData: any): Promise<any | undefined> {
    return undefined;
  }

  async deleteConvenio(id: number): Promise<boolean> {
    return false;
  }
}

export const storage = new DatabaseStorage();