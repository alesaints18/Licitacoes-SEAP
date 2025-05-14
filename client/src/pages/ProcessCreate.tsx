import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InsertProcess } from "@shared/schema";
import ProcessForm from "@/components/process/ProcessForm";

const ProcessCreate = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleSubmit = async (data: InsertProcess) => {
    setIsSubmitting(true);
    
    try {
      // Create the process
      const response = await apiRequest("POST", "/api/processes", data);
      const createdProcess = await response.json();
      
      // Show success message
      toast({
        title: "Processo criado",
        description: "O processo foi criado com sucesso",
      });
      
      // Invalidate queries to refresh the processes list
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
      
      // Navigate to the process details page
      setLocation(`/processes/${createdProcess.id}`);
    } catch (error) {
      console.error("Error creating process:", error);
      
      // Show error message
      toast({
        title: "Erro ao criar processo",
        description: "Não foi possível criar o processo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Novo Processo de Licitação</h1>
        <p className="text-gray-600">Cadastre um novo processo licitatório no sistema</p>
      </div>
      
      <ProcessForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
};

export default ProcessCreate;
