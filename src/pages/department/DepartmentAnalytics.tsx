import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { TrendingUp, MapPin, Clock } from 'lucide-react';

interface Issue {
  id: string;
  area: string | null;
  district: string | null;
  status: string;
  created_at: string;
  sla_deadline: string | null;
  resolved_at: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DepartmentAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [avgResolutionTime, setAvgResolutionTime] = useState<number>(0);
  const [slaCompliance, setSlaCompliance] = useState<number>(0);

  const { departments, getDepartmentById } = useDepartments();
  const { adminInfo, isSuperAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (!adminLoading && adminInfo) {
      if (isSuperAdmin) {
        navigate('/admin/analytics');
        return;
      }
      
      if (adminInfo.department_id) {
        const dept = getDepartmentById(adminInfo.department_id);
        setDepartment(dept || null);
        fetchAnalytics(adminInfo.department_id);
      }
    }
  }, [adminInfo, adminLoading, departments]);

  const fetchAnalytics = async (deptId: string) => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('department_id', deptId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const issuesData = (data as Issue[]) || [];
      setIssues(issuesData);

      // Status distribution
      const pending = issuesData.filter(i => i.status === 'pending').length;
      const inProgress = issuesData.filter(i => i.status === 'in_progress').length;
      const resolved = issuesData.filter(i => i.status === 'resolved').length;

      setStatusData([
        { name: 'Pending', value: pending },
        { name: 'In Progress', value: inProgress },
        { name: 'Resolved', value: resolved },
      ]);

      // Area distribution (top 5)
      const areas = issuesData.reduce((acc: any, issue) => {
        const area = issue.area || issue.district || 'Unknown';
        acc[area] = (acc[area] || 0) + 1;
        return acc;
      }, {});

      const areaArray = Object.keys(areas)
        .map(key => ({ name: key, count: areas[key] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setAreaData(areaArray);

      // Daily data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyCounts = last7Days.map(date => ({
        date: date.slice(5), // MM-DD format
        count: issuesData.filter(i => i.created_at.startsWith(date)).length,
      }));
      setDailyData(dailyCounts);

      // Calculate average resolution time
      const resolvedIssues = issuesData.filter(i => i.resolved_at && i.status === 'resolved');
      if (resolvedIssues.length > 0) {
        const totalHours = resolvedIssues.reduce((sum, issue) => {
          const created = new Date(issue.created_at);
          const resolved = new Date(issue.resolved_at!);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        setAvgResolutionTime(Math.round(totalHours / resolvedIssues.length));
      }

      // Calculate SLA compliance
      const completedWithSla = issuesData.filter(i => i.sla_deadline && i.status === 'resolved');
      if (completedWithSla.length > 0) {
        const onTime = completedWithSla.filter(i => 
          new Date(i.resolved_at!) <= new Date(i.sla_deadline!)
        ).length;
        setSlaCompliance(Math.round((onTime / completedWithSla.length) * 100));
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading || adminLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
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
            <div>
              <h1 className="text-3xl font-bold">{department?.name} Analytics</h1>
              <p className="text-muted-foreground">Performance metrics for your department</p>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Total Issues</p>
                  </div>
                  <p className="text-3xl font-bold">{issues.length}</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                  </div>
                  <p className="text-3xl font-bold">{avgResolutionTime}h</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Resolution Rate</p>
                  <p className="text-3xl font-bold">
                    {issues.length > 0 
                      ? `${Math.round((statusData.find(s => s.name === 'Resolved')?.value || 0) / issues.length * 100)}%`
                      : '0%'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">SLA Compliance</p>
                  <p className={`text-3xl font-bold ${slaCompliance >= 80 ? 'text-success' : slaCompliance >= 50 ? 'text-warning' : 'text-destructive'}`}>
                    {slaCompliance}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Distribution */}
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Daily Trend */}
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Daily Issues (7 days)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Areas */}
              <Card className="shadow-soft md:col-span-2">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Top Areas by Issue Count
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={areaData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Issues" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
