import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema para FRP (similar ao de convênios mas adaptado)
const frpSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  objeto: z.string().min(1, "Objeto é obrigatório"),
  valor: z.number().min(0, "Valor deve ser positivo"),
  orgaoConcedente: z.string().min(1, "Órgão concedente é obrigatório"),
  orgaoRecebedor: z.string().min(1, "Órgão recebedor é obrigatório"),
  dataAssinatura: z.string().min(1, "Data de assinatura é obrigatória"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  status: z.enum(["ativo", "vencido", "cancelado"]),
  observacoes: z.string().optional(),
});

type FRP = {
  id: number;
  numero: string;
  objeto: string;
  valor: number;
  orgaoConcedente: string;
  orgaoRecebedor: string;
  dataAssinatura: string;
  dataVencimento: string;
  status: "ativo" | "vencido" | "cancelado";
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

type InsertFRP = z.infer<typeof frpSchema>;

const FRP = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFRP, setEditingFRP] = useState<FRP | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertFRP>({
    resolver: zodResolver(frpSchema),
    defaultValues: {
      numero: "",
      objeto: "",
      valor: 0,
      orgaoConcedente: "",
      orgaoRecebedor: "",
      dataAssinatura: "",
      dataVencimento: "",
      status: "ativo",
      observacoes: "",
    },
  });

  // Estado local para FRPs enquanto não há backend
  const [localFRPs, setLocalFRPs] = useState<FRP[]>([]);

  // Consulta FRP do backend (usando estado local temporariamente)
  const { data: frps = [] } = useQuery<FRP[]>({
    queryKey: ["/api/frps"],
    queryFn: () => Promise.resolve(localFRPs),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFRP) => {
      const newFRP: FRP = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Adicionar ao estado local
      setLocalFRPs(prev => [...prev, newFRP]);
      
      return newFRP;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frps"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "FRP criado",
        description: "FRP cadastrado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o FRP",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertFRP }) => {
      const updatedFRP: FRP = {
        id,
        ...data,
        createdAt: localFRPs.find(f => f.id === id)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Atualizar no estado local
      setLocalFRPs(prev => prev.map(frp => frp.id === id ? updatedFRP : frp));
      
      return updatedFRP;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frps"] });
      setDialogOpen(false);
      setEditingFRP(null);
      form.reset();
      toast({
        title: "FRP atualizado",
        description: "FRP atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o FRP",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Remover do estado local
      setLocalFRPs(prev => prev.filter(frp => frp.id !== id));
      
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frps"] });
      toast({
        title: "FRP excluído",
        description: "FRP excluído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o FRP",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertFRP) => {
    if (editingFRP) {
      updateMutation.mutate({ id: editingFRP.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (frp: FRP) => {
    setEditingFRP(frp);
    form.reset({
      numero: frp.numero,
      objeto: frp.objeto,
      valor: frp.valor,
      orgaoConcedente: frp.orgaoConcedente,
      orgaoRecebedor: frp.orgaoRecebedor,
      dataAssinatura: frp.dataAssinatura,
      dataVencimento: frp.dataVencimento,
      status: frp.status,
      observacoes: frp.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este FRP?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredFRPs = frps.filter(
    (frp) =>
      frp.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      frp.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      frp.orgaoConcedente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativo":
        return "bg-green-100 text-green-800";
      case "vencido":
        return "bg-red-100 text-red-800";
      case "cancelado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ativo":
        return "Ativo";
      case "vencido":
        return "Vencido";
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">FRP</h1>
          <p className="text-muted-foreground">
            Gerenciamento de Fundo de Recursos Penitenciários
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingFRP(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo FRP
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingFRP ? "Editar FRP" : "Novo FRP"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="FRP-001/2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="objeto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objeto</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva o objeto do FRP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orgaoConcedente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão Concedente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ministério..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orgaoRecebedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão Recebedor</FormLabel>
                        <FormControl>
                          <Input placeholder="SEAP-PB" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="dataAssinatura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Assinatura</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataVencimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="vencido">Vencido</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações adicionais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingFRP ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, objeto ou órgão concedente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredFRPs.map((frp) => (
          <Card key={frp.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {frp.numero}
                    <Badge className={getStatusColor(frp.status)}>
                      {getStatusLabel(frp.status)}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {frp.objeto}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(frp)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(frp.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Valor:</span>
                  <p className="text-green-600 font-semibold">
                    R$ {frp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Órgão Concedente:</span>
                  <p>{frp.orgaoConcedente}</p>
                </div>
                <div>
                  <span className="font-medium">Data de Assinatura:</span>
                  <p>{new Date(frp.dataAssinatura).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <span className="font-medium">Data de Vencimento:</span>
                  <p>{new Date(frp.dataVencimento).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              {frp.observacoes && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <span className="font-medium">Observações:</span>
                  <p className="text-sm mt-1">{frp.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFRPs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum FRP encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Tente ajustar os filtros de busca"
              : "Comece criando um novo FRP"}
          </p>
        </div>
      )}
    </div>
  );
};

export default FRP;