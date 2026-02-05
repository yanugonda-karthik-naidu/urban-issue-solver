import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VerificationLevel = 'unverified' | 'verified' | 'anonymous';
export type VerificationMethod = 'none' | 'digilocker' | 'voter_id' | 'municipal_id' | 'admin_verified';

export interface UserVerification {
  id: string;
  user_id: string;
  verification_level: VerificationLevel;
  verification_method: VerificationMethod;
  verified_at: string | null;
  verified_by: string | null;
  consent_given: boolean;
  consent_given_at: string | null;
  trust_score: number;
  valid_reports_count: number;
  rejected_reports_count: number;
  verification_metadata: Record<string, unknown> | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserVerification() {
  const [verification, setVerification] = useState<UserVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setVerification(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_verification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no verification record exists, create one
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('user_verification')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setVerification(newData as UserVerification);
      } else {
        setVerification(data as UserVerification);
      }
    } catch (err) {
      console.error('Error fetching verification:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch verification');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const giveConsent = async () => {
    if (!verification) return;

    try {
      const { error: updateError } = await supabase
        .from('user_verification')
        .update({
          consent_given: true,
          consent_given_at: new Date().toISOString()
        })
        .eq('user_id', verification.user_id);

      if (updateError) throw updateError;
      await fetchVerification();
    } catch (err) {
      console.error('Error giving consent:', err);
      throw err;
    }
  };

  const revokeVerification = async () => {
    if (!verification) return;

    try {
      const { error: updateError } = await supabase
        .from('user_verification')
        .update({
          verification_level: 'unverified',
          verification_method: 'none',
          verified_at: null,
          revoked_at: new Date().toISOString(),
          verification_metadata: null
        })
        .eq('user_id', verification.user_id);

      if (updateError) throw updateError;
      await fetchVerification();
    } catch (err) {
      console.error('Error revoking verification:', err);
      throw err;
    }
  };

  const initiateDigiLockerVerification = async () => {
    if (!verification || !verification.consent_given) {
      throw new Error('Consent required before verification');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: funcError } = await supabase.functions.invoke('digilocker-auth', {
        body: { action: 'initiate', user_id: user.id }
      });

      if (funcError) throw funcError;
      return data;
    } catch (err) {
      console.error('Error initiating DigiLocker:', err);
      throw err;
    }
  };

  return {
    verification,
    loading,
    error,
    refetch: fetchVerification,
    giveConsent,
    revokeVerification,
    initiateDigiLockerVerification,
    isVerified: verification?.verification_level === 'verified',
    isAnonymous: verification?.verification_level === 'anonymous',
    trustScore: verification?.trust_score ?? 50
  };
}
