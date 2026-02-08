import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCards from '@/components/admin/StatsCards';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/admin/SeverityBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Brain, AlertOctagon } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  totalUsers: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unscored: number;
}

interface CategoryData {
  name: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const SEVERITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#94a3b8'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    totalUsers: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unscored: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);

  useEffect(() => {
    // AdminRoute handles auth check, just fetch data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all issues
      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;

      // Calculate stats
      const total = issues?.length || 0;
      const pending = issues?.filter(i => i.status === 'pending').length || 0;
      const inProgress = issues?.filter(i => i.status === 'in_progress').length || 0;
      const resolved = issues?.filter(i => i.status === 'resolved').length || 0;

      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Severity counts
      const critical = issues?.filter(i => i.ai_severity_level === 'critical').length || 0;
      const high = issues?.filter(i => i.ai_severity_level === 'high').length || 0;
      const medium = issues?.filter(i => i.ai_severity_level === 'medium').length || 0;
      const low = issues?.filter(i => i.ai_severity_level === 'low').length || 0;
      const unscored = issues?.filter(i => !i.ai_severity_level).length || 0;

      setStats({
        total,
        pending,
        inProgress,
        resolved,
        totalUsers: userCount || 0,
        critical,
        high,
        medium,
        low,
        unscored,
      });

      // Calculate category data for charts
      const categories = issues?.reduce((acc: any, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {});

      const categoryChartData = Object.keys(categories || {}).map(key => ({
        name: key,
        count: categories[key],
      }));

      setCategoryData(categoryChartData);

      // Get recent issues (last 5)
      setRecentIssues(issues?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time subscription for automatic updates
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Fetch fresh data whenever any change occurs
          fetchDashboardData();

          // If this is a new INSERT (user created a report), notify admins
          try {
            const p: any = payload as any;
            const evt = p.eventType || p.type || p.event;
            const isInsert = evt === 'INSERT' || evt === 'insert' || (!!p.new && !p.old);
            if (isInsert) {
              const title = p.new?.title || p.record?.title || 'New report';
              // Show a simple toast; navigation action can be done from the Admin UI
              toast.info(`New report submitted: "${title}"`);
            }
          } catch (e) {
            console.error('Error handling realtime payload:', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-success';
      case 'in_progress':
        return 'text-primary';
      default:
        return 'text-warning';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <StatsCards
                total={stats.total}
                pending={stats.pending}
                inProgress={stats.inProgress}
                resolved={stats.resolved}
                totalUsers={stats.totalUsers}
              />

              {/* AI Severity Overview */}
              {(stats.critical > 0 || stats.high > 0) && (
                <Card className="shadow-soft border-destructive/20">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5 text-destructive" />
                      AI Severity Alerts
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {stats.critical > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <span className="text-2xl font-bold text-destructive">{stats.critical}</span>
                          <span className="text-sm text-destructive">Critical Issues</span>
                        </div>
                      )}
                      {stats.high > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.high}</span>
                          <span className="text-sm text-orange-600 dark:text-orange-400">High Severity</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <span className="text-2xl font-bold text-warning">{stats.medium}</span>
                        <span className="text-sm text-warning">Medium</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                        <span className="text-2xl font-bold text-success">{stats.low}</span>
                        <span className="text-sm text-success">Low</span>
                      </div>
                      {stats.unscored > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                          <span className="text-2xl font-bold text-muted-foreground">{stats.unscored}</span>
                          <span className="text-sm text-muted-foreground">Unscored</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Charts Section */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Bar Chart - Issues by Category */}
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Issues by Category
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Pie Chart - Severity Distribution */}
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Severity Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: stats.critical },
                            { name: 'High', value: stats.high },
                            { name: 'Medium', value: stats.medium },
                            { name: 'Low', value: stats.low },
                            { name: 'Unscored', value: stats.unscored },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1, 2, 3, 4].map((index) => (
                            <Cell key={`cell-severity-${index}`} fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution Chart */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Pending', value: stats.pending },
                            { name: 'In Progress', value: stats.inProgress },
                            { name: 'Resolved', value: stats.resolved },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1, 2].map((index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Issues Table */}
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Recent Issues</h3>
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/issues')}>
                      View All Issues
                    </Button>
                  </div>
                  
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left text-sm font-medium">Title</th>
                          <th className="p-3 text-left text-sm font-medium">Category</th>
                          <th className="p-3 text-left text-sm font-medium">Severity</th>
                          <th className="p-3 text-left text-sm font-medium">Location</th>
                          <th className="p-3 text-left text-sm font-medium">Status</th>
                          <th className="p-3 text-left text-sm font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentIssues.map((issue) => (
                          <tr key={issue.id} className={`border-b hover:bg-muted/30 transition-colors ${
                            issue.ai_severity_level === 'critical' ? 'bg-destructive/5' : ''
                          }`}>
                            <td className="p-3 text-sm font-medium">{issue.title}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline">{issue.category}</Badge>
                            </td>
                            <td className="p-3 text-sm">
                              <SeverityBadge 
                                score={issue.ai_severity_score} 
                                level={issue.ai_severity_level}
                                reasoning={issue.ai_severity_reasoning}
                                compact
                              />
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {issue.area || 'N/A'}
                            </td>
                            <td className="p-3 text-sm">
                              <span className={getStatusColor(issue.status)}>
                                {issue.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {new Date(issue.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
