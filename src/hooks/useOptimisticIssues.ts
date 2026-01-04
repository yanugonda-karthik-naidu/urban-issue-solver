import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { ConflictData } from '@/components/ConflictResolutionDialog';

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  area: string | null;
  district: string | null;
  state: string | null;
  photo_url: string | null;
  admin_remarks: string | null;
  updated_at?: string | null;
}

interface OptimisticIssueUpdate {
  issueId: string;
  field: keyof Issue;
  value: unknown;
  previousValue: unknown;
  timestamp: number;
}

// Store for tracking optimistic updates
const optimisticUpdates = new Map<string, OptimisticIssueUpdate>();

export function useOptimisticIssues(userId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['user-issues', userId];

  // Optimistically update issue status
  const updateIssueStatus = useCallback(
    async (
      issueId: string,
      newStatus: Issue['status'],
      onConflict?: (conflict: ConflictData) => void
    ) => {
      if (!userId) return;

      // Get current cache
      const previousIssues = queryClient.getQueryData<Issue[]>(queryKey);
      const issue = previousIssues?.find((i) => i.id === issueId);
      
      if (!issue) return;

      const previousStatus = issue.status;
      const updateKey = `${issueId}-status`;

      // Track this optimistic update
      optimisticUpdates.set(updateKey, {
        issueId,
        field: 'status',
        value: newStatus,
        previousValue: previousStatus,
        timestamp: Date.now(),
      });

      // Optimistically update UI
      triggerHaptic('light');
      queryClient.setQueryData<Issue[]>(queryKey, (old) =>
        old?.map((i) =>
          i.id === issueId
            ? { ...i, status: newStatus, _optimistic: true } as Issue & { _optimistic: boolean }
            : i
        )
      );

      try {
        // First, check for conflicts by fetching current server state
        const { data: serverIssue, error: fetchError } = await supabase
          .from('issues')
          .select('status, updated_at')
          .eq('id', issueId)
          .single();

        if (fetchError) throw fetchError;

        // Check if server has different value than what we started with
        if (serverIssue.status !== previousStatus) {
          // Conflict detected!
          optimisticUpdates.delete(updateKey);
          
          // Rollback optimistic update
          queryClient.setQueryData<Issue[]>(queryKey, previousIssues);
          
          // Notify about conflict
          if (onConflict) {
            onConflict({
              id: updateKey,
              field: 'status',
              localValue: newStatus,
              serverValue: serverIssue.status,
              localTimestamp: Date.now(),
              serverTimestamp: new Date(serverIssue.updated_at || Date.now()).getTime(),
              entityType: 'Issue',
              entityName: issue.title,
            });
          }
          
          triggerHaptic('error');
          toast.error('Conflict detected - issue was updated by someone else');
          return { conflict: true };
        }

        // No conflict, proceed with update
        const { error } = await supabase
          .from('issues')
          .update({ status: newStatus })
          .eq('id', issueId);

        if (error) throw error;

        optimisticUpdates.delete(updateKey);
        triggerHaptic('success');
        toast.success('Status updated');
        
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey });
        
        return { conflict: false };
      } catch (error) {
        // Rollback on error
        optimisticUpdates.delete(updateKey);
        queryClient.setQueryData<Issue[]>(queryKey, previousIssues);
        triggerHaptic('error');
        toast.error('Failed to update status');
        console.error('Update error:', error);
        return { conflict: false, error };
      }
    },
    [userId, queryClient, queryKey]
  );

  // Optimistically delete an issue
  const deleteIssue = useCallback(
    async (issueId: string) => {
      if (!userId) return;

      const previousIssues = queryClient.getQueryData<Issue[]>(queryKey);

      // Optimistically remove from UI
      triggerHaptic('light');
      queryClient.setQueryData<Issue[]>(queryKey, (old) =>
        old?.filter((i) => i.id !== issueId)
      );

      try {
        const { error } = await supabase
          .from('issues')
          .delete()
          .eq('id', issueId);

        if (error) throw error;

        triggerHaptic('success');
        toast.success('Issue deleted');
      } catch (error) {
        // Rollback
        queryClient.setQueryData<Issue[]>(queryKey, previousIssues);
        triggerHaptic('error');
        toast.error('Failed to delete issue');
        console.error('Delete error:', error);
      }
    },
    [userId, queryClient, queryKey]
  );

  // Check for pending optimistic updates
  const hasPendingUpdates = useCallback(() => {
    return optimisticUpdates.size > 0;
  }, []);

  // Get all pending updates
  const getPendingUpdates = useCallback(() => {
    return Array.from(optimisticUpdates.values());
  }, []);

  // Rollback all optimistic updates
  const rollbackAll = useCallback(() => {
    optimisticUpdates.clear();
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    updateIssueStatus,
    deleteIssue,
    hasPendingUpdates,
    getPendingUpdates,
    rollbackAll,
  };
}
