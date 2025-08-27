import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoginThemeToggle } from "@/components/login-theme-toggle";
import { LoginIntro } from "@/components/LoginIntro";
import { differenceInDays } from "date-fns";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building, Lock, Mail, User, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "O nome de usuário é obrigatório"),
  password: z.string().min(1, "A senha é obrigatória"),
});

// Register form schema
const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "O nome de usuário deve ter pelo menos 3 caracteres"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
    fullName: z.string().min(3, "O nome completo é obrigatório"),
    email: z.string().email("Digite um email válido"),
    department: z.string().min(1, "O setor é obrigatório"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [urgentProcesses, setUrgentProcesses] = useState<any[]>([]);
  const [showUrgentAlert, setShowUrgentAlert] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Create login form with default values
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Create register form with default values
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      department: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      console.log("Iniciando login para:", data.username);

      // Fazer a requisição diretamente sem usar o helper apiRequest
      console.log("Enviando dados de login:", JSON.stringify(data));
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify(data),
        credentials: "include",
        cache: "no-store",
      });

      console.log("Resposta do login:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Detalhes do erro de login:", errorText);
        throw new Error(`Erro no login: ${response.status} - ${errorText}`);
      }

      // Obter dados do usuário
      const user = await response.json();
      console.log("Login bem-sucedido:", user);

      // Verificar processos com prazos próximos
      try {
        const processesResponse = await fetch("/api/processes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        
        if (processesResponse.ok) {
          const processes = await processesResponse.json();
          
          // Filtrar processos com prazo de até 5 dias
          const today = new Date();
          const urgentProcessesList = processes.filter((process: any) => {
            if (!process.deadline) return false;
            const daysRemaining = differenceInDays(new Date(process.deadline), today);
            return daysRemaining >= 0 && daysRemaining <= 5;
          });
          
          if (urgentProcessesList.length > 0) {
            setUrgentProcesses(urgentProcessesList);
            setShowUrgentAlert(true);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar processos com prazos próximos:", error);
      }
      
      // Show success toast
      toast({
        title: "Login realizado com sucesso",
        description: "Você será redirecionado para o dashboard",
      });

      console.log("Login bem-sucedido, redirecionando para dashboard");
      
      // Importar e invalidar o cache do React Query para forçar atualização do estado de auth
      const { queryClient } = await import("../lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] }); // Remover await para ser mais rápido
      
      // Redirecionar diretamente para o dashboard após login
      setLocation("/");
    } catch (error) {
      console.error("Erro no login:", error);

      // Show error toast
      toast({
        title: "Erro ao fazer login",
        description:
          "Verifique seu nome de usuário e senha ou se sua conta foi ativada pelo administrador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsRegistering(true);

    try {
      // Remove confirmPassword field as it's not needed for the API
      const { confirmPassword, ...userData } = data;

      // Call register API
      const response = await apiRequest("POST", "/api/auth/register", userData);
      const result = await response.json();

      // Show success toast
      toast({
        title: "Cadastro realizado com sucesso",
        description:
          result.message ||
          "Seu cadastro foi enviado para aprovação do administrador.",
      });

      // Reset form
      registerForm.reset();

      // Switch to login tab
      document.getElementById("login-tab")?.click();
    } catch (error: any) {
      console.error("Registration error:", error);

      // Show error toast
      toast({
        title: "Erro ao realizar cadastro",
        description:
          error.message || "Verifique os dados informados e tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {/* Alerta de processos com prazos próximos */}
      <AlertDialog open={showUrgentAlert} onOpenChange={setShowUrgentAlert}>
        <AlertDialogContent className="max-w-[650px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-amber-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Processos com Prazos Urgentes
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os seguintes processos estão com prazos de entrega próximos do vencimento e requerem atenção imediata:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[300px] overflow-y-auto my-4 border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-800 uppercase">PBDOC</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-800 uppercase">Objeto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-800 uppercase">Prazo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urgentProcesses.map((process) => {
                  const daysRemaining = differenceInDays(new Date(process.deadline), new Date());
                  return (
                    <tr key={process.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{process.pbdocNumber}</td>
                      <td className="px-4 py-2 text-sm">{process.description}</td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${
                        daysRemaining <= 2 ? "text-red-600" : "text-amber-600"
                      }`}>
                        {daysRemaining > 0
                          ? `${daysRemaining} dias`
                          : daysRemaining === 0
                          ? "Hoje"
                          : "Vencido"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-primary">Entendi, vou verificar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {!showIntro && (
        <div className="w-full max-w-md px-4">
          <img
            src="https://paraiba.pb.gov.br/marca-do-governo/GovPBT.png"
            alt="Logo"
            className="mx-auto mb-4"
            width={250}
          />

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary mb-2">SEAP-PB</h1>
            <h2 className="text-xl text-foreground/80">
              Sistema de Controle de Processos de Licitação
            </h2>
          </div>

          <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login" id="login-tab">
              Login
            </TabsTrigger>
            <TabsTrigger value="register">Cadastro</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader className="relative">
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Acesse o sistema com suas credenciais
                </CardDescription>
                {/* <LoginThemeToggle /> */}
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Seu nome de usuário"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                type="password"
                                placeholder="Sua senha"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <div className="w-full text-center mt-2">
                  {/* <a 
                    href="/download" 
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors border border-green-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Baixar Aplicativo Desktop
                  </a> */}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="relative">
                <CardTitle>Cadastre-se</CardTitle>
                <CardDescription>
                  Crie uma nova conta para acessar o sistema.
                  <br />
                  <span className="text-amber-500 font-medium">
                    Seu cadastro será analisado por um administrador.
                  </span>
                </CardDescription>
                {/* <LoginThemeToggle /> */}
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Seu nome completo"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome de Usuário</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Username"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="email"
                                  placeholder="seu.email@exemplo.com"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Setor</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione seu setor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Setor Demandante">Setor Demandante</SelectItem>
                              <SelectItem value="Divisão de Licitação">Divisão de Licitação</SelectItem>
                              <SelectItem value="Núcleo de Pesquisa de Preços – NPP">Núcleo de Pesquisa de Preços – NPP</SelectItem>
                              <SelectItem value="Unidade de Orçamento e Finanças">Unidade de Orçamento e Finanças</SelectItem>
                              <SelectItem value="Secretário de Estado da Administração Penitenciária - SEAP">Secretário de Estado da Administração Penitenciária - SEAP</SelectItem>
                              <SelectItem value="Comitê Gestor do Plano de Contingência - CGPC">Comitê Gestor do Plano de Contingência - CGPC</SelectItem>
                              <SelectItem value="Unidade Técnico Normativa">Unidade Técnico Normativa</SelectItem>
                              <SelectItem value="Procuradoria Geral do Estado - PGE">Procuradoria Geral do Estado - PGE</SelectItem>
                              <SelectItem value="Controladoria Geral do Estado – CGE">Controladoria Geral do Estado – CGE</SelectItem>
                              <SelectItem value="Equipe de Pregão">Equipe de Pregão</SelectItem>
                              <SelectItem value="Subgerência de Contratos e  Convênios - SUBCC">Subgerência de Contratos e  Convênios - SUBCC</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="password"
                                  placeholder="Digite sua senha"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="password"
                                  placeholder="Confirme sua senha"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <span className="flex items-center">
                          Enviando... <ArrowRight className="ml-2 h-4 w-4" />
                        </span>
                      ) : (
                        <span className="flex items-center">
                          Cadastrar <ArrowRight className="ml-2 h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      )}
      
      {/* Mostrar intro antes do formulário de login */}
      {showIntro && <LoginIntro onComplete={() => setShowIntro(false)} />}
    </div>
  );
};

export default Login;
