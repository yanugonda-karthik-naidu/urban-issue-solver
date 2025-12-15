import { Badge } from '@/components/ui/badge';
import { 
  Construction, Trash2, Zap, Droplet, AlertCircle, Building2, HelpCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentBadgeProps {
  department: {
    name: string;
    code: string;
    color?: string | null;
  } | null;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  roads: Construction,
  sanitation: Trash2,
  electricity: Zap,
  water: Droplet,
  traffic: AlertCircle,
  municipality: Building2,
  other: HelpCircle,
};

const colorMap: Record<string, string> = {
  orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  green: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
  blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  red: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
  gray: 'bg-muted text-muted-foreground border-border',
};

export function DepartmentBadge({ department, className }: DepartmentBadgeProps) {
  if (!department) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        <HelpCircle className="h-3 w-3 mr-1" />
        Unassigned
      </Badge>
    );
  }

  const Icon = iconMap[department.code] || HelpCircle;
  const colorClass = colorMap[department.color || 'gray'] || colorMap.gray;

  return (
    <Badge 
      variant="outline" 
      className={cn(colorClass, className)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {department.name}
    </Badge>
  );
}
