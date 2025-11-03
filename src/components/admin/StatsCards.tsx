import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, AlertCircle, CheckCircle2, Users } from 'lucide-react';

interface StatsCardsProps {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  totalUsers?: number;
}

export default function StatsCards({ total, pending, inProgress, resolved, totalUsers }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Total Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{total}</div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-warning/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-warning">{pending}</div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{inProgress}</div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-success/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Resolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">{resolved}</div>
        </CardContent>
      </Card>

      {totalUsers !== undefined && (
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
