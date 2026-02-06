import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Shield, Phone, Mail, KeyRound, MapPin, BarChart3, Users, CheckCircle } from 'lucide-react';
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
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-hero flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
              <p className="text-muted-foreground mt-1">Enter your new password below</p>
            </div>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10" required minLength={6} />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required minLength={6} />
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  const getHeaderText = () => {
    if (authView === 'signup') return { title: 'Create Account', desc: 'Sign up to get started with CivicReport' };
    if (authView === 'forgot') return { title: 'Reset Password', desc: "We'll help you get back in" };
    return { title: t('auth.welcome'), desc: t('auth.getStarted') };
  };

  const header = getHeaderText();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Branding Panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-primary-foreground">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">CivicReport</span>
            </div>
          </div>

          {/* Main hero text */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
                Report. Track.<br />Resolve.
              </h1>
              <p className="mt-4 text-lg text-primary-foreground/80 max-w-md">
                Your voice matters in building a better community. Report civic issues instantly and track them to resolution.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-background/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Real-time Tracking</p>
                  <p className="text-sm text-primary-foreground/70">Monitor your issue status with live updates</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-background/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Community Driven</p>
                  <p className="text-sm text-primary-foreground/70">Join thousands of active citizens making a difference</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-background/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Verified & Secure</p>
                  <p className="text-sm text-primary-foreground/70">DigiLocker integration for trusted reporting</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            <div>
              <p className="text-3xl font-bold">10K+</p>
              <p className="text-sm text-primary-foreground/70">Issues Reported</p>
            </div>
            <div>
              <p className="text-3xl font-bold">85%</p>
              <p className="text-sm text-primary-foreground/70">Resolution Rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50+</p>
              <p className="text-sm text-primary-foreground/70">Cities Covered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Auth Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo - only shown on small screens */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">CivicReport</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Header */}
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-foreground">{header.title}</h2>
              <p className="text-muted-foreground mt-1">{header.desc}</p>
            </div>

            {authView === 'forgot' ? (
              <ForgotPasswordForm onBack={() => setAuthView('login')} />
            ) : authView === 'signup' ? (
              <SignupForm onSwitchToLogin={() => setAuthView('login')} />
            ) : (
              <div className="space-y-5">
                {/* Google Sign In */}
                <Button
                  variant="outline"
                  className="w-full h-11 font-medium"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-foreground/30 border-t-foreground rounded-full inline-block" />
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                {/* Admin Login Toggle */}
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Admin Mode</span>
                    </div>
                    <Button
                      variant={isAdminLogin ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsAdminLogin(!isAdminLogin)}
                    >
                      {isAdminLogin ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  {isAdminLogin && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Only authorized administrators can access.
                    </p>
                  )}
                </div>

                {/* Auth Method Toggle */}
                <div className="flex gap-2">
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
                      className="w-full text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
