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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  totalUsers: number;
}

interface CategoryData {
  name: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    totalUsers: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!adminData) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchDashboardData();
    };

    checkAdminAndFetch();
  }, [navigate]);

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

      setStats({
        total,
        pending,
        inProgress,
        resolved,
        totalUsers: userCount || 0,
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
    if (!isAdmin) return;

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

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

  if (!isAdmin) {
    return null;
  }

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

                {/* Pie Chart - Status Distribution */}
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
                          <th className="p-3 text-left text-sm font-medium">Location</th>
                          <th className="p-3 text-left text-sm font-medium">Status</th>
                          <th className="p-3 text-left text-sm font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentIssues.map((issue) => (
                          <tr key={issue.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-sm font-medium">{issue.title}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline">{issue.category}</Badge>
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
