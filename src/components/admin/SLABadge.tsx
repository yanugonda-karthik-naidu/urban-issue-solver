import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLABadgeProps {
  slaDeadline: string | null;
  status: string;
  resolvedAt?: string | null;
  className?: string;
}

export function SLABadge({ slaDeadline, status, resolvedAt, className }: SLABadgeProps) {
  if (!slaDeadline) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        <Clock className="h-3 w-3 mr-1" />
        No SLA
      </Badge>
    );
  }

  const deadline = new Date(slaDeadline);
  const now = new Date();
  
  // If resolved, check if it was resolved within SLA
  if (status === 'resolved' && resolvedAt) {
    const resolved = new Date(resolvedAt);
    const wasOnTime = resolved <= deadline;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          wasOnTime 
            ? "bg-success/10 text-success border-success/20" 
            : "bg-destructive/10 text-destructive border-destructive/20",
          className
        )}
      >
        {wasOnTime ? (
          <><CheckCircle className="h-3 w-3 mr-1" />Resolved on time</>
        ) : (
          <><AlertTriangle className="h-3 w-3 mr-1" />Resolved late</>
        )}
      </Badge>
    );
  }

  // Calculate time remaining or overdue
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Overdue
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.abs(diffDays);
    
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-destructive/10 text-destructive border-destructive/20 animate-pulse", className)}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        {overdueDays > 0 ? `${overdueDays}d overdue` : `${overdueHours}h overdue`}
      </Badge>
    );
  }

  // Check if deadline is approaching (within 25% of SLA time)
  const isUrgent = diffHours < 12;
  const isWarning = diffHours < 24;

  if (isUrgent) {
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-destructive/10 text-destructive border-destructive/20", className)}
      >
        <Clock className="h-3 w-3 mr-1" />
        {diffHours}h left
      </Badge>
    );
  }

  if (isWarning) {
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-warning/10 text-warning border-warning/20", className)}
      >
        <Clock className="h-3 w-3 mr-1" />
        {diffHours}h left
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("bg-success/10 text-success border-success/20", className)}
    >
      <Clock className="h-3 w-3 mr-1" />
      {diffDays > 0 ? `${diffDays}d left` : `${diffHours}h left`}
    </Badge>
  );
}
