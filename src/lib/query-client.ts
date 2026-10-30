import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Global state for holding detailed error logs for the "hidden debug mode"
 */
let errorLogs: { timestamp: string; message: string; details?: any }[] = [];

export const getErrorLogs = () => errorLogs;

export const clearErrorLogs = () => {
  errorLogs = [];
};

const addErrorLog = (message: string, details?: any) => {
  const log = {
    timestamp: new Date().toISOString(),
    message,
    details,
  };
  errorLogs.push(log);
  console.error("[Network Debug]", log);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Retry logic: 3 times for network/timeout errors
        const isNetworkError = 
          !error.status || // Network error (no status)
          error.status === 408 || // Timeout
          error.status >= 500; // Server error
        
        if (isNetworkError && failureCount < 3) {
          const delay = Math.min(1000 * 2 ** failureCount, 10000);
          console.warn(`[Query Retry] Tentativa ${failureCount + 1} em ${delay}ms devido a:`, error);
          
          if (failureCount === 0) {
            toast.warning("Conexão instável detectada. Tentando reconectar...", {
              id: "network-retry-warning",
            });
          }
          return true;
        }
        return false;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      throwOnError: false, // We handle errors in components usually, but global toast is good
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Mutations usually shouldn't retry automatically if they aren't idempotent,
        // but for network errors it's often desired by users in unstable environments.
        const isNetworkError = !error.status || error.status === 408;
        if (isNetworkError && failureCount < 2) return true;
        return false;
      },
      onError: (error: any) => {
        const message = error.message || "Erro na requisição";
        addErrorLog(message, error);
        
        toast.error(`Falha na operação: ${message}`, {
          description: "Verifique sua conexão e tente novamente.",
        });
      }
    }
  },
});

// Setup global error handling for fetch/Supabase
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (event.reason.name === 'FetchError' || event.reason.message?.includes('fetch'))) {
      addErrorLog("Promise Rejection (Network Likely)", event.reason);
      toast.error("Erro de conexão persistente", {
        description: "A rede pode estar bloqueando o acesso ao servidor.",
        id: "global-network-error"
      });
    }
  });
}
