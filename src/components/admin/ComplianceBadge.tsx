import { AlertTriangle, Clock, Scale, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInHours, differenceInDays, format, isPast } from 'date-fns';

interface ComplianceBadgeProps {
  deadline: string | null;
  resolvedAt: string | null;
  status: string;
  size?: 'sm' | 'md';
}

export function ComplianceBadge({ deadline, resolvedAt, status, size = 'md' }: ComplianceBadgeProps) {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isResolved = status === 'resolved' && resolvedAt;
  
  let complianceStatus: 'on_track' | 'at_risk' | 'breached' | 'met';
  let label: string;
  let description: string;

  if (isResolved) {
    const resolvedDate = new Date(resolvedAt);
    if (resolvedDate <= deadlineDate) {
      complianceStatus = 'met';
      label = 'Compliant';
      description = `Resolved within legal deadline on ${format(resolvedDate, 'PPP')}`;
    } else {
      complianceStatus = 'breached';
      const daysLate = differenceInDays(resolvedDate, deadlineDate);
      label = `${daysLate}d Late`;
      description = `Resolved ${daysLate} days after legal deadline`;
    }
  } else if (isPast(deadlineDate)) {
    const daysOverdue = differenceInDays(now, deadlineDate);
    complianceStatus = 'breached';
    label = `${daysOverdue}d Overdue`;
    description = `Legal deadline breached ${daysOverdue} days ago`;
  } else {
    const hoursRemaining = differenceInHours(deadlineDate, now);
    if (hoursRemaining <= 24) {
      complianceStatus = 'at_risk';
      label = `${hoursRemaining}h Left`;
      description = `Only ${hoursRemaining} hours until legal deadline`;
    } else {
      const daysRemaining = differenceInDays(deadlineDate, now);
      complianceStatus = 'on_track';
      label = `${daysRemaining}d Left`;
      description = `${daysRemaining} days until legal deadline`;
    }
  }

  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';
  const iconSize = size === 'sm' ? 10 : 12;

  const config = {
    met: {
      icon: CheckCircle,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
    },
    on_track: {
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
    },
    at_risk: {
      icon: AlertTriangle,
      className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
    },
    breached: {
      icon: Scale,
      className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300'
    }
  };

  const { icon: Icon, className } = config[complianceStatus];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${sizeClasses} ${className} gap-1 font-medium`}>
            <Icon size={iconSize} />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Legal Compliance</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-xs mt-1">Deadline: {format(deadlineDate, 'PPP')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
