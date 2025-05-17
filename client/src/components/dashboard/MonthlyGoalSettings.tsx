import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MonthlyGoalSettingsProps {
  isAdmin: boolean;
}

const MonthlyGoalSettings = ({ isAdmin }: MonthlyGoalSettingsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(200);
  const [inputValue, setInputValue] = useState<string>("200");

  // Obter a meta mensal do localStorage ou da API
  const { data } = useQuery({
    queryKey: ['/api/settings/monthly-goal'],
    queryFn: async () => {
      // Primeiro tenta buscar da API
      try {
        const response = await fetch('/api/settings/monthly-goal');
        if (response.ok) {
          const data = await response.json();
          return data.value;
        }
      } catch (error) {
        console.error("Erro ao buscar meta mensal da API:", error);
      }
      
      // Como fallback, usa o localStorage
      const storedGoal = localStorage.getItem('monthlyGoal');
      return storedGoal ? parseInt(storedGoal) : 200;
    }
  });
  
  // Atualizar estados quando os dados chegarem
  useEffect(() => {
    if (data) {
      setMonthlyGoal(data);
      setInputValue(data.toString());
    }
  }, [data]);

  // Atualizar a meta mensal
  const updateGoalMutation = useMutation({
    mutationFn: async (newGoal: number) => {
      try {
        // Tentar atualizar via API
        const response = await apiRequest('POST', '/api/settings/monthly-goal', { value: newGoal });
        return newGoal;
      } catch (error) {
        console.error("Erro ao atualizar meta via API:", error);
        // Como fallback, salva no localStorage
        localStorage.setItem('monthlyGoal', newGoal.toString());
        return newGoal;
      }
    },
    onSuccess: (data) => {
      setMonthlyGoal(data);
      queryClient.invalidateQueries({ queryKey: ['/api/settings/monthly-goal'] });
      toast({
        title: "Meta atualizada",
        description: `A meta mensal foi atualizada para ${data} processos.`,
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar meta",
        description: "Ocorreu um erro ao atualizar a meta mensal.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const newGoal = parseInt(inputValue);
    if (isNaN(newGoal) || newGoal <= 0) {
      toast({
        title: "Valor inválido",
        description: "A meta deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }
    updateGoalMutation.mutate(newGoal);
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Settings className="h-4 w-4" />
          <span>Meta Mensal</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Meta Mensal</DialogTitle>
          <DialogDescription>
            Defina a meta mensal de processos para o departamento.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="monthlyGoal">Meta de Processos</Label>
            <Input
              id="monthlyGoal"
              type="number"
              min="1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline">Cancelar</Button>
          <Button onClick={handleSave} disabled={updateGoalMutation.isPending}>
            {updateGoalMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyGoalSettings;