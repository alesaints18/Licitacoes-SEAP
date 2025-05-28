import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Mock data for now - will be replaced with real API call
  const mockConvenios: Convenio[] = [
    {
      id: 1,
      numero: "CV001/2025",
      nome: "Convênio de Cooperação Técnica",
      orgaoConvenente: "Ministério da Justiça",
      valor: "R$ 150.000,00",
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
      status: "ativo",
      observacoes: "Convênio para modernização do sistema",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: 2,
      numero: "CV002/2025",
      nome: "Convênio de Capacitação",
      orgaoConvenente: "SEAP Nacional",
      valor: "R$ 75.000,00",
      dataInicio: "2025-02-01",
      dataFim: "2025-06-30",
      status: "ativo",
      observacoes: "Capacitação de servidores",
      createdAt: "2025-02-01T00:00:00.000Z",
      updatedAt: "2025-02-01T00:00:00.000Z",
    },
  ];

  const convenios = mockConvenios;

  const filteredConvenios = convenios.filter(
    (convenio) =>
      convenio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convenio.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convenio.orgaoConvenente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddConvenio = () => {
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

    // Here we would make the API call to add the convenio
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
          <p className="text-gray-600 mt-1">
            Gerencie os convênios da SEAP-PB
          </p>
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
                  onChange={(e) => setNewConvenio({ ...newConvenio, numero: e.target.value })}
                  placeholder="Ex: CV001/2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Convênio *</Label>
                <Input
                  id="nome"
                  value={newConvenio.nome}
                  onChange={(e) => setNewConvenio({ ...newConvenio, nome: e.target.value })}
                  placeholder="Nome do convênio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgaoConvenente">Órgão Convenente *</Label>
                <Input
                  id="orgaoConvenente"
                  value={newConvenio.orgaoConvenente}
                  onChange={(e) => setNewConvenio({ ...newConvenio, orgaoConvenente: e.target.value })}
                  placeholder="Órgão convenente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  value={newConvenio.valor}
                  onChange={(e) => setNewConvenio({ ...newConvenio, valor: e.target.value })}
                  placeholder="Ex: 150000.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={newConvenio.dataInicio}
                  onChange={(e) => setNewConvenio({ ...newConvenio, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data de Fim *</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={newConvenio.dataFim}
                  onChange={(e) => setNewConvenio({ ...newConvenio, dataFim: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={newConvenio.observacoes}
                  onChange={(e) => setNewConvenio({ ...newConvenio, observacoes: e.target.value })}
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
              <Button onClick={handleAddConvenio} className="bg-blue-600 hover:bg-blue-700">
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
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? "Nenhum convênio encontrado com os critérios de pesquisa." : "Nenhum convênio cadastrado."}
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
                        {formatDate(convenio.dataInicio)} - {formatDate(convenio.dataFim)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(convenio.status)}>
                          {convenio.status.charAt(0).toUpperCase() + convenio.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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
    </div>
  );
};

export default Convenios;