import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Tenta obter o corpo da resposta como JSON, se falhar, usa o texto
    try {
      const errorData = await res.json();
      throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
    } catch (e) {
      // Se não conseguir parsear como JSON, tenta obter como texto
      const text = (await res.text().catch(() => res.statusText)) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Adiciona um timestamp para evitar cache
  const cacheBusterUrl = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;
  
  console.log(`Requisição ${method} para ${cacheBusterUrl}`);
  
  const res = await fetch(cacheBusterUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`Resposta ${method} ${url}: status=${res.status}`);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Adiciona um cache buster para evitar caches indesejados
    const url = (queryKey[0] as string).includes('?') 
      ? `${queryKey[0]}&_t=${Date.now()}` 
      : `${queryKey[0]}?_t=${Date.now()}`;
      
    console.log(`Realizando consulta para ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });
    
    console.log(`Resposta de consulta ${url}: status=${res.status}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Retornando null para erro 401 em ${url}`);
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
