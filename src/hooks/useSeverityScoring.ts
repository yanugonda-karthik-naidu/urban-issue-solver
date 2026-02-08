import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeverityResult {
  severity_score: number;
  severity_level: string;
  reasoning: string;
  risk_factors: string[];
  recommended_action: string;
  nearby_reports: number;
  fallback?: boolean;
}

export function useSeverityScoring() {
  const [calculating, setCalculating] = useState(false);

  const calculateSeverity = async (issueId: string): Promise<SeverityResult | null> => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-severity', {
        body: { issue_id: issueId },
      });

      if (error) {
        console.error('Severity calculation error:', error);
        toast.error('Failed to calculate severity');
        return null;
      }

      if (data?.error) {
        console.error('Severity API error:', data.error);
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Severity will be calculated later.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Using rule-based scoring.');
        }
        return null;
      }

      return data as SeverityResult;
    } catch (err) {
      console.error('Error calling severity function:', err);
      return null;
    } finally {
      setCalculating(false);
    }
  };

  const recalculateSeverity = async (issueId: string) => {
    const result = await calculateSeverity(issueId);
    if (result) {
      toast.success(`Severity updated: ${result.severity_level.toUpperCase()} (${result.severity_score})`);
    }
    return result;
  };

  return { calculateSeverity, recalculateSeverity, calculating };
}
