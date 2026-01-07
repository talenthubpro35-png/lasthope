import { useCallback, useState } from "react";
import { useToast } from "./use-toast";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });
  const { toast } = useToast();

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFunction();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      setState({ data: null, loading: false, error: message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [asyncFunction, toast]);

  if (immediate) {
    // Execute only once on mount
    if (state.loading && !state.data && !state.error) {
      execute();
    }
  }

  return {
    ...state,
    execute,
  };
}

// Hook for mutations (POST, PUT, DELETE)
export function useApiMutation<T, P = any>(
  asyncFunction: (params: P) => Promise<T>
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const { toast } = useToast();

  const mutate = useCallback(
    async (params: P) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await asyncFunction(params);
        setState({ data: result, loading: false, error: null });
        toast({
          title: "Success",
          description: "Operation completed successfully",
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        setState({ data: null, loading: false, error: message });
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        throw error;
      }
    },
    [asyncFunction, toast]
  );

  return {
    ...state,
    mutate,
  };
}
