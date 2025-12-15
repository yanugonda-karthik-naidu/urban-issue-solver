import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ShieldCheck, UserPlus, Trash2, Building2 } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { DepartmentBadge } from '@/components/admin/DepartmentBadge';

interface Admin {
  id: string;
  user_id: string;
  role: 'super_admin' | 'department_admin';
  department_id: string | null;
  assigned_districts: string[] | null;
  assigned_areas: string[] | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'department_admin'>('department_admin');
  const [newAdminDepartment, setNewAdminDepartment] = useState('');
  const [newAdminDistricts, setNewAdminDistricts] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { departments, getDepartmentById } = useDepartments();
  const { isSuperAdmin } = useAdminAccess();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminsError) throw adminsError;

      // Fetch profiles for all admin user_ids
      const userIds = adminsData?.map(a => a.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = { full_name: p.full_name, email: p.email };
        return acc;
      }, {} as Record<string, { full_name: string | null; email: string | null }>);

      const adminsWithProfiles = (adminsData || []).map(admin => ({
        ...admin,
        profile: profilesMap[admin.user_id] || { full_name: null, email: null }
      })) as Admin[];

      setAdmins(adminsWithProfiles);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setSubmitting(true);
    try {
      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newAdminEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast.error('User not found. They must sign up first.');
        return;
      }

      // Check if already an admin
      const existingAdmin = admins.find(a => a.user_id === profile.id);
      if (existingAdmin) {
        toast.error('This user is already an admin');
        return;
      }

      // Parse districts
      const districts = newAdminDistricts.trim() 
        ? newAdminDistricts.split(',').map(d => d.trim()).filter(d => d)
        : null;

      const { error: insertError } = await supabase
        .from('admins')
        .insert({
          user_id: profile.id,
          role: newAdminRole,
          department_id: newAdminRole === 'department_admin' && newAdminDepartment ? newAdminDepartment : null,
          assigned_districts: districts,
        });

      if (insertError) throw insertError;

      toast.success('Admin added successfully!');
      setIsAddDialogOpen(false);
      setNewAdminEmail('');
      setNewAdminRole('department_admin');
      setNewAdminDepartment('');
      setNewAdminDistricts('');
      fetchAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setSubmitting(false);
    }
  };

  const updateAdminRole = async (adminId: string, newRole: 'super_admin' | 'department_admin') => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ role: newRole })
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Admin role updated!');
      fetchAdmins();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const updateAdminDepartment = async (adminId: string, departmentId: string) => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ department_id: departmentId || null })
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Department updated!');
      fetchAdmins();
    } catch (error) {
      toast.error('Failed to update department');
    }
  };

  const removeAdmin = async (adminId: string, userId: string) => {
    // Prevent removing self
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) {
      toast.error('You cannot remove yourself as admin');
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Admin removed successfully!');
      fetchAdmins();
    } catch (error) {
      toast.error('Failed to remove admin');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                <p className="text-muted-foreground">
                  Only Super Admins can manage other administrators.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Manage Admins</h1>
                <p className="text-muted-foreground mt-1">
                  Add, remove, and assign departments to administrators
                </p>
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Admin</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">User Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The user must already have an account
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newAdminRole} onValueChange={(v: any) => setNewAdminRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" />
                              Super Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="department_admin">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Department Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newAdminRole === 'department_admin' && (
                      <>
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Select value={newAdminDepartment} onValueChange={setNewAdminDepartment}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="districts">Assigned Districts (Optional)</Label>
                          <Input
                            id="districts"
                            placeholder="District 1, District 2, ..."
                            value={newAdminDistricts}
                            onChange={(e) => setNewAdminDistricts(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Comma-separated list. Leave empty for all districts.
                          </p>
                        </div>
                      </>
                    )}

                    <Button 
                      className="w-full" 
                      onClick={addAdmin}
                      disabled={submitting}
                    >
                      {submitting ? 'Adding...' : 'Add Admin'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading admins...</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Administrators ({admins.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Districts</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => {
                        const dept = getDepartmentById(admin.department_id || '');
                        
                        return (
                          <TableRow key={admin.id}>
                            <TableCell className="font-medium">
                              {admin.profile?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {admin.profile?.email || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={admin.role} 
                                onValueChange={(v: any) => updateAdminRole(admin.id, v)}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="super_admin">
                                    <Badge className="bg-primary/10 text-primary">
                                      <ShieldCheck className="h-3 w-3 mr-1" />
                                      Super Admin
                                    </Badge>
                                  </SelectItem>
                                  <SelectItem value="department_admin">
                                    <Badge variant="outline">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      Dept Admin
                                    </Badge>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {admin.role === 'department_admin' ? (
                                <Select 
                                  value={admin.department_id || ''} 
                                  onValueChange={(v) => updateAdminDepartment(admin.id, v)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Assign department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  All Departments
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {admin.assigned_districts?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {admin.assigned_districts.slice(0, 2).map((d, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {d}
                                    </Badge>
                                  ))}
                                  {admin.assigned_districts.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{admin.assigned_districts.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">All</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeAdmin(admin.id, admin.user_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Departments Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Departments & SLA Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>SLA (Hours)</TableHead>
                      <TableHead>Assigned Admins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => {
                      const deptAdmins = admins.filter(a => 
                        a.department_id === dept.id || a.role === 'super_admin'
                      );
                      
                      return (
                        <TableRow key={dept.id}>
                          <TableCell>
                            <DepartmentBadge department={dept} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {dept.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {dept.sla_hours}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {deptAdmins.length} admin{deptAdmins.length !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
