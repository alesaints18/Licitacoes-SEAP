import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { User, BiddingModality, ResourceSource, Department, insertProcessSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Extend the process schema for the form
const processFormSchema = insertProcessSchema.extend({
  pbdocNumber: z.string().min(1, "Número PBDOC é obrigatório"),
  description: z.string().min(1, "Objeto é obrigatório"),
  centralDeCompras: z.string().optional(),
  modalityId: z.number({
    required_error: "Por favor, selecione a modalidade",
  }).refine(val => val > 0, "Modalidade é obrigatória"),
  sourceId: z.number({
    required_error: "Por favor, selecione a fonte de recurso",
  }).refine(val => val > 0, "Fonte de recurso é obrigatória"),
  responsibleId: z.number({
    required_error: "Por favor, selecione o responsável",
  }).refine(val => val > 0, "Responsável é obrigatório"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Por favor, selecione a prioridade",
  }),
  currentDepartmentId: z.number({
    required_error: "Por favor, selecione o setor responsável",
  }).refine(val => val > 0, "Setor responsável é obrigatório"),
});

type ProcessFormValues = z.infer<typeof processFormSchema>;

interface ProcessFormProps {
  defaultValues?: Partial<ProcessFormValues>;
  initialData?: any;
  onSubmit: (data: ProcessFormValues) => void;
  isSubmitting: boolean;
}

const ProcessForm = ({ defaultValues, initialData, onSubmit, isSubmitting }: ProcessFormProps) => {
  // Get users for responsible selector
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Get modalities for modality selector
  const { data: modalities, isLoading: modalitiesLoading } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
  });
  
  // Get resource sources for source selector
  const { data: sources, isLoading: sourcesLoading } = useQuery<ResourceSource[]>({
    queryKey: ['/api/sources'],
  });
  
  // Get departments for department selector
  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });
  
  // Combine defaultValues and initialData, with initialData taking precedence
  const combinedDefaultValues = {
    pbdocNumber: "",
    description: "",
    modalityId: 0,
    sourceId: 0,
    responsibleId: 0,
    currentDepartmentId: 0,
    centralDeCompras: "",
    priority: "medium",
    status: "draft",
    ...defaultValues,
    ...(initialData && {
      pbdocNumber: initialData.pbdocNumber,
      description: initialData.description,
      modalityId: initialData.modalityId,
      sourceId: initialData.sourceId,
      responsibleId: initialData.responsibleId,
      currentDepartmentId: initialData.currentDepartmentId,
      centralDeCompras: initialData.centralDeCompras || "",
      priority: initialData.priority,
      status: initialData.status,
    }),
  };

  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processFormSchema),
    defaultValues: combinedDefaultValues,
  });
  
  // Função para lidar com o envio do formulário, com log do valor
  const handleFormSubmit = (data: ProcessFormValues) => {
    console.log("Enviando dados do formulário:", data);
    onSubmit(data);
  };
  
  const isLoading = usersLoading || modalitiesLoading || sourcesLoading || departmentsLoading;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {defaultValues ? "Editar Processo" : "Novo Processo"}
        </CardTitle>
        <CardDescription>
          {defaultValues 
            ? "Atualize os detalhes do processo de licitação" 
            : "Cadastre um novo processo de licitação"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Carregando formulário...</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pbdocNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex">
                        Número PBDOC <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PB-2023-5482" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número de protocolo do documento no sistema PBDOC (obrigatório)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="modalityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex">
                        Modalidade <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a modalidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modalities?.map((modality) => (
                            <SelectItem 
                              key={modality.id} 
                              value={modality.id.toString()}
                            >
                              {modality.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecione a modalidade de licitação (obrigatório)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex">
                      Objeto <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o objeto da licitação" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Informe detalhes sobre o objeto da licitação (obrigatório)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sourceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex">
                        Fonte de Recurso <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a fonte" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sources?.map((source) => (
                            <SelectItem 
                              key={source.id} 
                              value={source.id.toString()}
                            >
                              Fonte {source.code} - {source.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Origem do recurso financeiro (obrigatório)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="responsibleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex">
                        Responsável <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem 
                              key={user.id} 
                              value={user.id.toString()}
                            >
                              {user.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Servidor responsável pelo processo (obrigatório)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="currentDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex">
                        Setor Responsável <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o setor responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((department) => (
                            <SelectItem 
                              key={department.id} 
                              value={department.id.toString()}
                            >
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecione o setor que será responsável pelo processo (obrigatório)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="centralDeCompras"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Central de Compras
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Número do processo de Central de Compras" 
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Digite o número do processo da Central de Compras (se aplicável)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex">
                      Prioridade <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="priority-low" />
                          <Label htmlFor="priority-low" className="text-blue-600">Baixa</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="priority-medium" />
                          <Label htmlFor="priority-medium" className="text-yellow-600">Média</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="priority-high" />
                          <Label htmlFor="priority-high" className="text-red-600">Alta</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Selecione a prioridade do processo (obrigatório)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-wrap gap-y-2 space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="draft" id="status-draft" />
                          <Label htmlFor="status-draft" className="text-gray-600">Rascunho</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="in_progress" id="status-progress" />
                          <Label htmlFor="status-progress" className="text-yellow-600">Em Andamento</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="completed" id="status-completed" />
                          <Label htmlFor="status-completed" className="text-green-600">Concluído</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="canceled" id="status-canceled" />
                          <Label htmlFor="status-canceled" className="text-red-600">Cancelado</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      {initialData 
                        ? "Atualize o status do processo conforme necessário" 
                        : "Novos processos são criados como rascunhos por padrão"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : defaultValues ? "Atualizar Processo" : "Criar Processo"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessForm;
