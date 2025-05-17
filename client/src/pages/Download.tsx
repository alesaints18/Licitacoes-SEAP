import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download as DownloadIcon } from "lucide-react";

const Download = () => {
  // Função para lidar com o download
  const handleDownload = () => {
    // URL do arquivo para download
    const fileUrl = "/downloads/SEAP-PB-win-x64.rar";
    
    // Criando um elemento de link para iniciar o download
    const link = document.createElement("a");
    link.href = fileUrl;
    link.setAttribute("download", "SEAP-PB-win-x64.rar");
    
    // Adicionar ao corpo do documento, clicar e remover
    document.body.appendChild(link);
    
    // Mostrar feedback ao usuário antes de iniciar o download
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Sistema de Controle de Processos de Licitação
          </CardTitle>
          <CardDescription>
            Secretaria de Estado da Administração Penitenciária
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-6">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <DownloadIcon className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="mt-4 text-lg font-medium">Download do Aplicativo</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Versão para Windows 64 bits. Clique no botão abaixo para baixar.
            </p>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <h4 className="text-amber-800 dark:text-amber-300 font-medium">Requisitos do Sistema</h4>
            <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 list-disc list-inside space-y-1">
              <li>Windows 10 ou posterior (64 bits)</li>
              <li>4GB de RAM mínimo</li>
              <li>500MB de espaço em disco</li>
              <li>Conexão com internet</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={handleDownload} 
            className="w-full" 
            size="lg"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Baixar Aplicativo (64MB)
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Ao baixar, você concorda com os{" "}
            <Link href="/termos" className="text-primary hover:underline">
              termos de uso
            </Link>{" "}
            do software.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Download;