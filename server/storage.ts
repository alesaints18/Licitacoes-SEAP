import { 
  users, type User, type InsertUser, 
  departments, type Department, type InsertDepartment,
  biddingModalities, type BiddingModality, type InsertBiddingModality,
  resourceSources, type ResourceSource, type InsertResourceSource,
  processes, type Process, type InsertProcess,
  processSteps, type ProcessStep, type InsertProcessStep
} from "@shared/schema";
import { compareSync, hashSync } from "bcrypt";
import { addBusinessDays } from "./business-days";

// Storage interface with CRUD operations
// Temporary type definitions for missing types
type ProcessParticipant = {
  id: number;
  processId: number;
  userId: number;
  role?: string;
  isActive?: boolean;
  departmentId?: number | null;
  addedAt: Date;
};

type InsertProcessParticipant = Omit<ProcessParticipant, 'id' | 'addedAt'>;

type Convenio = {
  id: number;
  numero: string;
  objeto: string;
  valor: number;
  dataInicio: Date;
  dataFim: Date;
  status: string;
  observacoes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type InsertConvenio = Omit<Convenio, 'id' | 'createdAt' | 'updatedAt'>;

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  authenticateUser(username: string, password: string): Promise<User | undefined>;

  // Department operations
  getDepartment(id: number): Promise<Department | undefined>;
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;

  // Bidding modality operations
  getBiddingModality(id: number): Promise<BiddingModality | undefined>;
  getBiddingModalities(): Promise<BiddingModality[]>;
  createBiddingModality(modality: InsertBiddingModality): Promise<BiddingModality>;

  // Resource source operations
  getResourceSource(id: number): Promise<ResourceSource | undefined>;
  getResourceSources(): Promise<ResourceSource[]>;
  createResourceSource(source: InsertResourceSource): Promise<ResourceSource>;

  // Process operations
  getProcess(id: number, userId?: number): Promise<Process | undefined>;
  getProcesses(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
    currentDepartmentId?: number; // Filtrar por departamento atual do processo
    userId?: number; // Adicionado userId para filtrar por participante
    includeDeleted?: boolean; // Incluir processos excluídos
  }): Promise<Process[]>;
  
  // Process participant operations
  getProcessParticipants(processId: number): Promise<ProcessParticipant[]>;
  addProcessParticipant(participant: InsertProcessParticipant): Promise<ProcessParticipant>;
  removeProcessParticipant(processId: number, userId: number): Promise<boolean>;
  
  // Transferência entre setores
  transferProcessToDepartment(processId: number, departmentId: number, userId: number): Promise<Process | undefined>;
  
  // Funcionalidade de retorno de processo
  returnProcess(processId: number, returnComment: string, userId: number): Promise<Process | undefined>;
  createProcess(process: InsertProcess): Promise<Process>;
  updateProcess(id: number, processData: Partial<InsertProcess>): Promise<Process | undefined>;
  deleteProcess(id: number, userId: number): Promise<boolean>;
  
  // Lixeira eletrônica
  getDeletedProcesses(): Promise<any[]>;
  restoreProcess(id: number, userId: number): Promise<Process | undefined>;
  permanentlyDeleteProcess(id: number): Promise<boolean>;

  // Process step operations
  getProcessSteps(processId: number): Promise<ProcessStep[]>;
  createProcessStep(step: InsertProcessStep): Promise<ProcessStep>;
  updateProcessStep(id: number, stepData: Partial<InsertProcessStep>): Promise<ProcessStep | undefined>;
  
  // Dashboard analytics
  getProcessesStatistics(filters?: {
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
  }>;
  getProcessesByMonth(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{month: number; count: number}[]>;
  getProcessesBySource(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{sourceId: number; count: number}[]>;
  getProcessesByResponsible(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{responsibleId: number; total: number; completed: number}[]>;

  // Novos métodos de analytics
  getTemporalDistribution(filters?: {
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
  }[]>;

  getDepartmentRanking(filters?: {
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
  }[]>;

  // Convenio operations
  getConvenios(): Promise<Convenio[]>;
  getConvenio(id: number): Promise<Convenio | undefined>;
  createConvenio(convenio: InsertConvenio): Promise<Convenio>;
  updateConvenio(id: number, convenioData: Partial<InsertConvenio>): Promise<Convenio | undefined>;
  deleteConvenio(id: number): Promise<boolean>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private biddingModalities: Map<number, BiddingModality>;
  private resourceSources: Map<number, ResourceSource>;
  private processes: Map<number, Process>;
  private processSteps: Map<number, ProcessStep>;
  private convenios: Map<number, Convenio>;
  
  private currentUserId: number;
  private currentDepartmentId: number;
  private currentModalityId: number;
  private currentSourceId: number;
  private currentProcessId: number;
  private currentStepId: number;
  private currentConvenioId: number;

  constructor() {
    this.users = new Map();
    this.departments = new Map();
    this.biddingModalities = new Map();
    this.resourceSources = new Map();
    this.processes = new Map();
    this.processSteps = new Map();
    
    this.currentUserId = 1;
    this.currentDepartmentId = 1;
    this.currentModalityId = 1;
    this.currentSourceId = 1;
    this.currentProcessId = 1;
    this.currentStepId = 1;
    
    this.seedInitialData();
  }

  // Initialize with some demo data
  private seedInitialData() {
    // Create departments
    const departments = [
      { name: "Licitação", description: "Departamento responsável pelas licitações" },
      { name: "Contratos", description: "Departamento responsável pelos contratos" },
      { name: "Engenharia", description: "Departamento responsável pelos projetos de engenharia" },
      { name: "Planejamento", description: "Departamento responsável pelo planejamento" }
    ];
    
    departments.forEach(dept => this.createDepartment(dept));
    
    // Create admin user
    this.createUser({
      username: "admin",
      password: hashSync("admin123", 10),
      fullName: "Administrador Sistema",
      email: "admin@seap.pb.gov.br",
      department: "Planejamento",
      role: "admin",
      isActive: true
    });
    
    // Create common user
    this.createUser({
      username: "gabriel",
      password: hashSync("gabriel123", 10),
      fullName: "Gabriel Lucas de Oliveira Silva",
      email: "gabriel@seap.pb.gov.br",
      department: "Licitação",
      role: "common",
      isActive: true
    });
    
    // Create bidding modalities with automatic deadline days
    const modalities = [
      { name: "Pregão Eletrônico", description: "Modalidade de licitação para aquisição de bens e serviços comuns", deadlineDays: 3 },
      { name: "Concorrência", description: "Modalidade de licitação entre quaisquer interessados que comprovem possuir os requisitos mínimos", deadlineDays: 5 },
      { name: "Dispensa", description: "Contratação direta sem licitação", deadlineDays: 7 },
      { name: "Inexigibilidade", description: "Contratação direta quando há inviabilidade de competição", deadlineDays: 7 }
    ];
    
    modalities.forEach(mod => this.createBiddingModality(mod));
    
    // Create resource sources
    const sources = [
      { code: "500", description: "Recursos do Tesouro Estadual" },
      { code: "700", description: "Recursos do FUNPEN" },
      { code: "760", description: "Recursos de Convênios" }
    ];
    
    sources.forEach(source => this.createResourceSource(source));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const hashedPassword = insertUser.password.startsWith('$2') 
      ? insertUser.password 
      : hashSync(insertUser.password, 10);
    
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
    };
    
    this.users.set(id, user);
    return { ...user, password: '***' } as User;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => ({ ...user, password: '***' }) as User);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...userData,
      password: userData.password ? hashSync(userData.password, 10) : user.password,
    };

    this.users.set(id, updatedUser);
    return { ...updatedUser, password: '***' } as User;
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user) return undefined;
    
    const passwordMatch = compareSync(password, user.password);
    if (!passwordMatch) return undefined;
    
    return { ...user, password: '***' } as User;
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const id = this.currentDepartmentId++;
    const newDepartment: Department = { ...department, id };
    this.departments.set(id, newDepartment);
    return newDepartment;
  }

  // Bidding modality methods
  async getBiddingModality(id: number): Promise<BiddingModality | undefined> {
    return this.biddingModalities.get(id);
  }

  async getBiddingModalities(): Promise<BiddingModality[]> {
    return Array.from(this.biddingModalities.values());
  }

  async createBiddingModality(modality: InsertBiddingModality): Promise<BiddingModality> {
    const id = this.currentModalityId++;
    const newModality: BiddingModality = { ...modality, id };
    this.biddingModalities.set(id, newModality);
    return newModality;
  }

  // Resource source methods
  async getResourceSource(id: number): Promise<ResourceSource | undefined> {
    return this.resourceSources.get(id);
  }

  async getResourceSources(): Promise<ResourceSource[]> {
    return Array.from(this.resourceSources.values());
  }

  async createResourceSource(source: InsertResourceSource): Promise<ResourceSource> {
    const id = this.currentSourceId++;
    const newSource: ResourceSource = { ...source, id };
    this.resourceSources.set(id, newSource);
    return newSource;
  }

  // Process methods
  async getProcess(id: number): Promise<Process | undefined> {
    return this.processes.get(id);
  }

  async getProcesses(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
    currentDepartmentId?: number;
  }): Promise<Process[]> {
    let processes = Array.from(this.processes.values());
    
    // Por padrão, filtrar processos excluídos (soft delete)
    if (!filters?.includeDeleted) {
      processes = processes.filter(p => p.deletedAt === null || p.deletedAt === undefined);
    }
    
    if (filters) {
      if (filters.pbdocNumber) {
        processes = processes.filter(p => p.pbdocNumber.includes(filters.pbdocNumber!));
        console.log(`Após filtro pbdocNumber (${filters.pbdocNumber}):`, processes.length);
      }
      
      if (filters.modalityId) {
        processes = processes.filter(p => p.modalityId === filters.modalityId);
        console.log(`Após filtro modalityId (${filters.modalityId}):`, processes.length);
      }
      
      if (filters.sourceId) {
        processes = processes.filter(p => p.sourceId === filters.sourceId);
        console.log(`Após filtro sourceId (${filters.sourceId}):`, processes.length);
      }
      
      if (filters.responsibleId) {
        console.log(`Aplicando filtro responsibleId (${filters.responsibleId}). Processos antes:`, processes.length);
        console.log(`Valores de responsibleId nos processos:`, processes.map(p => p.responsibleId));
        
        // Vamos garantir que a comparação seja entre números
        const responsibleIdNum = Number(filters.responsibleId);
        processes = processes.filter(p => p.responsibleId === responsibleIdNum);
        console.log(`Após filtro responsibleId (${responsibleIdNum}):`, processes.length);
        console.log("Processos filtrados:", processes.map(p => ({
          id: p.id,
          pbdoc: p.pbdocNumber,
          responsible: p.responsibleId
        })));
      }
      
      if (filters.status) {
        processes = processes.filter(p => p.status === filters.status);
        console.log(`Após filtro status (${filters.status}):`, processes.length);
      }

      if (filters.currentDepartmentId) {
        console.log(`Aplicando filtro por departamento. Departamento solicitado: ${filters.currentDepartmentId}`);
        console.log(`Processos antes do filtro:`, processes.map(p => ({
          id: p.id,
          pbdoc: p.pbdocNumber,
          currentDepartmentId: p.currentDepartmentId
        })));
        
        processes = processes.filter(p => p.currentDepartmentId === filters.currentDepartmentId);
        console.log(`Após filtro currentDepartmentId (${filters.currentDepartmentId}):`, processes.length);
        
        if (processes.length === 0) {
          console.log(`Nenhum processo encontrado para o departamento ${filters.currentDepartmentId}`);
        }
      }
    }
    
    console.log(`Retornando ${processes.length} processos após aplicação de todos os filtros`);
    return processes;
  }

  async createProcess(process: InsertProcess): Promise<Process> {
    const id = this.currentProcessId++;
    const now = new Date();
    
    // Busca a modalidade para calcular o prazo
    const modality = this.biddingModalities.get(process.modalityId);
    let deadline: Date | null = null;
    
    if (modality && modality.deadlineDays) {
      // Calcula o prazo usando apenas dias úteis
      deadline = addBusinessDays(now, modality.deadlineDays);
    }
    
    const newProcess: Process = { 
      ...process, 
      id,
      createdAt: now,
      updatedAt: now,
      status: process.status || "draft",
      priority: process.priority || "medium",
      currentDepartmentId: process.currentDepartmentId || null,
      centralDeCompras: process.centralDeCompras || null,
      returnComments: process.returnComments || null,
      deadline: deadline,
      deletedAt: null,
      deletedBy: null,
    };
    
    this.processes.set(id, newProcess);
    return newProcess;
  }

  async updateProcess(id: number, processData: Partial<InsertProcess>): Promise<Process | undefined> {
    const process = this.processes.get(id);
    if (!process) return undefined;

    const updatedProcess: Process = {
      ...process,
      ...processData,
      updatedAt: new Date()
    };

    this.processes.set(id, updatedProcess);
    return updatedProcess;
  }

  async deleteProcess(id: number, userId: number): Promise<boolean> {
    const process = this.processes.get(id);
    if (!process) return false;
    
    // Soft delete - marca como excluído
    const updatedProcess: Process = {
      ...process,
      deletedAt: new Date(),
      deletedBy: userId,
      updatedAt: new Date(),
    };
    
    this.processes.set(id, updatedProcess);
    return true;
  }

  async getDeletedProcesses(): Promise<Process[]> {
    const allProcesses = Array.from(this.processes.values());
    console.log(`Total de processos no storage: ${allProcesses.length}`);
    
    const deletedProcesses = allProcesses.filter(p => {
      console.log(`Processo ${p.id}: deletedAt = ${p.deletedAt}, deletedBy = ${p.deletedBy}`);
      return p.deletedAt !== null;
    });
    
    console.log(`Processos excluídos encontrados: ${deletedProcesses.length}`);
    return deletedProcesses;
  }

  async restoreProcess(id: number, userId: number): Promise<Process | undefined> {
    const process = this.processes.get(id);
    if (!process || !process.deletedAt) return undefined;
    
    const restoredProcess: Process = {
      ...process,
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    };
    
    this.processes.set(id, restoredProcess);
    return restoredProcess;
  }

  async permanentlyDeleteProcess(id: number): Promise<boolean> {
    return this.processes.delete(id);
  }

  // Process step methods
  async getProcessSteps(processId: number): Promise<ProcessStep[]> {
    return Array.from(this.processSteps.values()).filter(
      step => step.processId === processId
    );
  }

  async createProcessStep(step: InsertProcessStep): Promise<ProcessStep> {
    const id = this.currentStepId++;
    const newStep: ProcessStep = { ...step, id };
    this.processSteps.set(id, newStep);
    return newStep;
  }

  async updateProcessStep(id: number, stepData: Partial<InsertProcessStep>): Promise<ProcessStep | undefined> {
    const step = this.processSteps.get(id);
    if (!step) return undefined;

    let completedAt = step.completedAt;
    if (stepData.isCompleted && !step.isCompleted) {
      completedAt = new Date();
    }

    const updatedStep: ProcessStep = {
      ...step,
      ...stepData,
      completedAt
    };

    this.processSteps.set(id, updatedStep);
    return updatedStep;
  }

  // Dashboard analytics methods
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
    console.log('getProcessesStatistics - Filtros recebidos:', filters);
    
    // Vamos fazer a filtragem diretamente aqui para fins de depuração
    let processes = Array.from(this.processes.values());
    console.log('Processos antes da filtragem:', processes.length);
    
    if (filters && filters.responsibleId) {
      const responsibleId = Number(filters.responsibleId);
      console.log(`Filtrando por responsibleId=${responsibleId} (numérico)`);
      
      processes = processes.filter(p => {
        const result = p.responsibleId === responsibleId;
        console.log(`Processo ${p.id}: responsibleId=${p.responsibleId} (${typeof p.responsibleId}) === ${responsibleId} (${typeof responsibleId}) => ${result}`);
        return result;
      });
      
      console.log('Processos após filtragem por responsibleId:', processes.length);
      console.log('Processos filtrados:', processes.map(p => ({id: p.id, pbdoc: p.pbdocNumber})));
    }
    
    return {
      total: processes.length,
      completed: processes.filter(p => p.status === 'completed').length,
      inProgress: processes.filter(p => p.status === 'in_progress').length,
      canceled: processes.filter(p => p.status === 'canceled').length
    };
  }

  async getProcessesByMonth(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{month: number; count: number}[]> {
    // Usar o método getProcesses que já implementa a lógica de filtragem
    const processes = await this.getProcesses(filters);
    const processesByMonth = new Map<number, number>();
    
    // Initialize all months with zero
    for (let i = 0; i < 12; i++) {
      processesByMonth.set(i, 0);
    }
    
    // Count processes by month
    processes.forEach(process => {
      const month = new Date(process.createdAt).getMonth();
      processesByMonth.set(month, (processesByMonth.get(month) || 0) + 1);
    });
    
    return Array.from(processesByMonth.entries()).map(([month, count]) => ({
      month,
      count
    }));
  }

  async getProcessesBySource(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{sourceId: number; count: number}[]> {
    // Usar o método getProcesses que já implementa a lógica de filtragem
    const processes = await this.getProcesses(filters);
    const processesBySource = new Map<number, number>();
    
    // Count processes by source
    processes.forEach(process => {
      processesBySource.set(
        process.sourceId, 
        (processesBySource.get(process.sourceId) || 0) + 1
      );
    });
    
    return Array.from(processesBySource.entries()).map(([sourceId, count]) => ({
      sourceId,
      count
    }));
  }

  async getProcessesByResponsible(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<{responsibleId: number; total: number; completed: number}[]> {
    // Usar o método getProcesses que já implementa a lógica de filtragem
    const processes = await this.getProcesses(filters);
    const processesByResponsible = new Map<number, {total: number; completed: number}>();
    
    // Initialize with all users
    this.users.forEach((user) => {
      processesByResponsible.set(user.id, {total: 0, completed: 0});
    });
    
    // Count processes by responsible
    processes.forEach(process => {
      const responsible = processesByResponsible.get(process.responsibleId) || {total: 0, completed: 0};
      responsible.total += 1;
      
      if (process.status === 'completed') {
        responsible.completed += 1;
      }
      
      processesByResponsible.set(process.responsibleId, responsible);
    });
    
    return Array.from(processesByResponsible.entries())
      .map(([responsibleId, stats]) => ({
        responsibleId,
        ...stats
      }))
      .filter(item => item.total > 0); // Only include users with processes
  }
  
  // Implementação da função deleteUser
  async deleteUser(id: number): Promise<boolean> {
    // Não permitir exclusão do admin padrão (ID 1)
    if (id === 1) return false;
    
    if (!this.users.has(id)) return false;
    
    return this.users.delete(id);
  }



  // Métodos de participantes do processo (stubs para compatibilidade)
  async getProcessParticipants(processId: number): Promise<ProcessParticipant[]> {
    return [];
  }

  async addProcessParticipant(participant: InsertProcessParticipant): Promise<ProcessParticipant> {
    // Para o MemStorage, vamos apenas retornar um participante fake
    // Na prática, este sistema não usa participantes múltiplos
    const newParticipant: ProcessParticipant = {
      id: Date.now(),
      processId: participant.processId,
      userId: participant.userId,
      role: participant.role,
      isActive: participant.isActive ?? true,
      departmentId: participant.departmentId,
      addedAt: new Date(),
    };
    return newParticipant;
  }

  async removeProcessParticipant(processId: number, userId: number): Promise<boolean> {
    return false;
  }

  async transferProcessToDepartment(processId: number, departmentId: number, userId: number): Promise<Process | undefined> {
    const process = this.processes.get(processId);
    if (!process) return undefined;

    const updatedProcess: Process = {
      ...process,
      currentDepartmentId: departmentId,
      updatedAt: new Date(),
    };

    this.processes.set(processId, updatedProcess);
    return updatedProcess;
  }

  async returnProcess(processId: number, returnComment: string, userId: number): Promise<Process | undefined> {
    const process = this.processes.get(processId);
    if (!process) return undefined;

    const updatedProcess: Process = {
      ...process,
      returnComments: returnComment,
      updatedAt: new Date(),
    };

    this.processes.set(processId, updatedProcess);
    return updatedProcess;
  }

  // Métodos de convênios (stubs para compatibilidade)
  async getConvenios(): Promise<Convenio[]> {
    return [];
  }

  async getConvenio(id: number): Promise<Convenio | undefined> {
    return undefined;
  }

  async createConvenio(convenio: InsertConvenio): Promise<Convenio> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateConvenio(id: number, convenioData: Partial<InsertConvenio>): Promise<Convenio | undefined> {
    return undefined;
  }

  async deleteConvenio(id: number): Promise<boolean> {
    return false;
  }
}

// O método deleteUser agora está implementado diretamente na classe MemStorage

// Import DatabaseStorage implementation
// import { DatabaseStorage } from './storage.db';

// Use MemStorage for development/testing
// Importar DatabaseStorage do arquivo db
import { DatabaseStorage } from './storage.db';

export const storage = new DatabaseStorage();
