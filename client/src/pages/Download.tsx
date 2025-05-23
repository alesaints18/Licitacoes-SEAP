import { useParams } from "wouter";
import { FileDown, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

const Download = () => {
  const { token } = useParams();
  const [downloaded, setDownloaded] = useState(false);
  
  // Status de download
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed'>('idle');
  
  // Função para iniciar o download
  const handleDownload = () => {
    // Configurar status de download
    setDownloadStatus('downloading');
    
    // Simular progresso de download
    setTimeout(() => {
      setDownloadStatus('completed');
      setDownloaded(true);
      
      // Criar link de download para o arquivo
      const link = document.createElement('a');
      link.href = '/downloads/SEAP-PB-v1.0.0.zip';
      link.setAttribute('download', 'SEAP-PB-v1.0.0.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 2000);
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <FileDown className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Sistema SEAP-PB</CardTitle>
          <CardDescription>
            Sistema de Controle de Processos de Licitação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
            <h3 className="font-medium mb-2">Informações do Download</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Versão: 1.0.0<br />
              Tamanho: 12.5 MB<br />
              Data de lançamento: 23/05/2025
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <h3 className="font-medium mb-2">Conteúdo</h3>
            <ul className="text-sm text-gray-500 dark:text-gray-400 list-disc pl-5 space-y-1">
              <li>Aplicativo completo do Sistema SEAP-PB</li>
              <li>Guia de instalação</li>
              <li>Documentação de usuário</li>
              <li>Requisitos de sistema</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          {downloadStatus === 'idle' && (
            <Button onClick={handleDownload} className="w-3/4">
              <FileDown className="mr-2 h-4 w-4" />
              Baixar agora
            </Button>
          )}
          
          {downloadStatus === 'downloading' && (
            <Button disabled className="w-3/4">
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Baixando...
            </Button>
          )}
          
          {downloadStatus === 'completed' && (
            <Button variant="outline" className="w-3/4 bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="mr-2 h-4 w-4" />
              Download concluído
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Download;