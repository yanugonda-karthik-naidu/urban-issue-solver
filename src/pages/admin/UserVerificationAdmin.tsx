import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, User, Search, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { VerificationBadge, TrustScoreBadge } from '@/components/verification/VerificationBadge';
import { format } from 'date-fns';

interface UserWithVerification {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  verification: {
    verification_level: 'unverified' | 'verified' | 'anonymous';
    verification_method: string;
    trust_score: number;
    valid_reports_count: number;
    rejected_reports_count: number;
    verified_at: string | null;
    consent_given: boolean;
  } | null;
}

export default function UserVerificationAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperAdmin, loading: adminLoading } = useAdminAccess();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [verifyingUser, setVerifyingUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-verification'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get verification data for each user
      const usersWithVerification: UserWithVerification[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: verificationData } = await supabase
            .from('user_verification')
            .select('*')
            .eq('user_id', profile.id)
            .maybeSingle();

          return {
            ...profile,
            verification: verificationData as UserWithVerification['verification']
          };
        })
      );

      return usersWithVerification;
    }
  });

  if (adminLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Only Super Admins can manage user verification.</p>
          <Button onClick={() => navigate('/admin')} className="mt-4">Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (filterLevel === 'all') return matchesSearch;
    return matchesSearch && user.verification?.verification_level === filterLevel;
  });

  const handleAdminVerify = async (userId: string, method: string) => {
    setVerifyingUser(userId);
    try {
      const { error } = await supabase.functions.invoke('digilocker-auth', {
        body: { 
          action: 'admin_verify',
          callback_data: { target_user_id: userId, method }
        }
      });

      if (error) throw error;
      
      toast.success('User verified successfully');
      queryClient.invalidateQueries({ queryKey: ['users-verification'] });
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Failed to verify user');
    } finally {
      setVerifyingUser(null);
    }
  };

  const verifiedCount = users?.filter(u => u.verification?.verification_level === 'verified').length || 0;
  const unverifiedCount = users?.filter(u => !u.verification || u.verification?.verification_level === 'unverified').length || 0;

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              User Verification Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage citizen identity verification and trust scores
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Verified Citizens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{verifiedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{unverifiedCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="anonymous">Anonymous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Verified At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <VerificationBadge 
                        level={user.verification?.verification_level || 'unverified'} 
                      />
                    </TableCell>
                    <TableCell>
                      <TrustScoreBadge score={user.verification?.trust_score ?? 50} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-emerald-600">{user.verification?.valid_reports_count || 0} valid</span>
                        {' / '}
                        <span className="text-red-600">{user.verification?.rejected_reports_count || 0} rejected</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.verification?.verified_at ? (
                        <span className="text-sm">{format(new Date(user.verification.verified_at), 'PP')}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.verification?.verification_level !== 'verified' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Verify
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Verify User: {user.full_name || user.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <p className="text-sm text-muted-foreground">
                                Select verification method to mark this user as verified:
                              </p>
                              <div className="grid gap-2">
                                <Button 
                                  variant="outline" 
                                  className="justify-start"
                                  onClick={() => handleAdminVerify(user.id, 'voter_id')}
                                  disabled={verifyingUser === user.id}
                                >
                                  {verifyingUser === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Verify via Voter ID
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="justify-start"
                                  onClick={() => handleAdminVerify(user.id, 'municipal_id')}
                                  disabled={verifyingUser === user.id}
                                >
                                  {verifyingUser === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Verify via Municipal ID
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="justify-start"
                                  onClick={() => handleAdminVerify(user.id, 'admin_verified')}
                                  disabled={verifyingUser === user.id}
                                >
                                  {verifyingUser === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Mark as Trusted Citizen (Admin)
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching your criteria.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
