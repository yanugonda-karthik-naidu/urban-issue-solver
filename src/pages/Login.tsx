import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Shield, Phone, Mail, KeyRound } from 'lucide-react';
import PhoneAuthForm from '@/components/auth/PhoneAuthForm';
import EmailAuthForm from '@/components/auth/EmailAuthForm';
import SignupForm from '@/components/auth/SignupForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

type AuthView = 'login' | 'signup' | 'forgot';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('email');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setShowResetPassword(true);
      setAuthMethod('email');
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        if (searchParams.get('reset') === 'true') return;
        
        const { data: isAdminResult } = await supabase.rpc('is_admin', { 
          check_user_id: session.user.id 
        });
        
        if (isAdminResult) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    });
  }, [navigate, searchParams]);

  const handleAuthSuccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: isAdminResult } = await supabase.rpc('is_admin', { 
        check_user_id: session.user.id 
      });
      
      if (isAdminResult) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setShowResetPassword(false);
      navigate('/login');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Form (when coming from email link)
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-card p-4">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-hero flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getHeaderText = () => {
    if (authView === 'signup') return { title: 'Create Account', desc: 'Sign up to get started with CivicReport' };
    if (authView === 'forgot') return { title: 'Reset Password', desc: 'We\'ll help you get back in' };
    return { title: t('auth.welcome'), desc: t('auth.getStarted') };
  };

  const header = getHeaderText();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-card p-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-hero flex items-center justify-center">
            <div className="h-10 w-10 rounded-lg bg-background/20" />
          </div>
          <CardTitle className="text-2xl">{header.title}</CardTitle>
          <CardDescription>{header.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {authView === 'forgot' ? (
            <ForgotPasswordForm onBack={() => setAuthView('login')} />
          ) : authView === 'signup' ? (
            <SignupForm onSwitchToLogin={() => setAuthView('login')} />
          ) : (
            <>
              {/* Admin Login Toggle */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-medium">Admin Mode</span>
                  </div>
                  <Button
                    variant={isAdminLogin ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsAdminLogin(!isAdminLogin)}
                  >
                    {isAdminLogin ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                {isAdminLogin && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Admin login mode is enabled. Only authorized administrators can access.
                  </p>
                )}
              </div>

              {/* Auth Method Toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={authMethod === 'email' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAuthMethod('email')}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant={authMethod === 'phone' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAuthMethod('phone')}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Phone
                </Button>
              </div>

              {authMethod === 'phone' ? (
                <PhoneAuthForm onSuccess={handleAuthSuccess} isAdminLogin={isAdminLogin} />
              ) : (
                <>
                  <EmailAuthForm
                    onSuccess={handleAuthSuccess}
                    isAdminLogin={isAdminLogin}
                    onSwitchToSignup={() => setAuthView('signup')}
                  />
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot')}
                    className="w-full mt-4 text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </>
              )}

              <p className="mt-4 text-center text-sm text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
