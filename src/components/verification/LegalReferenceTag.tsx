import { Scale, FileText, Clock, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useIssueLegalMappings, type LegalRule } from '@/hooks/useLegalRules';
import { Skeleton } from '@/components/ui/skeleton';

interface LegalReferenceTagProps {
  issueId: string;
  compact?: boolean;
}

export function LegalReferenceTag({ issueId, compact = false }: LegalReferenceTagProps) {
  const { mappings, loading } = useIssueLegalMappings(issueId);

  if (loading) {
    return compact ? (
      <Skeleton className="h-6 w-48" />
    ) : (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardContent>
      </Card>
    );
  }

  if (mappings.length === 0) {
    return null;
  }

  if (compact) {
    const primaryRule = mappings[0]?.legal_rule;
    if (!primaryRule) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Scale size={12} className="text-primary" />
        <span className="font-medium">{primaryRule.act_name}</span>
        {primaryRule.section_clause && (
          <span>– {primaryRule.section_clause}</span>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Scale size={16} className="text-primary" />
          Legal Reference
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mappings.map((mapping) => {
          const rule = mapping.legal_rule;
          if (!rule) return null;

          return (
            <div key={mapping.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <FileText size={14} className="mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{rule.act_name}</p>
                  {rule.section_clause && (
                    <p className="text-xs text-muted-foreground">{rule.section_clause}</p>
                  )}
                </div>
                {mapping.auto_mapped && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    Auto-mapped
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 size={12} />
                  <span>{rule.responsible_authority}</span>
                </div>
                {rule.sla_days && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={12} />
                    <span>Legal SLA: {rule.sla_days} days</span>
                  </div>
                )}
              </div>

              {rule.description && (
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {rule.description}
                </p>
              )}

              {mappings.indexOf(mapping) < mappings.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface LegalRuleCardProps {
  rule: LegalRule;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LegalRuleCard({ rule, showActions, onEdit, onDelete }: LegalRuleCardProps) {
  return (
    <Card className="border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="mb-2 capitalize">
              {rule.category}
            </Badge>
            <h4 className="font-medium">{rule.act_name}</h4>
            {rule.section_clause && (
              <p className="text-sm text-muted-foreground">{rule.section_clause}</p>
            )}
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <button onClick={onEdit} className="text-xs text-primary hover:underline">
                  Edit
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} className="text-xs text-destructive hover:underline">
                  Deactivate
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Authority: </span>
            <span>{rule.responsible_authority}</span>
          </div>
          {rule.sla_days && (
            <div>
              <span className="text-muted-foreground">Legal SLA: </span>
              <span>{rule.sla_days} days</span>
            </div>
          )}
        </div>

        {rule.description && (
          <p className="text-sm text-muted-foreground">{rule.description}</p>
        )}

        <div className="flex gap-2 text-xs text-muted-foreground">
          {rule.state && <Badge variant="secondary">{rule.state}</Badge>}
          {rule.city && <Badge variant="secondary">{rule.city}</Badge>}
          <Badge variant={rule.is_active ? "default" : "destructive"}>
            {rule.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
