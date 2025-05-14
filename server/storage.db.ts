import { db } from "./db";
import { 
  users, type User, type InsertUser, 
  departments, type Department, type InsertDepartment,
  biddingModalities, type BiddingModality, type InsertBiddingModality,
  resourceSources, type ResourceSource, type InsertResourceSource,
  processes, type Process, type InsertProcess,
  processSteps, type ProcessStep, type InsertProcessStep
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, count, sql } from "drizzle-orm";
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

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user) return undefined;

    const passwordMatch = await bcrypt.compare(password, user.password);
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
  async getProcess(id: number): Promise<Process | undefined> {
    const [process] = await db.select().from(processes).where(eq(processes.id, id));
    return process;
  }

  async getProcesses(filters?: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  }): Promise<Process[]> {
    let baseQuery = db.select().from(processes);
    let conditions = [];
    
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
    
    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions));
    }
    
    return await baseQuery;
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
  async getProcessesStatistics(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    canceled: number;
  }> {
    const totalResult = await db.select({ value: count() }).from(processes);
    const total = totalResult[0]?.value || 0;

    const completedResult = await db
      .select({ value: count() })
      .from(processes)
      .where(eq(processes.status, 'completed'));
    const completed = completedResult[0]?.value || 0;

    const inProgressResult = await db
      .select({ value: count() })
      .from(processes)
      .where(eq(processes.status, 'in_progress'));
    const inProgress = inProgressResult[0]?.value || 0;

    const canceledResult = await db
      .select({ value: count() })
      .from(processes)
      .where(eq(processes.status, 'canceled'));
    const canceled = canceledResult[0]?.value || 0;

    return { total, completed, inProgress, canceled };
  }

  async getProcessesByMonth(): Promise<{month: number; count: number}[]> {
    const currentYear = new Date().getFullYear();
    const result = await db
      .select({
        month: sql`EXTRACT(MONTH FROM ${processes.createdAt})::integer`,
        count: count()
      })
      .from(processes)
      .where(
        sql`EXTRACT(YEAR FROM ${processes.createdAt}) = ${currentYear}`
      )
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

  async getProcessesBySource(): Promise<{sourceId: number; count: number}[]> {
    return await db
      .select({
        sourceId: processes.sourceId,
        count: count()
      })
      .from(processes)
      .groupBy(processes.sourceId);
  }

  async getProcessesByResponsible(): Promise<{responsibleId: number; total: number; completed: number}[]> {
    const totalByResponsible = await db
      .select({
        responsibleId: processes.responsibleId,
        total: count()
      })
      .from(processes)
      .groupBy(processes.responsibleId);
    
    const completedByResponsible = await db
      .select({
        responsibleId: processes.responsibleId,
        completed: count()
      })
      .from(processes)
      .where(eq(processes.status, 'completed'))
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