import { db } from "../server/db";
import bcrypt from "bcrypt";

async function main() {
  console.log("Pushing schema to database...");
  
  // Create enums
  try {
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
          CREATE TYPE role AS ENUM ('common', 'admin');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'process_status') THEN
          CREATE TYPE process_status AS ENUM ('draft', 'in_progress', 'completed', 'canceled');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority') THEN
          CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
        END IF;
      END
      $$;
    `);
    console.log("Enums created successfully!");
  } catch (error) {
    console.error("Error creating enums:", error);
  }
  
  // Create tables
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        department TEXT NOT NULL,
        role role NOT NULL DEFAULT 'common'
      );

      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS bidding_modalities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS resource_sources (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS processes (
        id SERIAL PRIMARY KEY,
        pbdoc_number TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        modality_id INTEGER NOT NULL,
        source_id INTEGER NOT NULL,
        responsible_id INTEGER NOT NULL,
        status process_status NOT NULL,
        priority priority NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS process_steps (
        id SERIAL PRIMARY KEY,
        process_id INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        department_id INTEGER NOT NULL,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        observations TEXT,
        completed_at TIMESTAMP,
        completed_by INTEGER,
        due_date TIMESTAMP
      );
    `);
    console.log("Tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
  }

  console.log("Schema pushed successfully!");

  // Check if admin user exists
  try {
    const adminUserResult = await db.execute(`SELECT * FROM users WHERE username = 'admin'`);
    
    if (adminUserResult.rows?.length === 0) {
      console.log("Seeding initial admin user...");
      
      // Create admin user
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      await db.execute(`
        INSERT INTO users (username, password, full_name, email, department, role)
        VALUES ('admin', '${hashedPassword}', 'Administrador', 'admin@example.com', 'TI', 'admin')
      `);
      
      console.log("Admin user created successfully!");
    } else {
      console.log("Admin user already exists, skipping creation.");
    }
  } catch (error) {
    console.error("Error checking/creating admin user:", error);
  }

  // Check if common user exists
  try {
    const commonUserResult = await db.execute(`SELECT * FROM users WHERE username = 'user'`);
    
    if (commonUserResult.rows?.length === 0) {
      console.log("Seeding initial common user...");
      
      // Create common user
      const hashedPassword = await bcrypt.hash("user123", 10);
      
      await db.execute(`
        INSERT INTO users (username, password, full_name, email, department, role)
        VALUES ('user', '${hashedPassword}', 'Usuário Comum', 'user@example.com', 'Licitações', 'common')
      `);
      
      console.log("Common user created successfully!");
    } else {
      console.log("Common user already exists, skipping creation.");
    }
  } catch (error) {
    console.error("Error checking/creating common user:", error);
  }

  // Seed initial departments if they don't exist
  try {
    const departmentsResult = await db.execute(`SELECT * FROM departments`);
    
    if (departmentsResult.rows?.length === 0) {
      console.log("Seeding initial departments...");
      
      await db.execute(`
        INSERT INTO departments (name, description) VALUES
          ('TI', 'Tecnologia da Informação'),
          ('Licitações', 'Departamento de Licitações'),
          ('Jurídico', 'Departamento Jurídico'),
          ('Financeiro', 'Departamento Financeiro'),
          ('Administrativo', 'Departamento Administrativo')
      `);
      
      console.log("Departments created successfully!");
    } else {
      console.log("Departments already exist, skipping creation.");
    }
  } catch (error) {
    console.error("Error checking/creating departments:", error);
  }

  // Seed initial bidding modalities if they don't exist
  try {
    const modalitiesResult = await db.execute(`SELECT * FROM bidding_modalities`);
    
    if (modalitiesResult.rows?.length === 0) {
      console.log("Seeding initial bidding modalities...");
      
      await db.execute(`
        INSERT INTO bidding_modalities (name, description) VALUES
          ('Pregão Eletrônico', 'Modalidade de licitação para aquisição de bens e serviços comuns'),
          ('Pregão Presencial', 'Modalidade de licitação presencial para aquisição de bens e serviços comuns'),
          ('Concorrência', 'Modalidade de licitação entre quaisquer interessados'),
          ('Tomada de Preços', 'Modalidade de licitação entre interessados cadastrados'),
          ('Convite', 'Modalidade de licitação entre interessados convidados'),
          ('Concurso', 'Modalidade de licitação para escolha de trabalho técnico, científico ou artístico'),
          ('Leilão', 'Modalidade de licitação para venda de bens móveis inservíveis ou de produtos legalmente apreendidos'),
          ('Dispensa de Licitação', 'Contratação direta sem licitação'),
          ('Inexigibilidade', 'Contratação direta por inviabilidade de competição')
      `);
      
      console.log("Bidding modalities created successfully!");
    } else {
      console.log("Bidding modalities already exist, skipping creation.");
    }
  } catch (error) {
    console.error("Error checking/creating bidding modalities:", error);
  }

  // Seed initial resource sources if they don't exist
  try {
    const sourcesResult = await db.execute(`SELECT * FROM resource_sources`);
    
    if (sourcesResult.rows?.length === 0) {
      console.log("Seeding initial resource sources...");
      
      await db.execute(`
        INSERT INTO resource_sources (code, description) VALUES
          ('TEF', 'Tesouro Estadual Fonte'),
          ('FSP', 'Fundo de Segurança Pública'),
          ('FUMPEN', 'Fundo Penitenciário'),
          ('CONVÊNIO', 'Convênios'),
          ('DEPEN', 'Departamento Penitenciário Nacional')
      `);
      
      console.log("Resource sources created successfully!");
    } else {
      console.log("Resource sources already exist, skipping creation.");
    }
  } catch (error) {
    console.error("Error checking/creating resource sources:", error);
  }

  console.log("Database initialization completed successfully!");
}

main().catch((error) => {
  console.error("Error during database initialization:", error);
  process.exit(1);
});