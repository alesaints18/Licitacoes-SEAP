import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User, BiddingModality } from "@shared/schema";

interface DashboardFiltersProps {
  onApplyFilters: (filters: {
    pbdoc?: string;
    modality?: string;
    responsible?: string;
  }) => void;
}

const DashboardFilters = ({ onApplyFilters }: DashboardFiltersProps) => {
  const [pbdoc, setPbdoc] = useState("");
  const [modality, setModality] = useState("");
  const [responsible, setResponsible] = useState("");
  
  // Get users for responsible selector
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Get modalities for modality selector
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
  });
  
  const handleApplyFilters = () => {
    onApplyFilters({
      pbdoc: pbdoc || undefined,
      modality: modality || undefined,
      responsible: responsible || undefined,
    });
  };
  
  const handleClearFilters = () => {
    setPbdoc("");
    setModality("");
    setResponsible("");
    onApplyFilters({});
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filter-pbdoc" className="block text-sm font-medium text-gray-700 mb-1">
              PBDOC
            </label>
            <Input
              id="filter-pbdoc"
              value={pbdoc}
              onChange={(e) => setPbdoc(e.target.value)}
              placeholder="Número do PBDOC"
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="filter-modalidade" className="block text-sm font-medium text-gray-700 mb-1">
              Modalidade
            </label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger id="filter-modalidade">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {modalities?.map((modalityItem) => (
                  <SelectItem key={modalityItem.id} value={modalityItem.id.toString()}>
                    {modalityItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label htmlFor="filter-responsavel" className="block text-sm font-medium text-gray-700 mb-1">
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
        </div>
        
        <div className="mt-4 flex items-center justify-end">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="mr-2"
          >
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters}>
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFilters;
