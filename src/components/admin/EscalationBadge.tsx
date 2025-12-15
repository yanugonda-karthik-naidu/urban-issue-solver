import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EscalationBadgeProps {
  escalated: boolean;
  escalationLevel: number;
  className?: string;
}

const levelLabels: Record<number, string> = {
  0: 'Normal',
  1: 'Level 1',
  2: 'Level 2',
  3: 'Critical',
};

export function EscalationBadge({ escalated, escalationLevel, className }: EscalationBadgeProps) {
  if (!escalated || escalationLevel === 0) {
    return null;
  }

  const getColorClass = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-warning/10 text-warning border-warning/20';
      case 2:
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 3:
        return 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getColorClass(escalationLevel), className)}
    >
      {escalationLevel >= 3 ? (
        <AlertTriangle className="h-3 w-3 mr-1" />
      ) : (
        <ArrowUp className="h-3 w-3 mr-1" />
      )}
      Escalated: {levelLabels[escalationLevel] || `Level ${escalationLevel}`}
    </Badge>
  );
}
