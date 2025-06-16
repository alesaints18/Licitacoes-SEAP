// Simplified trash functionality for demonstration
import { storage } from './storage';

// Add some demo deleted processes
export async function seedTrashData() {
  try {
    // Create a process first
    const demoProcess = await storage.createProcess({
      pbdocNumber: "DEMO-TRASH-001",
      description: "Processo de Teste para Lixeira",
      modalityId: 1,
      sourceId: 1,
      responsibleId: 1,
      status: "draft",
      priority: "medium",
      currentDepartmentId: 1,
      centralDeCompras: null,
      estimatedValue: null,
      returnComments: null,
      deadline: null,
    });

    // Then delete it to move to trash
    await storage.deleteProcess(demoProcess.id, 1);
    
    console.log("Demo trash data seeded successfully");
  } catch (error) {
    console.error("Error seeding trash data:", error);
  }
}