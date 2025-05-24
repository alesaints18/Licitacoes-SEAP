import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User, BiddingModality } from "@shared/schema";

interface DashboardFiltersProps {
  onApplyFilters: (filters: {
    pbdoc?: string;
    centralcompras?: string;
    modality?: string;
    responsible?: string;
    deadline?: string;
  }) => void;
}

const DashboardFilters = ({ onApplyFilters }: DashboardFiltersProps) => {
  const [pbdoc, setPbdoc] = useState("");
  const [centralcompras, setCentralcompras] = useState("");
  const [modality, setModality] = useState("");
  const [responsible, setResponsible] = useState("");
  const [deadline, setDeadline] = useState("");

  // Get users for responsible selector
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get modalities for modality selector
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ["/api/modalities"],
  });

  const handleApplyFilters = () => {
    onApplyFilters({
      pbdoc: pbdoc || undefined,
      centralcompras: centralcompras || undefined,
      modality: modality === "all" ? undefined : modality || undefined,
      responsible: responsible === "all" ? undefined : responsible || undefined,
      deadline: deadline === "all" ? undefined : deadline || undefined,
    });
  };

  const handleClearFilters = () => {
    setPbdoc("");
    setCentralcompras("");
    setModality("");
    setResponsible("");
    setDeadline("");
    onApplyFilters({});
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label
              htmlFor="filter-pbdoc"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              PBDOC
            </label>
            <Input
              id="filter-pbdoc"
              value={pbdoc}
              onChange={(e) => setPbdoc(e.target.value)}
              placeholder="Número do PBDOC"
              className="w-25%"
            />
          </div>

          <div className="w-[100%]">
            <label
              htmlFor="filter-modalidade"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Modalidade
            </label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger id="filter-modalidade">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {modalities?.map((modalityItem) => (
                  <SelectItem
                    key={modalityItem.id}
                    value={modalityItem.id.toString()}
                  >
                    {modalityItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[100%]">
            <label
              htmlFor="filter-responsavel"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Responsável
            </label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger id="filter-responsavel">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="filter-central-compras"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Central de Compras
            </label>
            <Input
              id="filter-central-compras"
              value={centralcompras}
              onChange={(e) => setCentralcompras(e.target.value)}
              placeholder="Número da Central de Compras"
              className="w-25%"
            />
          </div>
          
          <div className="w-[100%]">
            <label
              htmlFor="filter-prazo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Prazo
            </label>
            <Select value={deadline} onValueChange={setDeadline}>
              <SelectTrigger id="filter-prazo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="urgent">Urgentes (até 5 dias)</SelectItem>
                <SelectItem value="soon">Próximos (até 10 dias)</SelectItem>
                <SelectItem value="future">Futuros (mais de 10 dias)</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="mr-2"
          >
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFilters;
