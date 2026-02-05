import { Shield, ShieldCheck, ShieldQuestion, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { VerificationLevel } from '@/hooks/useUserVerification';

interface VerificationBadgeProps {
  level: VerificationLevel;
  trustScore?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerificationBadge({ 
  level, 
  trustScore, 
  showScore = false,
  size = 'md',
  className 
}: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1'
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const config = {
    verified: {
      icon: ShieldCheck,
      label: 'Verified Citizen',
      description: 'Identity verified through government-approved methods',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    },
    unverified: {
      icon: Shield,
      label: 'Unverified',
      description: 'Identity not yet verified. Reports have standard priority.',
      className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
    },
    anonymous: {
      icon: User,
      label: 'Anonymous',
      description: 'Anonymous report with reduced priority',
      className: 'bg-muted text-muted-foreground border-border'
    }
  };

  const { icon: Icon, label, description, className: badgeClassName } = config[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(sizeClasses[size], badgeClassName, 'gap-1 font-medium', className)}
          >
            <Icon size={iconSize[size]} />
            <span>{label}</span>
            {showScore && trustScore !== undefined && (
              <span className="ml-1 opacity-70">({trustScore})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">{description}</p>
          {trustScore !== undefined && (
            <p className="text-xs mt-1">Trust Score: {trustScore}/100</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface TrustScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TrustScoreBadge({ score, size = 'md', className }: TrustScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1'
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (s >= 60) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
    if (s >= 40) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'High Trust';
    if (s >= 60) return 'Good Trust';
    if (s >= 40) return 'Low Trust';
    return 'Very Low Trust';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(sizeClasses[size], getScoreColor(score), 'font-medium', className)}
          >
            {score}/100
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{getScoreLabel(score)}</p>
          <p className="text-xs text-muted-foreground">
            Based on verification status and report history
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
