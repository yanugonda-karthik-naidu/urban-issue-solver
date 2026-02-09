import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  is_valid: boolean;
  confidence: number;
  detected_type: string;
  category_match: boolean;
  rejection_reason: string | null;
  damage_severity: string;
  description: string;
}

export function useImageValidation() {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validateImage = async (imageUrl: string, category: string, issueId?: string): Promise<ValidationResult | null> => {
    setValidating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-image', {
        body: { image_url: imageUrl, category, issue_id: issueId },
      });
      if (error) throw error;
      setResult(data);
      return data;
    } catch (e) {
      console.error('Image validation error:', e);
      // Permissive fallback
      const fallback: ValidationResult = {
        is_valid: true, confidence: 0.5, detected_type: 'unknown',
        category_match: true, rejection_reason: null,
        damage_severity: 'unknown', description: 'Validation unavailable',
      };
      setResult(fallback);
      return fallback;
    } finally {
      setValidating(false);
    }
  };

  const clearResult = () => setResult(null);

  return { validateImage, validating, result, clearResult };
}
