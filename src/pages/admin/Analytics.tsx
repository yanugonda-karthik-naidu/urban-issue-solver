import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, MapPin } from 'lucide-react';

interface CategoryData {
  name: string;
  count: number;
}

interface DailyData {
  date: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [areaData, setAreaData] = useState<CategoryData[]>([]);

  useEffect(() => {
    // AdminRoute handles auth check, just fetch data
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: issues, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Category data
      const categories = issues?.reduce((acc: any, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {});

      setCategoryData(
        Object.keys(categories || {}).map(key => ({
          name: key,
          count: categories[key],
        }))
      );

      // Status data
      const pending = issues?.filter(i => i.status === 'pending').length || 0;
      const inProgress = issues?.filter(i => i.status === 'in_progress').length || 0;
      const resolved = issues?.filter(i => i.status === 'resolved').length || 0;

      setStatusData([
        { name: 'Pending', value: pending },
        { name: 'In Progress', value: inProgress },
        { name: 'Resolved', value: resolved },
      ]);

      // Daily submission data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyCounts = last7Days.map(date => {
        const count = issues?.filter(i => 
          i.created_at.startsWith(date)
        ).length || 0;
        return { date, count };
      });

      setDailyData(dailyCounts);

      // Area data (top 5 areas)
      const areas = issues?.reduce((acc: any, issue) => {
        if (issue.area) {
          acc[issue.area] = (acc[issue.area] || 0) + 1;
        }
        return acc;
      }, {});

      const areaArray = Object.keys(areas || {})
        .map(key => ({ name: key, count: areas[key] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAreaData(areaArray);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time updates for analytics
  useEffect(() => {
    const channel = supabase
      .channel('admin-analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        (payload) => {
          console.log('Analytics update:', payload);
          // Refetch analytics when data changes
          fetchAnalyticsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Analytics & Reports</h1>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Issues by Category */}
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

                {/* Status Distribution */}
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
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

                {/* Daily Submissions (Last 7 Days) */}
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Daily Issue Submissions</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top 5 Areas by Issues */}
                <Card className="shadow-soft">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Top 5 Areas by Issue Count
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={areaData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Stats */}
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Summary Insights</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Most Reported Category</p>
                      <p className="text-2xl font-bold">
                        {categoryData.length > 0 ? categoryData.reduce((max, cat) => cat.count > max.count ? cat : max).name : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Resolution Rate</p>
                      <p className="text-2xl font-bold">
                        {statusData.reduce((sum, s) => sum + s.value, 0) > 0
                          ? `${((statusData.find(s => s.name === 'Resolved')?.value || 0) / statusData.reduce((sum, s) => sum + s.value, 0) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Most Active Area</p>
                      <p className="text-2xl font-bold">
                        {areaData.length > 0 ? areaData[0].name : 'N/A'}
                      </p>
                    </div>
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
