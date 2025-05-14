import { db } from "../server/db";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import bcrypt from "bcrypt";

async function main() {
  console.log("Pushing schema to database...");
  
  // Create tables based on schema
  const result = await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schema.users._.name} (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      email TEXT,
      department TEXT NOT NULL,
      role ${schema.roleEnum._.enumName} NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${schema.departments._.name} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS ${schema.biddingModalities._.name} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS ${schema.resourceSources._.name} (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS ${schema.processes._.name} (
      id SERIAL PRIMARY KEY,
      "pbdocNumber" TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      "modalityId" INTEGER NOT NULL,
      "sourceId" INTEGER NOT NULL,
      "responsibleId" INTEGER NOT NULL,
      status ${schema.processStatusEnum._.enumName} NOT NULL,
      priority ${schema.priorityEnum._.enumName} NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ${schema.processSteps._.name} (
      id SERIAL PRIMARY KEY,
      "processId" INTEGER NOT NULL,
      "stepName" TEXT NOT NULL,
      "departmentId" INTEGER NOT NULL,
      "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
      observations TEXT,
      "completedAt" TIMESTAMP,
      "completedBy" INTEGER,
      "dueDate" TIMESTAMP
    );
  `);

  console.log("Schema pushed successfully!");

  // Check if admin user exists
  const adminUser = await db.select().from(schema.users).where(schema.eq(schema.users.username, "admin")).execute();
  
  if (adminUser.length === 0) {
    console.log("Seeding initial admin user...");
    
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await db.insert(schema.users).values({
      username: "admin",
      password: hashedPassword,
      fullName: "Administrador",
      email: "admin@example.com",
      department: "TI",
      role: "admin"
    }).execute();
    
    console.log("Admin user created successfully!");
  } else {
    console.log("Admin user already exists, skipping creation.");
  }

  // Check if common user exists
  const commonUser = await db.select().from(schema.users).where(schema.eq(schema.users.username, "user")).execute();
  
  if (commonUser.length === 0) {
    console.log("Seeding initial common user...");
    
    // Create common user
    const hashedPassword = await bcrypt.hash("user123", 10);
    
    await db.insert(schema.users).values({
      username: "user",
      password: hashedPassword,
      fullName: "Usuário Comum",
      email: "user@example.com",
      department: "Licitações",
      role: "common"
    }).execute();
    
    console.log("Common user created successfully!");
  } else {
    console.log("Common user already exists, skipping creation.");
  }

  // Seed initial departments if they don't exist
  const departments = await db.select().from(schema.departments).execute();
  
  if (departments.length === 0) {
    console.log("Seeding initial departments...");
    
    await db.insert(schema.departments).values([
      { name: "TI", description: "Tecnologia da Informação" },
      { name: "Licitações", description: "Departamento de Licitações" },
      { name: "Jurídico", description: "Departamento Jurídico" },
      { name: "Financeiro", description: "Departamento Financeiro" },
      { name: "Administrativo", description: "Departamento Administrativo" }
    ]).execute();
    
    console.log("Departments created successfully!");
  } else {
    console.log("Departments already exist, skipping creation.");
  }

  // Seed initial bidding modalities if they don't exist
  const modalities = await db.select().from(schema.biddingModalities).execute();
  
  if (modalities.length === 0) {
    console.log("Seeding initial bidding modalities...");
    
    await db.insert(schema.biddingModalities).values([
      { name: "Pregão Eletrônico", description: "Modalidade de licitação para aquisição de bens e serviços comuns" },
      { name: "Pregão Presencial", description: "Modalidade de licitação presencial para aquisição de bens e serviços comuns" },
      { name: "Concorrência", description: "Modalidade de licitação entre quaisquer interessados" },
      { name: "Tomada de Preços", description: "Modalidade de licitação entre interessados cadastrados" },
      { name: "Convite", description: "Modalidade de licitação entre interessados convidados" },
      { name: "Concurso", description: "Modalidade de licitação para escolha de trabalho técnico, científico ou artístico" },
      { name: "Leilão", description: "Modalidade de licitação para venda de bens móveis inservíveis ou de produtos legalmente apreendidos" },
      { name: "Dispensa de Licitação", description: "Contratação direta sem licitação" },
      { name: "Inexigibilidade", description: "Contratação direta por inviabilidade de competição" }
    ]).execute();
    
    console.log("Bidding modalities created successfully!");
  } else {
    console.log("Bidding modalities already exist, skipping creation.");
  }

  // Seed initial resource sources if they don't exist
  const sources = await db.select().from(schema.resourceSources).execute();
  
  if (sources.length === 0) {
    console.log("Seeding initial resource sources...");
    
    await db.insert(schema.resourceSources).values([
      { code: "TEF", description: "Tesouro Estadual Fonte" },
      { code: "FSP", description: "Fundo de Segurança Pública" },
      { code: "FUMPEN", description: "Fundo Penitenciário" },
      { code: "CONVÊNIO", description: "Convênios" },
      { code: "DEPEN", description: "Departamento Penitenciário Nacional" }
    ]).execute();
    
    console.log("Resource sources created successfully!");
  } else {
    console.log("Resource sources already exist, skipping creation.");
  }

  console.log("Database initialization completed successfully!");
}

main().catch((error) => {
  console.error("Error during database initialization:", error);
  process.exit(1);
});