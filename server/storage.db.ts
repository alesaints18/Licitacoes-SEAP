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
    return undefined;
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

  // Analytics methods - stub implementations
  async getProcessesStatistics(): Promise<any> {
    return {};
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

  async getTemporalDistribution(): Promise<any[]> {
    return [];
  }

  async getDepartmentRanking(): Promise<any[]> {
    return [];
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