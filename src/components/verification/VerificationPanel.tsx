import { useState } from 'react';
import { Shield, ShieldCheck, AlertTriangle, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useUserVerification } from '@/hooks/useUserVerification';
import { VerificationBadge, TrustScoreBadge } from './VerificationBadge';
import { toast } from 'sonner';

export function VerificationPanel() {
  const { 
    verification, 
    loading, 
    isVerified,
    giveConsent, 
    revokeVerification,
    initiateDigiLockerVerification 
  } = useUserVerification();
  
  const [consentChecked, setConsentChecked] = useState(false);
  const [processingConsent, setProcessingConsent] = useState(false);
  const [processingVerification, setProcessingVerification] = useState(false);
  const [processingRevoke, setProcessingRevoke] = useState(false);

  const handleGiveConsent = async () => {
    if (!consentChecked) {
      toast.error('Please check the consent box first');
      return;
    }

    try {
      setProcessingConsent(true);
      await giveConsent();
      toast.success('Consent recorded successfully');
    } catch (err) {
      toast.error('Failed to record consent');
    } finally {
      setProcessingConsent(false);
    }
  };

  const handleDigiLockerVerification = async () => {
    try {
      setProcessingVerification(true);
      const result = await initiateDigiLockerVerification();
      if (result?.redirect_url) {
        window.open(result.redirect_url, '_blank');
      } else {
        toast.info('DigiLocker integration requires API configuration. Please contact administrator.');
      }
    } catch (err) {
      toast.error('DigiLocker verification not yet configured');
    } finally {
      setProcessingVerification(false);
    }
  };

  const handleRevokeVerification = async () => {
    try {
      setProcessingRevoke(true);
      await revokeVerification();
      toast.success('Verification revoked successfully');
    } catch (err) {
      toast.error('Failed to revoke verification');
    } finally {
      setProcessingRevoke(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Identity Verification
            </CardTitle>
            <CardDescription>
              Verify your identity to increase report credibility and priority
            </CardDescription>
          </div>
          {verification && (
            <VerificationBadge 
              level={verification.verification_level} 
              trustScore={verification.trust_score}
              showScore
              size="lg"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
            <p className="text-lg font-medium capitalize">
              {verification?.verification_level || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Trust Score</p>
            <div className="flex items-center gap-2">
              <TrustScoreBadge score={verification?.trust_score ?? 50} size="lg" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Valid Reports</p>
            <p className="text-lg font-medium">{verification?.valid_reports_count || 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Rejected Reports</p>
            <p className="text-lg font-medium">{verification?.rejected_reports_count || 0}</p>
          </div>
        </div>

        <Separator />

        {/* Benefits of Verification */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Benefits of Verification
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Higher priority for your reports</li>
            <li>Faster SLA handling by departments</li>
            <li>Increased credibility score</li>
            <li>Faster escalation for critical issues</li>
          </ul>
        </div>

        {/* Consent Section */}
        {!verification?.consent_given && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Privacy Notice</AlertTitle>
              <AlertDescription className="text-xs mt-2">
                <p>By proceeding with verification, you consent to:</p>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>Verification of your identity via government-approved methods</li>
                  <li>Storage of verification status (not raw ID numbers)</li>
                  <li>Use of verification status for report prioritization</li>
                </ul>
                <p className="mt-2">You can revoke this consent and delete verification data at any time.</p>
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-2">
              <Checkbox 
                id="consent" 
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
              />
              <Label htmlFor="consent" className="text-sm leading-tight cursor-pointer">
                I consent to identity verification and understand the privacy policy
              </Label>
            </div>

            <Button 
              onClick={handleGiveConsent} 
              disabled={!consentChecked || processingConsent}
              className="w-full"
            >
              {processingConsent ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                'Give Consent & Proceed'
              )}
            </Button>
          </>
        )}

        {/* Verification Options */}
        {verification?.consent_given && !isVerified && (
          <div className="space-y-3">
            <h4 className="font-medium">Choose Verification Method</h4>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={handleDigiLockerVerification}
              disabled={processingVerification}
            >
              {processingVerification ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <img src="https://digilocker.gov.in/assets/img/digilocker-logo.png" alt="DigiLocker" className="h-5 w-5 object-contain" />
              )}
              <div className="text-left">
                <p className="font-medium">Verify with DigiLocker</p>
                <p className="text-xs text-muted-foreground">Government digital document wallet</p>
              </div>
              <ExternalLink className="ml-auto h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              More verification methods coming soon (Voter ID, Municipal ID)
            </p>
          </div>
        )}

        {/* Verified Status */}
        {isVerified && (
          <div className="space-y-4">
            <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800 dark:text-emerald-300">Verified Citizen</AlertTitle>
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                Your identity has been verified. Your reports receive priority handling.
              </AlertDescription>
            </Alert>

            {verification?.verified_at && (
              <p className="text-xs text-muted-foreground">
                Verified on: {new Date(verification.verified_at).toLocaleDateString()}
              </p>
            )}

            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleRevokeVerification}
              disabled={processingRevoke}
            >
              {processingRevoke ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Revoke Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
