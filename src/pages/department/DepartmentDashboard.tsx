import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import IssuesMap from '@/components/admin/IssuesMap';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AlertCircle, CheckCircle2, Clock, Users, FileText, TrendingUp, Building2, MapPin } from 'lucide-react';

interface DepartmentStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  overdue: number;
}

export default function DepartmentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DepartmentStats>({ total: 0, pending: 0, inProgress: 0, resolved: 0, overdue: 0 });
  const [department, setDepartment] = useState<Department | null>(null);
  const [workersCount, setWorkersCount] = useState(0);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  
  const { departments, getDepartmentById } = useDepartments();
  const { adminInfo, isSuperAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (!adminLoading && adminInfo) {
      if (isSuperAdmin) {
        navigate('/admin');
        return;
      }
      
      if (adminInfo.department_id) {
        const dept = getDepartmentById(adminInfo.department_id);
        setDepartment(dept || null);
        fetchDepartmentData(adminInfo.department_id);
      }
    }
  }, [adminInfo, adminLoading, departments]);

  const fetchDepartmentData = async (deptId: string) => {
    try {
      // Fetch issues for this department with worker data
      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select('*, workers(id, name)')
        .eq('department_id', deptId)
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;

      const now = new Date();
      const statsData: DepartmentStats = {
        total: issues?.length || 0,
        pending: issues?.filter(i => i.status === 'pending').length || 0,
        inProgress: issues?.filter(i => i.status === 'in_progress').length || 0,
        resolved: issues?.filter(i => i.status === 'resolved').length || 0,
        overdue: issues?.filter(i => 
          i.sla_deadline && 
          i.status !== 'resolved' && 
          new Date(i.sla_deadline) < now
        ).length || 0,
      };
      setStats(statsData);
      setAllIssues(issues || []);
      setRecentIssues(issues?.slice(0, 5) || []);

      // Fetch workers count
      const { count: workers } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', deptId);

      setWorkersCount(workers || 0);
    } catch (error) {
      console.error('Error fetching department data:', error);
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminInfo?.department_id) return;

    const channel = supabase
      .channel('dept-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `department_id=eq.${adminInfo.department_id}` },
        () => fetchDepartmentData(adminInfo.department_id!)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminInfo?.department_id]);

  if (loading || adminLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading department dashboard...</p>
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
            {/* Department Header */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${department?.color}20` }}>
                <Building2 className="h-8 w-8" style={{ color: department?.color || 'hsl(var(--primary))' }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{department?.name || 'Department'} Control Center</h1>
                <p className="text-muted-foreground">{department?.description}</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{stats.pending}</div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <AlertCircle className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.inProgress}</div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{stats.resolved}</div>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-destructive/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
                </CardContent>
              </Card>
            </div>

            {/* Workers and SLA Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Workers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{workersCount}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assigned workers in your department
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>SLA Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{department?.sla_hours || 48} hours</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Resolution deadline for new issues
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Issues Map */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Issues Location Map
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <IssuesMap issues={allIssues} height="400px" />
              </CardContent>
            </Card>

            {/* Recent Issues */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Recent Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {recentIssues.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No issues yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentIssues.map((issue) => (
                      <div key={issue.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          <p className="text-sm text-muted-foreground">{issue.area || issue.district}</p>
                        </div>
                        <Badge variant={
                          issue.status === 'pending' ? 'outline' :
                          issue.status === 'in_progress' ? 'secondary' : 'default'
                        }>
                          {issue.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
