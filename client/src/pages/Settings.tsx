import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BiddingModality, ResourceSource, Department, InsertBiddingModality, InsertResourceSource, InsertDepartment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Edit, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("modalities");
  const [openModalityDialog, setOpenModalityDialog] = useState(false);
  const [openSourceDialog, setOpenSourceDialog] = useState(false);
  const [openDepartmentDialog, setOpenDepartmentDialog] = useState(false);
  const [editingModality, setEditingModality] = useState<BiddingModality | null>(null);
  const [editingSource, setEditingSource] = useState<ResourceSource | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  
  // Get bidding modalities
  const { data: modalities, isLoading: modalitiesLoading } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
  });
  
  // Get resource sources
  const { data: sources, isLoading: sourcesLoading } = useQuery<ResourceSource[]>({
    queryKey: ['/api/sources'],
  });
  
  // Get departments
  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });
  
  // Forms
  const modalityForm = useForm<InsertBiddingModality>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      description: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const sourceForm = useForm<InsertResourceSource>({
    resolver: zodResolver(z.object({
      code: z.string().min(1, "Código é obrigatório"),
      description: z.string().optional(),
    })),
    defaultValues: {
      code: "",
      description: "",
    },
  });
  
  const departmentForm = useForm<InsertDepartment>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      description: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const openAddModalityDialog = () => {
    modalityForm.reset({ name: "", description: "" });
    setEditingModality(null);
    setOpenModalityDialog(true);
  };
  
  const openEditModalityDialog = (modality: BiddingModality) => {
    modalityForm.reset({
      name: modality.name,
      description: modality.description || "",
    });
    setEditingModality(modality);
    setOpenModalityDialog(true);
  };
  
  const openAddSourceDialog = () => {
    sourceForm.reset({ code: "", description: "" });
    setEditingSource(null);
    setOpenSourceDialog(true);
  };
  
  const openEditSourceDialog = (source: ResourceSource) => {
    sourceForm.reset({
      code: source.code,
      description: source.description || "",
    });
    setEditingSource(source);
    setOpenSourceDialog(true);
  };
  
  const openAddDepartmentDialog = () => {
    departmentForm.reset({ name: "", description: "" });
    setEditingDepartment(null);
    setOpenDepartmentDialog(true);
  };
  
  const openEditDepartmentDialog = (department: Department) => {
    departmentForm.reset({
      name: department.name,
      description: department.description || "",
    });
    setEditingDepartment(department);
    setOpenDepartmentDialog(true);
  };
  
  const onSubmitModality = async (data: InsertBiddingModality) => {
    try {
      if (editingModality) {
        await apiRequest("PATCH", `/api/modalities/${editingModality.id}`, data);
        toast({
          title: "Modalidade atualizada",
          description: "A modalidade foi atualizada com sucesso",
        });
      } else {
        await apiRequest("POST", "/api/modalities", data);
        toast({
          title: "Modalidade criada",
          description: "A modalidade foi criada com sucesso",
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/modalities'] });
      
      // Close dialog
      setOpenModalityDialog(false);
    } catch (error) {
      console.error("Error saving modality:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${editingModality ? "atualizar" : "criar"} modalidade`,
        variant: "destructive",
      });
    }
  };
  
  const onSubmitSource = async (data: InsertResourceSource) => {
    try {
      if (editingSource) {
        await apiRequest("PATCH", `/api/sources/${editingSource.id}`, data);
        toast({
          title: "Fonte atualizada",
          description: "A fonte foi atualizada com sucesso",
        });
      } else {
        await apiRequest("POST", "/api/sources", data);
        toast({
          title: "Fonte criada",
          description: "A fonte foi criada com sucesso",
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sources'] });
      
      // Close dialog
      setOpenSourceDialog(false);
    } catch (error) {
      console.error("Error saving source:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${editingSource ? "atualizar" : "criar"} fonte`,
        variant: "destructive",
      });
    }
  };
  
  const onSubmitDepartment = async (data: InsertDepartment) => {
    try {
      if (editingDepartment) {
        await apiRequest("PATCH", `/api/departments/${editingDepartment.id}`, data);
        toast({
          title: "Setor atualizado",
          description: "O setor foi atualizado com sucesso",
        });
      } else {
        await apiRequest("POST", "/api/departments", data);
        toast({
          title: "Setor criado",
          description: "O setor foi criado com sucesso",
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      
      // Close dialog
      setOpenDepartmentDialog(false);
    } catch (error) {
      console.error("Error saving department:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${editingDepartment ? "atualizar" : "criar"} setor`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações do sistema</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="modalities">Modalidades</TabsTrigger>
          <TabsTrigger value="sources">Fontes de Recurso</TabsTrigger>
          <TabsTrigger value="departments">Setores</TabsTrigger>
        </TabsList>
        
        <TabsContent value="modalities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Modalidades de Licitação</CardTitle>
              <Button size="sm" onClick={openAddModalityDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Modalidade
              </Button>
            </CardHeader>
            <CardContent>
              {modalitiesLoading ? (
                <div className="p-4 text-center">Carregando modalidades...</div>
              ) : (
                <div className="space-y-4">
                  {modalities?.map((modality) => (
                    <div 
                      key={modality.id} 
                      className="flex items-center justify-between p-4 border rounded-md"
                    >
                      <div>
                        <h3 className="font-medium">{modality.name}</h3>
                        {modality.description && (
                          <p className="text-sm text-gray-500">{modality.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModalityDialog(modality)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {modalities?.length === 0 && (
                    <div className="text-center p-4 text-gray-500">
                      Nenhuma modalidade cadastrada
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sources">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Fontes de Recurso</CardTitle>
              <Button size="sm" onClick={openAddSourceDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Fonte
              </Button>
            </CardHeader>
            <CardContent>
              {sourcesLoading ? (
                <div className="p-4 text-center">Carregando fontes...</div>
              ) : (
                <div className="space-y-4">
                  {sources?.map((source) => (
                    <div 
                      key={source.id} 
                      className="flex items-center justify-between p-4 border rounded-md"
                    >
                      <div>
                        <h3 className="font-medium">Fonte {source.code}</h3>
                        {source.description && (
                          <p className="text-sm text-gray-500">{source.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSourceDialog(source)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {sources?.length === 0 && (
                    <div className="text-center p-4 text-gray-500">
                      Nenhuma fonte cadastrada
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Setores</CardTitle>
              <Button size="sm" onClick={openAddDepartmentDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Setor
              </Button>
            </CardHeader>
            <CardContent>
              {departmentsLoading ? (
                <div className="p-4 text-center">Carregando setores...</div>
              ) : (
                <div className="space-y-4">
                  {departments?.map((department) => (
                    <div 
                      key={department.id} 
                      className="flex items-center justify-between p-4 border rounded-md"
                    >
                      <div>
                        <h3 className="font-medium">{department.name}</h3>
                        {department.description && (
                          <p className="text-sm text-gray-500">{department.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDepartmentDialog(department)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {departments?.length === 0 && (
                    <div className="text-center p-4 text-gray-500">
                      Nenhum setor cadastrado
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modality Dialog */}
      <Dialog open={openModalityDialog} onOpenChange={setOpenModalityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingModality ? "Editar Modalidade" : "Nova Modalidade"}
            </DialogTitle>
            <DialogDescription>
              {editingModality 
                ? "Edite as informações da modalidade de licitação" 
                : "Preencha as informações para criar uma nova modalidade"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...modalityForm}>
            <form onSubmit={modalityForm.handleSubmit(onSubmitModality)} className="space-y-4">
              <FormField
                control={modalityForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pregão Eletrônico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={modalityForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição da modalidade" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">
                  {editingModality ? "Salvar Alterações" : "Criar Modalidade"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Source Dialog */}
      <Dialog open={openSourceDialog} onOpenChange={setOpenSourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSource ? "Editar Fonte" : "Nova Fonte"}
            </DialogTitle>
            <DialogDescription>
              {editingSource 
                ? "Edite as informações da fonte de recurso" 
                : "Preencha as informações para criar uma nova fonte"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...sourceForm}>
            <form onSubmit={sourceForm.handleSubmit(onSubmitSource)} className="space-y-4">
              <FormField
                control={sourceForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sourceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição da fonte de recurso" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">
                  {editingSource ? "Salvar Alterações" : "Criar Fonte"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Department Dialog */}
      <Dialog open={openDepartmentDialog} onOpenChange={setOpenDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Editar Setor" : "Novo Setor"}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment 
                ? "Edite as informações do setor" 
                : "Preencha as informações para criar um novo setor"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...departmentForm}>
            <form onSubmit={departmentForm.handleSubmit(onSubmitDepartment)} className="space-y-4">
              <FormField
                control={departmentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Licitação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={departmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição do setor" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">
                  {editingDepartment ? "Salvar Alterações" : "Criar Setor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
