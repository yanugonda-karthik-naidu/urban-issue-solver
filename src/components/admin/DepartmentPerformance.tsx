import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Department } from '@/hooks/useDepartments';

interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  departmentColor: string;
  totalIssues: number;
  resolvedIssues: number;
  pendingIssues: number;
  inProgressIssues: number;
  overdueIssues: number;
  avgResolutionHours: number;
  slaComplianceRate: number;
}

interface DepartmentPerformanceProps {
  stats: DepartmentStats[];
  departments: Department[];
}

const colorHexMap: Record<string, string> = {
  orange: '#f97316',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  red: '#ef4444',
  purple: '#a855f7',
  gray: '#6b7280',
};

export function DepartmentPerformance({ stats, departments }: DepartmentPerformanceProps) {
  const chartData = stats.map(s => ({
    name: s.departmentName.split(' ')[0], // Shorten for chart
    total: s.totalIssues,
    resolved: s.resolvedIssues,
    pending: s.pendingIssues,
    overdue: s.overdueIssues,
    color: colorHexMap[s.departmentColor] || colorHexMap.gray,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Department Issue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Bar dataKey="total" name="Total Issues" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((dept) => {
          const resolutionRate = dept.totalIssues > 0 
            ? Math.round((dept.resolvedIssues / dept.totalIssues) * 100) 
            : 0;

          return (
            <Card key={dept.departmentId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{dept.departmentName}</CardTitle>
                  {dept.overdueIssues > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {dept.overdueIssues} overdue
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{dept.totalIssues}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-2 rounded-lg bg-warning/10">
                    <p className="text-2xl font-bold text-warning">{dept.pendingIssues}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-2 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{dept.resolvedIssues}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolution Rate</span>
                    <span className="font-medium">{resolutionRate}%</span>
                  </div>
                  <Progress value={resolutionRate} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Avg. Resolution
                  </span>
                  <span className="font-medium">
                    {dept.avgResolutionHours > 0 
                      ? `${Math.round(dept.avgResolutionHours)}h` 
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle className="h-3 w-3" />
                    SLA Compliance
                  </span>
                  <Badge 
                    variant="outline" 
                    className={
                      dept.slaComplianceRate >= 80 
                        ? 'bg-success/10 text-success border-success/20'
                        : dept.slaComplianceRate >= 50
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }
                  >
                    {Math.round(dept.slaComplianceRate)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
