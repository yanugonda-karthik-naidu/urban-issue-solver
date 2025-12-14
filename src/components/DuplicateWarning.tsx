import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SimilarIssue {
  id: string;
  title: string;
  category: string;
  distance?: number;
  similarity: number;
}

interface DuplicateWarningProps {
  similarIssues: SimilarIssue[];
  onDismiss: () => void;
  onViewIssue?: (id: string) => void;
  onProceedAnyway: () => void;
}

export function DuplicateWarning({ 
  similarIssues, 
  onDismiss, 
  onViewIssue,
  onProceedAnyway 
}: DuplicateWarningProps) {
  const highestSimilarity = similarIssues[0]?.similarity || 0;
  const isLikelyDuplicate = highestSimilarity >= 0.7;

  return (
    <Card className={cn(
      "border-2 animate-fade-in",
      isLikelyDuplicate 
        ? "border-destructive bg-destructive/5" 
        : "border-warning bg-warning/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isLikelyDuplicate ? "bg-destructive/20" : "bg-warning/20"
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5",
              isLikelyDuplicate ? "text-destructive" : "text-warning"
            )} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className={cn(
                "font-semibold",
                isLikelyDuplicate ? "text-destructive" : "text-warning"
              )}>
                {isLikelyDuplicate ? 'Potential Duplicate Detected!' : 'Similar Issues Found'}
              </h4>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              {isLikelyDuplicate 
                ? 'This issue appears very similar to an existing report. Please check before submitting.'
                : 'We found some similar issues that might be related to your report.'
              }
            </p>

            <div className="space-y-2">
              {similarIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className="flex items-center justify-between p-2 bg-background rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{issue.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 bg-muted rounded">{issue.category}</span>
                      <span>{Math.round(issue.similarity * 100)}% similar</span>
                      {issue.distance !== undefined && (
                        <span>• {issue.distance < 1 ? `${Math.round(issue.distance * 1000)}m` : `${issue.distance.toFixed(1)}km`} away</span>
                      )}
                    </div>
                  </div>
                  {onViewIssue && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewIssue(issue.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onProceedAnyway}
                className="flex-1"
              >
                Submit Anyway
              </Button>
              <Button 
                variant={isLikelyDuplicate ? "destructive" : "default"}
                size="sm" 
                onClick={onDismiss}
                className="flex-1"
              >
                Edit Report
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
