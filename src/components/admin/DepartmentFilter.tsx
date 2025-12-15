import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { Department } from '@/hooks/useDepartments';

interface DepartmentFilterProps {
  departments: Department[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DepartmentFilter({ departments, value, onChange, disabled, className }: DepartmentFilterProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
