import { Shield, Scale, AlertCircle, TrendingUp, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { VerificationLevel } from '@/hooks/useUserVerification';

interface VerificationFiltersProps {
  verificationLevel: string;
  onVerificationLevelChange: (value: string) => void;
  priorityRange: string;
  onPriorityRangeChange: (value: string) => void;
  complianceStatus: string;
  onComplianceStatusChange: (value: string) => void;
  legalRule: string;
  onLegalRuleChange: (value: string) => void;
  legalRules: Array<{ id: string; act_name: string }>;
}

export function VerificationFilters({
  verificationLevel,
  onVerificationLevelChange,
  priorityRange,
  onPriorityRangeChange,
  complianceStatus,
  onComplianceStatusChange,
  legalRule,
  onLegalRuleChange,
  legalRules
}: VerificationFiltersProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Filter size={16} />
          Trust & Compliance Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Level Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Shield size={14} className="text-muted-foreground" />
            Verification Level
          </label>
          <Select value={verificationLevel} onValueChange={onVerificationLevelChange}>
            <SelectTrigger>
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="verified">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Verified</Badge>
                </div>
              </SelectItem>
              <SelectItem value="unverified">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 text-[10px]">Unverified</Badge>
                </div>
              </SelectItem>
              <SelectItem value="anonymous">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">Anonymous</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Score Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp size={14} className="text-muted-foreground" />
            Priority Score
          </label>
          <Select value={priorityRange} onValueChange={onPriorityRangeChange}>
            <SelectTrigger>
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High (80-100)</SelectItem>
              <SelectItem value="medium">Medium (50-79)</SelectItem>
              <SelectItem value="low">Low (20-49)</SelectItem>
              <SelectItem value="very-low">Very Low (0-19)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Compliance Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <AlertCircle size={14} className="text-muted-foreground" />
            Compliance Status
          </label>
          <Select value={complianceStatus} onValueChange={onComplianceStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="on_track">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  On Track
                </div>
              </SelectItem>
              <SelectItem value="at_risk">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  At Risk
                </div>
              </SelectItem>
              <SelectItem value="breached">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Breached
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legal Act Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Scale size={14} className="text-muted-foreground" />
            Legal Act
          </label>
          <Select value={legalRule} onValueChange={onLegalRuleChange}>
            <SelectTrigger>
              <SelectValue placeholder="All acts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Legal Acts</SelectItem>
              {legalRules.map(rule => (
                <SelectItem key={rule.id} value={rule.id}>
                  {rule.act_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to filter issues based on verification criteria
export function filterIssuesByVerification(
  issues: any[],
  filters: {
    verificationLevel?: string;
    priorityRange?: string;
    complianceStatus?: string;
  }
) {
  return issues.filter(issue => {
    // Verification level filter
    if (filters.verificationLevel && filters.verificationLevel !== 'all') {
      if (issue.verification_level_at_creation !== filters.verificationLevel) {
        return false;
      }
    }

    // Priority range filter
    if (filters.priorityRange && filters.priorityRange !== 'all') {
      const score = issue.priority_score ?? 50;
      switch (filters.priorityRange) {
        case 'high':
          if (score < 80) return false;
          break;
        case 'medium':
          if (score < 50 || score >= 80) return false;
          break;
        case 'low':
          if (score < 20 || score >= 50) return false;
          break;
        case 'very-low':
          if (score >= 20) return false;
          break;
      }
    }

    // Compliance status filter
    if (filters.complianceStatus && filters.complianceStatus !== 'all') {
      if (issue.compliance_status !== filters.complianceStatus) {
        return false;
      }
    }

    return true;
  });
}
