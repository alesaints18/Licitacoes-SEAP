import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { User, BiddingModality, ResourceSource, insertProcessSchema } from "@shared/schema";
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

// Extend the process schema for the form
const processFormSchema = insertProcessSchema.extend({
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Por favor, selecione a prioridade",
  }),
});

type ProcessFormValues = z.infer<typeof processFormSchema>;

interface ProcessFormProps {
  defaultValues?: Partial<ProcessFormValues>;
  onSubmit: (data: ProcessFormValues) => void;
  isSubmitting: boolean;
}

const ProcessForm = ({ defaultValues, onSubmit, isSubmitting }: ProcessFormProps) => {
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
  
  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processFormSchema),
    defaultValues: {
      pbdocNumber: "",
      description: "",
      modalityId: 0,
      sourceId: 0,
      responsibleId: 0,
      priority: "medium",
      status: "draft",
      ...defaultValues,
    },
  });
  
  const isLoading = usersLoading || modalitiesLoading || sourcesLoading;
  
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pbdocNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número PBDOC</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PB-2023-5482" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número de protocolo do documento no sistema PBDOC
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
                      <FormLabel>Modalidade</FormLabel>
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
                        Selecione a modalidade de licitação
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o objeto da licitação" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Informe detalhes sobre o objeto da licitação
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
                      <FormLabel>Fonte de Recurso</FormLabel>
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
                        Origem do recurso financeiro
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
                      <FormLabel>Responsável</FormLabel>
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
                        Servidor responsável pelo processo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Prioridade</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {defaultValues && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
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
