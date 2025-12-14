import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  status: 'pending' | 'in_progress' | 'resolved';
  label: string;
  description: string;
  timestamp?: string;
  remarks?: string;
}

interface StatusTimelineProps {
  currentStatus: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt?: string;
  adminRemarks?: string | null;
}

const statusOrder = ['pending', 'in_progress', 'resolved'] as const;

export function StatusTimeline({ currentStatus, createdAt, updatedAt, adminRemarks }: StatusTimelineProps) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  const steps: TimelineStep[] = [
    {
      status: 'pending',
      label: 'Reported',
      description: 'Issue submitted for review',
      timestamp: createdAt,
    },
    {
      status: 'in_progress',
      label: 'In Progress',
      description: 'Team is working on it',
      timestamp: currentStatus !== 'pending' ? updatedAt : undefined,
    },
    {
      status: 'resolved',
      label: 'Resolved',
      description: 'Issue has been fixed',
      timestamp: currentStatus === 'resolved' ? updatedAt : undefined,
      remarks: currentStatus === 'resolved' ? adminRemarks || undefined : undefined,
    },
  ];

  const getStepIcon = (step: TimelineStep, index: number) => {
    const isCompleted = index <= currentIndex;
    const isCurrent = index === currentIndex;
    
    if (step.status === 'pending') {
      return (
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
          isCompleted 
            ? "bg-warning/20 border-warning text-warning" 
            : "bg-muted border-muted-foreground/30 text-muted-foreground"
        )}>
          <FileText className="h-5 w-5" />
        </div>
      );
    }
    
    if (step.status === 'in_progress') {
      return (
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
          isCompleted 
            ? "bg-primary/20 border-primary text-primary" 
            : "bg-muted border-muted-foreground/30 text-muted-foreground",
          isCurrent && "animate-pulse"
        )}>
          <AlertCircle className="h-5 w-5" />
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
        isCompleted 
          ? "bg-success/20 border-success text-success" 
          : "bg-muted border-muted-foreground/30 text-muted-foreground"
      )}>
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-gradient-to-b from-warning via-primary to-success/30" />
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.status} className="relative flex gap-4">
              {/* Icon */}
              <div className="relative z-10">
                {getStepIcon(step, index)}
              </div>
              
              {/* Content */}
              <div className={cn(
                "flex-1 pb-6",
                !isCompleted && "opacity-50"
              )}>
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-semibold",
                    isCurrent && "text-primary"
                  )}>
                    {step.label}
                  </h4>
                  {isCurrent && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
                {step.timestamp && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    {new Date(step.timestamp).toLocaleString()}
                  </div>
                )}
                {step.remarks && (
                  <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                    <p className="text-xs font-medium text-success mb-1">Admin Remarks</p>
                    <p className="text-sm">{step.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
