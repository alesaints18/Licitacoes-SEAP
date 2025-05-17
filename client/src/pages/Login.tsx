import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoginThemeToggle } from "@/components/login-theme-toggle";
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
const registerSchema = z.object({
  username: z.string().min(3, "O nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme sua senha"),
  fullName: z.string().min(3, "O nome completo é obrigatório"),
  email: z.string().email("Digite um email válido"),
  department: z.string().min(1, "O setor é obrigatório"),
}).refine((data) => data.password === data.confirmPassword, {
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
      // Adiciona um timestamp para evitar caching
      console.log("Iniciando login para:", data.username);
      
      // Call login API
      const response = await apiRequest("POST", "/api/auth/login", data);
      
      // Verificar resposta explicitamente
      console.log("Resposta do login:", response.status);
      
      // Validar resposta e obter dados do usuário
      const user = await response.json();
      console.log("Login bem-sucedido:", user);

      // Show success toast
      toast({
        title: "Login realizado com sucesso",
        description: "Você será redirecionado para o dashboard",
      });
      
      // Verificar o status da autenticação após o login
      const checkAuth = async () => {
        try {
          const statusResponse = await fetch('/api/auth/status?_t=' + Date.now(), { credentials: 'include' });
          console.log("Status da autenticação após login:", statusResponse.status);
          if (statusResponse.ok) {
            return true;
          }
          return false;
        } catch (e) {
          console.error("Erro ao verificar autenticação:", e);
          return false;
        }
      };
      
      // Verificar se estamos autenticados
      const isAuthenticated = await checkAuth();
      console.log("Estado de autenticação:", isAuthenticated ? "Autenticado" : "Não autenticado");

      // Redirecionamento aprimorado
      try {
        // Tentativa 1: Usar a API de navegação do wouter
        console.log("Tentando redirecionamento via wouter");
        setLocation("/");
        
        // Tentativa 2: Verifica se ainda estamos na página de login após um curto delay
        setTimeout(() => {
          if (window.location.pathname.includes("/auth") || window.location.pathname === "/login") {
            console.log("Tentando redirecionamento via location.href");
            window.location.href = "/";
            
            // Tentativa 3: Se ainda não redirecionou, tenta recarregar a página
            setTimeout(() => {
              if (window.location.pathname.includes("/auth") || window.location.pathname === "/login") {
                console.log("Tentando redirecionamento com reload");
                window.location.reload();
              }
            }, 200);
          }
        }, 300);
      } catch (navigationError) {
        console.error("Erro durante navegação:", navigationError);
        // Fallback final: forçar redirecionamento com reload
        window.location.href = "/";
        setTimeout(() => window.location.reload(), 200);
      }
    } catch (error) {
      console.error("Erro no login:", error);

      // Show error toast
      toast({
        title: "Erro ao fazer login",
        description: "Verifique seu nome de usuário e senha ou se sua conta foi ativada pelo administrador",
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
        description: result.message || "Seu cadastro foi enviado para aprovação do administrador.",
      });
      
      // Reset form
      registerForm.reset();
      
      // Switch to login tab
      document.getElementById('login-tab')?.click();
      
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Show error toast
      toast({
        title: "Erro ao realizar cadastro",
        description: error.message || "Verifique os dados informados e tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md px-4">
        <img
          src="https://paraiba.pb.gov.br/marca-do-governo/GovPBT.png"
          alt="Logo"
          className="mx-auto mb-4"
          width={250}
        />

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">
            SEAP-PB
          </h1>
          <h2 className="text-xl text-foreground/80">
            Sistema de Controle de Processos de Licitação
          </h2>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login" id="login-tab">Login</TabsTrigger>
            <TabsTrigger value="register">Cadastro</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader className="relative">
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Acesse o sistema com suas credenciais
                </CardDescription>
                <LoginThemeToggle />
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <div className="text-sm text-center text-muted-foreground">
                  <p>Usuário comum: user / user123</p>
                  <p>Administrador: admin / admin123</p>
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
                  <br/>
                  <span className="text-amber-500 font-medium">
                    Seu cadastro será analisado por um administrador.
                  </span>
                </CardDescription>
                <LoginThemeToggle />
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
                              <SelectItem value="TI">TI</SelectItem>
                              <SelectItem value="Licitações">Licitações</SelectItem>
                              <SelectItem value="Jurídico">Jurídico</SelectItem>
                              <SelectItem value="Financeiro">Financeiro</SelectItem>
                              <SelectItem value="Administrativo">Administrativo</SelectItem>
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
    </div>
  );
};

export default Login;
