import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Lock, User, Shield, Phone } from 'lucide-react';
import PhoneAuthForm from '@/components/auth/PhoneAuthForm';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if user is admin
        const { data: isAdminResult } = await supabase.rpc('is_admin', { 
          check_user_id: session.user.id 
        });
        
        // Navigate based on role
        if (isAdminResult) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    });
  }, [navigate]);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      
      toast.success('Account created successfully! You can now sign in.');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (isAdminLogin) {
        // Check if user is admin for admin login mode
        const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin', { 
          check_user_id: data.user.id 
        });

        if (adminError) throw adminError;

        if (isAdminResult) {
          toast.success('Admin login successful!');
          navigate('/admin');
        } else {
          toast.error('Access denied. Admin privileges required.');
          await supabase.auth.signOut();
        }
      } else {
        // Regular user login
        const { data: isAdminResult } = await supabase.rpc('is_admin', { 
          check_user_id: data.user.id 
        });

        toast.success('Successfully signed in!');
        
        // Navigate based on role
        if (isAdminResult) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-card p-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-gradient-hero flex items-center justify-center">
            <div className="h-10 w-10 rounded-lg bg-background/20" />
          </div>
          <CardTitle className="text-2xl">{t('auth.welcome')}</CardTitle>
          <CardDescription>{t('auth.getStarted')}</CardDescription>
        </CardHeader>
        <CardContent>
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
              variant={authMethod === 'phone' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setAuthMethod('phone')}
            >
              <Phone className="mr-2 h-4 w-4" />
              Phone
            </Button>
            <Button
              variant={authMethod === 'email' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setAuthMethod('email')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </div>

          {authMethod === 'phone' ? (
            <PhoneAuthForm onSuccess={handleAuthSuccess} isAdminLogin={isAdminLogin} />
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup" disabled={isAdminLogin}>
                  {isAdminLogin ? 'Disabled' : 'Sign Up'}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
          
          <p className="mt-4 text-center text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
