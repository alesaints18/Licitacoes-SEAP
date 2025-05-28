import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Convenio {
  id: number;
  numero: string;
  nome: string;
  orgaoConvenente: string;
  valor: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

const Convenios = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Carregar convênios salvos do localStorage
  const [convenios, setConvenios] = useState<Convenio[]>(() => {
    try {
      const saved = localStorage.getItem("convenios-seap");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Erro ao carregar convênios:", error);
    }
    // Iniciar com lista vazia se não houver dados salvos
    return [];
  });

  // Salvar convênios no localStorage sempre que a lista mudar
  useEffect(() => {
    localStorage.setItem("convenios-seap", JSON.stringify(convenios));
  }, [convenios]);

  // Função para limpar todos os convênios
  const handleClearAll = () => {
    setConvenios([]);
    localStorage.removeItem("convenios-seap");
    toast({
      title: "Dados limpos",
      description: "Todos os convênios foram removidos.",
    });
  };

  const [newConvenio, setNewConvenio] = useState({
    numero: "",
    nome: "",
    orgaoConvenente: "",
    valor: "",
    dataInicio: "",
    dataFim: "",
    status: "ativo",
    observacoes: "",
  });

  const filteredConvenios = convenios.filter(
    (convenio) =>
      convenio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convenio.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convenio.orgaoConvenente.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddConvenio = () => {
    // Validate required fields
    if (
      !newConvenio.numero ||
      !newConvenio.nome ||
      !newConvenio.orgaoConvenente ||
      !newConvenio.valor ||
      !newConvenio.dataInicio ||
      !newConvenio.dataFim
    ) {
      toast({
        title: "Erro",
        description: "Todos os campos obrigatórios devem ser preenchidos.",
        variant: "destructive",
      });
      return;
    }

    // Create new convenio with generated ID
    const novoConvenio: Convenio = {
      id: Math.max(...convenios.map((c) => c.id)) + 1,
      numero: newConvenio.numero,
      nome: newConvenio.nome,
      orgaoConvenente: newConvenio.orgaoConvenente,
      valor: newConvenio.valor.startsWith("R$")
        ? newConvenio.valor
        : `R$ ${newConvenio.valor}`,
      dataInicio: newConvenio.dataInicio,
      dataFim: newConvenio.dataFim,
      status: newConvenio.status,
      observacoes: newConvenio.observacoes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to the list
    setConvenios([...convenios, novoConvenio]);

    toast({
      title: "Convênio adicionado",
      description: `Convênio ${newConvenio.numero} foi criado com sucesso.`,
    });

    // Reset form and close dialog
    setNewConvenio({
      numero: "",
      nome: "",
      orgaoConvenente: "",
      valor: "",
      dataInicio: "",
      dataFim: "",
      status: "ativo",
      observacoes: "",
    });
    setIsAddDialogOpen(false);
  };

  // Função para editar convênio
  const handleEditConvenio = (convenio: Convenio) => {
    setEditingConvenio(convenio);
    setNewConvenio({
      numero: convenio.numero,
      nome: convenio.nome,
      orgaoConvenente: convenio.orgaoConvenente,
      valor: convenio.valor.replace("R$ ", ""),
      dataInicio: convenio.dataInicio,
      dataFim: convenio.dataFim,
      status: convenio.status,
      observacoes: convenio.observacoes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Função para salvar edição
  const handleSaveEdit = () => {
    if (!editingConvenio) return;

    // Validate required fields
    if (!newConvenio.numero || !newConvenio.nome || !newConvenio.orgaoConvenente || 
        !newConvenio.valor || !newConvenio.dataInicio || !newConvenio.dataFim) {
      toast({
        title: "Erro",
        description: "Todos os campos obrigatórios devem ser preenchidos.",
        variant: "destructive",
      });
      return;
    }

    const updatedConvenios = convenios.map(conv =>
      conv.id === editingConvenio.id
        ? {
            ...conv,
            numero: newConvenio.numero,
            nome: newConvenio.nome,
            orgaoConvenente: newConvenio.orgaoConvenente,
            valor: newConvenio.valor.startsWith("R$") ? newConvenio.valor : `R$ ${newConvenio.valor}`,
            dataInicio: newConvenio.dataInicio,
            dataFim: newConvenio.dataFim,
            status: newConvenio.status,
            observacoes: newConvenio.observacoes,
            updatedAt: new Date().toISOString(),
          }
        : conv
    );

    setConvenios(updatedConvenios);
    setIsEditDialogOpen(false);
    setEditingConvenio(null);
    setNewConvenio({
      numero: "",
      nome: "",
      orgaoConvenente: "",
      valor: "",
      dataInicio: "",
      dataFim: "",
      status: "ativo",
      observacoes: "",
    });

    toast({
      title: "Convênio atualizado",
      description: `Convênio ${newConvenio.numero} foi atualizado com sucesso.`,
    });
  };

  // Função para excluir convênio
  const handleDeleteConvenio = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este convênio?")) {
      const updatedConvenios = convenios.filter(conv => conv.id !== id);
      setConvenios(updatedConvenios);
      
      toast({
        title: "Convênio excluído",
        description: "O convênio foi removido com sucesso.",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ativo":
        return "default";
      case "encerrado":
        return "secondary";
      case "suspenso":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatCurrency = (value: string) => {
    return value.startsWith("R$") ? value : `R$ ${value}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Convênios</h1>
          <p className="text-gray-600 mt-1">Gerencie os convênios da SEAP-PB</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Convênio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Convênio</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Convênio *</Label>
                <Input
                  id="numero"
                  value={newConvenio.numero}
                  onChange={(e) =>
                    setNewConvenio({ ...newConvenio, numero: e.target.value })
                  }
                  placeholder="Ex: CV001/2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Convênio *</Label>
                <Input
                  id="nome"
                  value={newConvenio.nome}
                  onChange={(e) =>
                    setNewConvenio({ ...newConvenio, nome: e.target.value })
                  }
                  placeholder="Nome do convênio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgaoConvenente">Órgão Convenente *</Label>
                <Input
                  id="orgaoConvenente"
                  value={newConvenio.orgaoConvenente}
                  onChange={(e) =>
                    setNewConvenio({
                      ...newConvenio,
                      orgaoConvenente: e.target.value,
                    })
                  }
                  placeholder="Órgão convenente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  value={newConvenio.valor}
                  onChange={(e) =>
                    setNewConvenio({ ...newConvenio, valor: e.target.value })
                  }
                  placeholder="Ex: 150000.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={newConvenio.dataInicio}
                  onChange={(e) =>
                    setNewConvenio({
                      ...newConvenio,
                      dataInicio: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data de Fim *</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={newConvenio.dataFim}
                  onChange={(e) =>
                    setNewConvenio({ ...newConvenio, dataFim: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={newConvenio.observacoes}
                  onChange={(e) =>
                    setNewConvenio({
                      ...newConvenio,
                      observacoes: e.target.value,
                    })
                  }
                  placeholder="Observações adicionais"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddConvenio}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Convênios</CardTitle>
            <div className="w-72">
              <Input
                placeholder="Pesquisar convênios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Órgão Convenente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConvenios.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      {searchTerm
                        ? "Nenhum convênio encontrado com os critérios de pesquisa."
                        : "Nenhum convênio cadastrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConvenios.map((convenio) => (
                    <TableRow key={convenio.id}>
                      <TableCell className="font-medium">
                        {convenio.numero}
                      </TableCell>
                      <TableCell>{convenio.nome}</TableCell>
                      <TableCell>{convenio.orgaoConvenente}</TableCell>
                      <TableCell>{formatCurrency(convenio.valor)}</TableCell>
                      <TableCell>
                        {formatDate(convenio.dataInicio)} -{" "}
                        {formatDate(convenio.dataFim)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(convenio.status)}>
                          {convenio.status.charAt(0).toUpperCase() +
                            convenio.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditConvenio(convenio)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteConvenio(convenio.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Convênio</DialogTitle>
            <DialogDescription>
              Atualize as informações do convênio selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-numero" className="text-right">
                Número *
              </Label>
              <Input
                id="edit-numero"
                value={newConvenio.numero}
                onChange={(e) =>
                  setNewConvenio({ ...newConvenio, numero: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nome" className="text-right">
                Nome *
              </Label>
              <Input
                id="edit-nome"
                value={newConvenio.nome}
                onChange={(e) =>
                  setNewConvenio({ ...newConvenio, nome: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-orgao" className="text-right">
                Órgão *
              </Label>
              <Input
                id="edit-orgao"
                value={newConvenio.orgaoConvenente}
                onChange={(e) =>
                  setNewConvenio({
                    ...newConvenio,
                    orgaoConvenente: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-valor" className="text-right">
                Valor *
              </Label>
              <Input
                id="edit-valor"
                value={newConvenio.valor}
                onChange={(e) =>
                  setNewConvenio({ ...newConvenio, valor: e.target.value })
                }
                className="col-span-3"
                placeholder="Ex: 150.000,00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-inicio" className="text-right">
                Data Início *
              </Label>
              <Input
                id="edit-inicio"
                type="date"
                value={newConvenio.dataInicio}
                onChange={(e) =>
                  setNewConvenio({ ...newConvenio, dataInicio: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fim" className="text-right">
                Data Fim *
              </Label>
              <Input
                id="edit-fim"
                type="date"
                value={newConvenio.dataFim}
                onChange={(e) =>
                  setNewConvenio({ ...newConvenio, dataFim: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <Select
                value={newConvenio.status}
                onValueChange={(value) =>
                  setNewConvenio({ ...newConvenio, status: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-observacoes" className="text-right">
                Observações
              </Label>
              <Textarea
                id="edit-observacoes"
                value={newConvenio.observacoes}
                onChange={(e) =>
                  setNewConvenio({
                    ...newConvenio,
                    observacoes: e.target.value,
                  })
                }
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Convenios;
