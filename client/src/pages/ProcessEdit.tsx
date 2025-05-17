import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, InsertProcess } from "@shared/schema";
import ProcessForm from "@/components/process/ProcessForm";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessEditProps {
  id: string;
}

const ProcessEdit = ({ id }: ProcessEditProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parsedId = parseInt(id);
  
  // Fetch process data
  const { data: process, isLoading, error } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
  });
  
  const handleSubmit = async (data: InsertProcess) => {
    setIsSubmitting(true);
    
    try {
      // Update the process
      await apiRequest("PATCH", `/api/processes/${parsedId}`, data);
      
      // Show success message
      toast({
        title: "Processo atualizado",
        description: "O processo foi atualizado com sucesso",
      });
      
      // Invalidate queries to refresh the processes list and details
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${parsedId}`] });
      
      // Navigate to the process details page
      setLocation(`/processes/${parsedId}`);
    } catch (error) {
      console.error("Error updating process:", error);
      
      // Show error message
      toast({
        title: "Erro ao atualizar processo",
        description: "Não foi possível atualizar o processo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <div className="p-8 text-center">Carregando dados do processo...</div>;
  }
  
  if (error || !process) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar processo</h2>
        <p>Não foi possível carregar os detalhes do processo para edição.</p>
        <Button onClick={() => setLocation("/processes")} className="mt-4">
          Voltar para Processos
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Editar Processo</h1>
        <p className="text-gray-600">Edite as informações do processo {process.pbdocNumber}</p>
      </div>
      
      <ProcessForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        initialData={process}
      />
    </div>
  );
};

export default ProcessEdit;