import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, AlertOctagon, AlertCircle, Info, Brain } from 'lucide-react';

interface SeverityBadgeProps {
  score: number | null;
  level: string | null;
  reasoning?: string | null;
  showScore?: boolean;
  compact?: boolean;
}

export function SeverityBadge({ score, level, reasoning, showScore = false, compact = false }: SeverityBadgeProps) {
  if (!level && score === null) return null;

  const config = getSeverityConfig(level, score);
  
  const badge = (
    <Badge 
      variant="outline" 
      className={`${config.className} ${compact ? 'text-[10px] px-1.5 py-0' : ''}`}
    >
      <config.icon className={compact ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />
      {config.label}
      {showScore && score !== null && (
        <span className="ml-1 font-mono text-[10px] opacity-75">({score})</span>
      )}
    </Badge>
  );

  if (!reasoning) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Severity Analysis
            </p>
            <p className="text-xs">{reasoning}</p>
            {score !== null && (
              <p className="text-xs text-muted-foreground">Score: {score}/100</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getSeverityConfig(level: string | null, score: number | null) {
  const effectiveLevel = level || (score !== null ? classifyScore(score) : 'unknown');

  switch (effectiveLevel) {
    case 'critical':
      return {
        label: 'Critical',
        icon: AlertOctagon,
        className: 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse',
      };
    case 'high':
      return {
        label: 'High',
        icon: AlertTriangle,
        className: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400',
      };
    case 'medium':
      return {
        label: 'Medium',
        icon: AlertCircle,
        className: 'bg-warning/15 text-warning border-warning/30',
      };
    case 'low':
      return {
        label: 'Low',
        icon: Info,
        className: 'bg-success/15 text-success border-success/30',
      };
    default:
      return {
        label: 'Pending',
        icon: Brain,
        className: 'bg-muted text-muted-foreground border-muted',
      };
  }
}

function classifyScore(score: number): string {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
}
