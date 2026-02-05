import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LegalRule {
  id: string;
  category: string;
  act_name: string;
  section_clause: string | null;
  responsible_authority: string;
  sla_days: number | null;
  description: string | null;
  state: string | null;
  city: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface IssueLegalMapping {
  id: string;
  issue_id: string;
  legal_rule_id: string;
  auto_mapped: boolean;
  mapped_at: string;
  mapped_by: string | null;
  legal_rule?: LegalRule;
}

export function useLegalRules(category?: string) {
  const [rules, setRules] = useState<LegalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('legal_rules')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRules((data || []) as LegalRule[]);
    } catch (err) {
      console.error('Error fetching legal rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch legal rules');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return { rules, loading, error, refetch: fetchRules };
}

export function useIssueLegalMappings(issueId: string | undefined) {
  const [mappings, setMappings] = useState<IssueLegalMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!issueId) {
      setMappings([]);
      setLoading(false);
      return;
    }

    const fetchMappings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('issue_legal_mappings')
          .select(`
            *,
            legal_rule:legal_rules(*)
          `)
          .eq('issue_id', issueId);

        if (error) throw error;
        
        // Transform the data to match our interface
        const transformedData = (data || []).map(item => ({
          ...item,
          legal_rule: item.legal_rule as unknown as LegalRule
        }));
        
        setMappings(transformedData);
      } catch (err) {
        console.error('Error fetching legal mappings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMappings();
  }, [issueId]);

  return { mappings, loading };
}

export function useLegalRulesAdmin() {
  const [rules, setRules] = useState<LegalRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('legal_rules')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setRules((data || []) as LegalRule[]);
    } catch (err) {
      console.error('Error fetching all legal rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRules();
  }, []);

  const createRule = async (rule: Omit<LegalRule, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('legal_rules')
      .insert({ ...rule, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;
    await fetchAllRules();
    return data;
  };

  const updateRule = async (id: string, updates: Partial<LegalRule>) => {
    const { error } = await supabase
      .from('legal_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchAllRules();
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('legal_rules')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await fetchAllRules();
  };

  return { rules, loading, refetch: fetchAllRules, createRule, updateRule, deleteRule };
}
