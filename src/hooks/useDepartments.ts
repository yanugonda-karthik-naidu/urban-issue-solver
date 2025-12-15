import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sla_hours: number;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface CategoryMapping {
  id: string;
  category: string;
  department_id: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const [deptResult, mappingResult] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('category_department_mapping').select('*')
      ]);

      if (deptResult.data) {
        setDepartments(deptResult.data as Department[]);
      }
      if (mappingResult.data) {
        setCategoryMappings(mappingResult.data as CategoryMapping[]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentByCategory = (category: string): Department | undefined => {
    const mapping = categoryMappings.find(m => m.category === category);
    if (!mapping) return undefined;
    return departments.find(d => d.id === mapping.department_id);
  };

  const getDepartmentById = (id: string): Department | undefined => {
    return departments.find(d => d.id === id);
  };

  return {
    departments,
    categoryMappings,
    loading,
    getDepartmentByCategory,
    getDepartmentById,
    refetch: fetchDepartments
  };
}
