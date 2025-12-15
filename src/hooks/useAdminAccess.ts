import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminInfo {
  id: string;
  user_id: string;
  role: 'super_admin' | 'department_admin';
  department_id: string | null;
  assigned_districts: string[] | null;
  assigned_areas: string[] | null;
  created_at: string;
}

export function useAdminAccess() {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetchAdminInfo();
  }, []);

  const fetchAdminInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: adminData, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (adminData) {
        setAdminInfo(adminData as AdminInfo);
        setIsSuperAdmin(adminData.role === 'super_admin');
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccessIssue = (issue: { department_id?: string | null; district?: string | null; area?: string | null }) => {
    if (!adminInfo) return false;
    if (adminInfo.role === 'super_admin') return true;

    // Check department match
    if (adminInfo.department_id && issue.department_id && adminInfo.department_id !== issue.department_id) {
      return false;
    }

    // Check district match (if admin has location restrictions)
    if (adminInfo.assigned_districts && adminInfo.assigned_districts.length > 0) {
      if (!issue.district || !adminInfo.assigned_districts.includes(issue.district)) {
        return false;
      }
    }

    return true;
  };

  return {
    adminInfo,
    loading,
    isSuperAdmin,
    canAccessIssue,
    refetch: fetchAdminInfo
  };
}
