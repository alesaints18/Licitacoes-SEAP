import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export const roleEnum = pgEnum('role', ['common', 'admin']);
export const processStatusEnum = pgEnum('process_status', ['draft', 'in_progress', 'completed', 'canceled']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  department: text('department').notNull(),
  role: roleEnum('role').notNull().default('common'),
  isActive: boolean('is_active').notNull().default(true),
});

// Departments table
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

// Bidding modalities table
export const biddingModalities = pgTable('bidding_modalities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

// Resource sources table
export const resourceSources = pgTable('resource_sources', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description'),
});

// Processes table
export const processes = pgTable('processes', {
  id: serial('id').primaryKey(),
  pbdocNumber: text('pbdoc_number').notNull().unique(),
  description: text('description').notNull(),
  modalityId: integer('modality_id').notNull(),
  sourceId: integer('source_id').notNull(),
  responsibleId: integer('responsible_id').notNull(),
  currentDepartmentId: integer('current_department_id'), // Setor atualmente responsável pelo processo
  centralDeCompras: text('central_de_compras'), // Número do processo da Central de Compras
  priority: priorityEnum('priority').notNull().default('medium'),
  status: processStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  responsibleSince: timestamp('responsible_since'), // Data em que o responsável assumiu o processo
  deadline: timestamp('deadline'), // Prazo de entrega do processo
});

// Process steps table
export const processSteps = pgTable('process_steps', {
  id: serial('id').primaryKey(),
  processId: integer('process_id').notNull(),
  stepName: text('step_name').notNull(),
  departmentId: integer('department_id').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  observations: text('observations'),
  completedAt: timestamp('completed_at'),
  completedBy: integer('completed_by'),
  dueDate: timestamp('due_date'),
});

// Process participants table - controla quais usuários e setores têm acesso a cada processo
export const processParticipants = pgTable('process_participants', {
  id: serial('id').primaryKey(),
  processId: integer('process_id').notNull(),
  userId: integer('user_id').notNull(),
  departmentId: integer('department_id'), // ID do setor participante
  role: text('role').notNull().default('viewer'), // viewer, editor, owner
  addedAt: timestamp('added_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true), // Indica se o participante tem acesso ativo
});

// Export Zod schemas for insert operations
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
});

export const insertBiddingModalitySchema = createInsertSchema(biddingModalities).omit({
  id: true,
});

export const insertResourceSourceSchema = createInsertSchema(resourceSources).omit({
  id: true,
});

export const insertProcessSchema = createInsertSchema(processes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcessStepSchema = createInsertSchema(processSteps).omit({
  id: true,
  completedAt: true,
});

export const insertProcessParticipantSchema = createInsertSchema(processParticipants).omit({
  id: true,
  addedAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type BiddingModality = typeof biddingModalities.$inferSelect;
export type InsertBiddingModality = z.infer<typeof insertBiddingModalitySchema>;

export type ResourceSource = typeof resourceSources.$inferSelect;
export type InsertResourceSource = z.infer<typeof insertResourceSourceSchema>;

export type Process = typeof processes.$inferSelect;
export type InsertProcess = z.infer<typeof insertProcessSchema>;

export type ProcessStep = typeof processSteps.$inferSelect;
export type InsertProcessStep = z.infer<typeof insertProcessStepSchema>;

export type ProcessParticipant = typeof processParticipants.$inferSelect;
export type InsertProcessParticipant = z.infer<typeof insertProcessParticipantSchema>;
