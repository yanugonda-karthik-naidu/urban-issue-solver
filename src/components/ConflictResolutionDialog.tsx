import { useState } from 'react';
import { AlertTriangle, Clock, Server, Smartphone, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { triggerHaptic } from '@/lib/haptics';
import { formatDistanceToNow } from 'date-fns';

export interface ConflictData<T = unknown> {
  id: string;
  field: string;
  localValue: T;
  serverValue: T;
  localTimestamp: number;
  serverTimestamp: number;
  entityType: string;
  entityName?: string;
}

interface ConflictResolutionDialogProps {
  conflicts: ConflictData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (resolutions: Map<string, 'local' | 'server'>) => void;
}

export const ConflictResolutionDialog = ({
  conflicts,
  open,
  onOpenChange,
  onResolve,
}: ConflictResolutionDialogProps) => {
  const [resolutions, setResolutions] = useState<Map<string, 'local' | 'server'>>(new Map());

  const handleSelectResolution = (conflictId: string, choice: 'local' | 'server') => {
    triggerHaptic('light');
    setResolutions((prev) => new Map(prev).set(conflictId, choice));
  };

  const handleResolveAll = (choice: 'local' | 'server') => {
    triggerHaptic('medium');
    const allResolutions = new Map<string, 'local' | 'server'>();
    conflicts.forEach((c) => allResolutions.set(c.id, choice));
    setResolutions(allResolutions);
  };

  const handleConfirm = () => {
    triggerHaptic('success');
    onResolve(resolutions);
    onOpenChange(false);
  };

  const allResolved = conflicts.every((c) => resolutions.has(c.id));
  const resolvedCount = resolutions.size;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found between your local
            changes and server data. Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center py-2">
          <Badge variant="outline">{resolvedCount}/{conflicts.length} resolved</Badge>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveAll('local')}
              className="gap-1"
            >
              <Smartphone className="h-3 w-3" />
              Keep All Local
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveAll('server')}
              className="gap-1"
            >
              <Server className="h-3 w-3" />
              Keep All Server
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {conflicts.map((conflict) => {
              const selected = resolutions.get(conflict.id);

              return (
                <div
                  key={conflict.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">
                        {conflict.entityName || conflict.entityType}
                      </span>
                      <span className="text-muted-foreground text-sm ml-2">
                        → {conflict.field}
                      </span>
                    </div>
                    <Badge
                      variant={selected ? 'default' : 'outline'}
                      className={selected ? 'bg-green-500' : ''}
                    >
                      {selected ? `Using ${selected}` : 'Unresolved'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 divide-x">
                    {/* Local version */}
                    <button
                      onClick={() => handleSelectResolution(conflict.id, 'local')}
                      className={`p-4 text-left hover:bg-muted/30 transition-colors ${
                        selected === 'local' ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Local</span>
                        {selected === 'local' && (
                          <Badge variant="default" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-20 mb-2">
                        {formatValue(conflict.localValue)}
                      </pre>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(conflict.localTimestamp, { addSuffix: true })}
                      </div>
                    </button>

                    {/* Server version */}
                    <button
                      onClick={() => handleSelectResolution(conflict.id, 'server')}
                      className={`p-4 text-left hover:bg-muted/30 transition-colors ${
                        selected === 'server' ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">Server</span>
                        {selected === 'server' && (
                          <Badge variant="default" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-20 mb-2">
                        {formatValue(conflict.serverValue)}
                      </pre>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(conflict.serverTimestamp, { addSuffix: true })}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allResolved} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Apply {resolvedCount} Resolution{resolvedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook for managing conflicts
export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addConflict = (conflict: ConflictData) => {
    setConflicts((prev) => {
      // Replace if same id exists
      const existing = prev.findIndex((c) => c.id === conflict.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = conflict;
        return updated;
      }
      return [...prev, conflict];
    });
    setIsOpen(true);
  };

  const addConflicts = (newConflicts: ConflictData[]) => {
    setConflicts((prev) => {
      const merged = [...prev];
      newConflicts.forEach((conflict) => {
        const existing = merged.findIndex((c) => c.id === conflict.id);
        if (existing >= 0) {
          merged[existing] = conflict;
        } else {
          merged.push(conflict);
        }
      });
      return merged;
    });
    if (newConflicts.length > 0) {
      setIsOpen(true);
    }
  };

  const clearConflicts = () => {
    setConflicts([]);
    setIsOpen(false);
  };

  return {
    conflicts,
    isOpen,
    setIsOpen,
    addConflict,
    addConflicts,
    clearConflicts,
  };
}
