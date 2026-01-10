import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from './useAdminAccess';

interface IssueCounts {
  pending: number;
  inProgress: number;
  total: number;
}

export function useIssueCounts() {
  const [counts, setCounts] = useState<IssueCounts>({ pending: 0, inProgress: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const { adminInfo, isSuperAdmin, loading: adminLoading } = useAdminAccess();

  const fetchCounts = async () => {
    if (adminLoading) return;

    try {
      let query = supabase.from('issues').select('status, department_id');
      
      // Filter by department for department admins
      if (!isSuperAdmin && adminInfo?.department_id) {
        query = query.eq('department_id', adminInfo.department_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const pending = data?.filter(i => i.status === 'pending').length || 0;
      const inProgress = data?.filter(i => i.status === 'in_progress').length || 0;
      const total = data?.length || 0;

      setCounts({ pending, inProgress, total });
    } catch (error) {
      console.error('Error fetching issue counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLoading) {
      fetchCounts();
    }
  }, [adminLoading, adminInfo?.department_id, isSuperAdmin]);

  // Set up real-time subscription
  useEffect(() => {
    if (adminLoading) return;

    const filter = !isSuperAdmin && adminInfo?.department_id 
      ? `department_id=eq.${adminInfo.department_id}`
      : undefined;

    const channel = supabase
      .channel('issue-counts')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'issues',
          ...(filter && { filter })
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminLoading, adminInfo?.department_id, isSuperAdmin]);

  return { counts, loading, refetch: fetchCounts };
}
