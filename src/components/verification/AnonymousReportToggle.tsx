import { User, AlertTriangle, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AnonymousReportToggleProps {
  isAnonymous: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export function AnonymousReportToggle({ isAnonymous, onToggle, disabled }: AnonymousReportToggleProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="anonymous-toggle" className="font-medium cursor-pointer">
            Submit Anonymously
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>Anonymous reports protect your identity but have reduced priority in the system.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="anonymous-toggle"
          checked={isAnonymous}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>

      {isAnonymous && (
        <Alert variant="default" className="bg-muted/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Anonymous Report Mode:</strong>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li>Your personal details will not be stored</li>
              <li>Report will have reduced default priority</li>
              <li>Cannot trigger automatic emergency escalation</li>
              <li>Requires admin review before worker assignment</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
