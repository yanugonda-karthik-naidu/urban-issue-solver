import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, ArrowRight, Loader2, Timer } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const RESEND_COOLDOWN = 30; // seconds

interface EmailAuthFormProps {
  onSuccess: () => void;
  isAdminLogin?: boolean;
}

export default function EmailAuthForm({ onSuccess, isAdminLogin }: EmailAuthFormProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      setResendTimer(RESEND_COOLDOWN);
      toast.success('OTP sent to your email address');
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      if (isAdminLogin && data.user) {
        // Check if user is admin for admin login mode
        const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin', { 
          check_user_id: data.user.id 
        });

        if (adminError) throw adminError;

        if (!isAdminResult) {
          toast.error('Access denied. Admin privileges required.');
          await supabase.auth.signOut();
          return;
        }
      }

      toast.success('Successfully signed in!');
      onSuccess();
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setOtp('');
    await handleSendOTP({ preventDefault: () => {} } as React.FormEvent);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  if (otpSent) {
    return (
      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to
          </p>
          <p className="font-medium">{email}</p>
        </div>
        
        <div className="flex justify-center">
          <InputOTP
            value={otp}
            onChange={setOtp}
            maxLength={6}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button type="submit" variant="hero" className="w-full" disabled={loading || otp.length !== 6}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify OTP'
          )}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setResendTimer(0);
            }}
            className="text-primary hover:underline"
          >
            Change email
          </button>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={loading || resendTimer > 0}
            className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {resendTimer > 0 ? (
              <>
                <Timer className="h-3 w-3" />
                Resend in {formatTime(resendTimer)}
              </>
            ) : (
              'Resend OTP'
            )}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOTP} className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          We'll send a 6-digit verification code to this email
        </p>
      </div>
      
      <Button type="submit" variant="hero" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending OTP...
          </>
        ) : (
          <>
            Send OTP
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
