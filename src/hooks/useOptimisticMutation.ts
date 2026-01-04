import { useQueryClient, useMutation, MutationFunction } from '@tanstack/react-query';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';

interface OptimisticMutationOptions<TData, TVariables, TContext> {
  mutationFn: MutationFunction<TData, TVariables>;
  queryKey: string[];
  // Function to optimistically update the cache
  optimisticUpdate: (oldData: TData | undefined, variables: TVariables) => TData;
  // Optional: function to get rollback data (defaults to using old data)
  getRollbackData?: (oldData: TData | undefined, variables: TVariables) => TData | undefined;
  // Success message
  successMessage?: string;
  // Error message
  errorMessage?: string;
  // Whether to show haptic feedback
  hapticFeedback?: boolean;
}

export function useOptimisticMutation<TData, TVariables, TContext = unknown>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  getRollbackData,
  successMessage = 'Changes saved',
  errorMessage = 'Failed to save changes',
  hapticFeedback = true,
}: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => optimisticUpdate(old, variables));

      // Trigger haptic feedback
      if (hapticFeedback) {
        triggerHaptic('light');
      }

      // Return context with the snapshotted value
      return { previousData } as TContext;
    },
    onError: (err, variables, context) => {
      // Rollback to previous value
      const ctx = context as { previousData: TData | undefined } | undefined;
      if (ctx?.previousData !== undefined) {
        const rollbackData = getRollbackData 
          ? getRollbackData(ctx.previousData, variables)
          : ctx.previousData;
        queryClient.setQueryData(queryKey, rollbackData);
      }

      if (hapticFeedback) {
        triggerHaptic('error');
      }
      
      toast.error(errorMessage);
      console.error('Mutation error:', err);
    },
    onSuccess: () => {
      if (hapticFeedback) {
        triggerHaptic('success');
      }
      toast.success(successMessage);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Helper hook for list operations (add, update, remove)
interface OptimisticListOptions<TItem, TVariables> {
  mutationFn: MutationFunction<TItem, TVariables>;
  queryKey: string[];
  // How to identify items (defaults to 'id')
  idKey?: keyof TItem;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticAdd<TItem extends { id?: string }, TVariables>({
  mutationFn,
  queryKey,
  successMessage = 'Added successfully',
  errorMessage = 'Failed to add',
}: OptimisticListOptions<TItem, TVariables>) {
  return useOptimisticMutation<TItem[], TVariables>({
    mutationFn: mutationFn as unknown as MutationFunction<TItem[], TVariables>,
    queryKey,
    optimisticUpdate: (oldData, variables) => {
      const tempItem = {
        ...(variables as unknown as TItem),
        id: `temp-${Date.now()}`,
        _optimistic: true,
      } as TItem;
      return [...(oldData || []), tempItem];
    },
    successMessage,
    errorMessage,
  });
}

export function useOptimisticUpdate<TItem extends { id: string }, TVariables extends { id: string }>({
  mutationFn,
  queryKey,
  idKey = 'id' as keyof TItem,
  successMessage = 'Updated successfully',
  errorMessage = 'Failed to update',
}: OptimisticListOptions<TItem, TVariables>) {
  return useOptimisticMutation<TItem[], TVariables>({
    mutationFn: mutationFn as unknown as MutationFunction<TItem[], TVariables>,
    queryKey,
    optimisticUpdate: (oldData, variables) => {
      if (!oldData) return [];
      return oldData.map((item) =>
        item[idKey] === variables.id
          ? { ...item, ...variables, _optimistic: true }
          : item
      );
    },
    successMessage,
    errorMessage,
  });
}

export function useOptimisticDelete<TItem extends { id: string }>({
  mutationFn,
  queryKey,
  idKey = 'id' as keyof TItem,
  successMessage = 'Deleted successfully',
  errorMessage = 'Failed to delete',
}: Omit<OptimisticListOptions<TItem, string>, 'mutationFn'> & { mutationFn: MutationFunction<void, string> }) {
  return useOptimisticMutation<TItem[], string>({
    mutationFn: mutationFn as unknown as MutationFunction<TItem[], string>,
    queryKey,
    optimisticUpdate: (oldData, id) => {
      if (!oldData) return [];
      return oldData.filter((item) => item[idKey] !== id);
    },
    successMessage,
    errorMessage,
  });
}
