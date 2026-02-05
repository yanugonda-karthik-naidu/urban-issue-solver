import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Scale, Edit, Trash2, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLegalRulesAdmin, type LegalRule } from '@/hooks/useLegalRules';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { VALID_CATEGORIES } from '@/lib/validation';

export default function LegalRulesAdmin() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: adminLoading } = useAdminAccess();
  const { rules, loading, createRule, updateRule, deleteRule } = useLegalRulesAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LegalRule | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    act_name: '',
    section_clause: '',
    responsible_authority: '',
    sla_days: '',
    description: '',
    state: '',
    city: '',
  });
  const [saving, setSaving] = useState(false);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Only Super Admins can manage legal rules.</p>
          <Button onClick={() => navigate('/admin')} className="mt-4">Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.act_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.responsible_authority.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = (rule?: LegalRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        category: rule.category,
        act_name: rule.act_name,
        section_clause: rule.section_clause || '',
        responsible_authority: rule.responsible_authority,
        sla_days: rule.sla_days?.toString() || '',
        description: rule.description || '',
        state: rule.state || '',
        city: rule.city || '',
      });
    } else {
      setEditingRule(null);
      setFormData({
        category: '',
        act_name: '',
        section_clause: '',
        responsible_authority: '',
        sla_days: '',
        description: '',
        state: '',
        city: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.act_name || !formData.responsible_authority) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const ruleData = {
        category: formData.category,
        act_name: formData.act_name,
        section_clause: formData.section_clause || null,
        responsible_authority: formData.responsible_authority,
        sla_days: formData.sla_days ? parseInt(formData.sla_days) : null,
        description: formData.description || null,
        state: formData.state || null,
        city: formData.city || null,
        is_active: true,
        version: editingRule ? editingRule.version + 1 : 1,
      };

      if (editingRule) {
        await updateRule(editingRule.id, ruleData);
        toast.success('Legal rule updated');
      } else {
        await createRule(ruleData);
        toast.success('Legal rule created');
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('Failed to save legal rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: LegalRule) => {
    if (!confirm(`Deactivate "${rule.act_name}"?`)) return;
    
    try {
      await deleteRule(rule.id);
      toast.success('Legal rule deactivated');
    } catch (err) {
      toast.error('Failed to deactivate rule');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Scale className="h-8 w-8" />
                Legal Rules Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage municipal acts, rules, and SLA requirements for issue categories
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Legal Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? 'Edit Legal Rule' : 'Add New Legal Rule'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(v) => setFormData({...formData, category: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>SLA Days (Legal Deadline)</Label>
                      <Input 
                        type="number"
                        value={formData.sla_days}
                        onChange={(e) => setFormData({...formData, sla_days: e.target.value})}
                        placeholder="e.g., 7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Act/Rule Name *</Label>
                    <Input 
                      value={formData.act_name}
                      onChange={(e) => setFormData({...formData, act_name: e.target.value})}
                      placeholder="e.g., Solid Waste Management Rules, 2016"
                    />
                  </div>
                  <div>
                    <Label>Section/Clause</Label>
                    <Input 
                      value={formData.section_clause}
                      onChange={(e) => setFormData({...formData, section_clause: e.target.value})}
                      placeholder="e.g., Section 15 or Rule 4(2)"
                    />
                  </div>
                  <div>
                    <Label>Responsible Authority *</Label>
                    <Input 
                      value={formData.responsible_authority}
                      onChange={(e) => setFormData({...formData, responsible_authority: e.target.value})}
                      placeholder="e.g., Municipal Corporation Sanitation Dept"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of the rule's applicability..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>State (optional)</Label>
                      <Input 
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        placeholder="For state-specific rules"
                      />
                    </div>
                    <div>
                      <Label>City (optional)</Label>
                      <Input 
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        placeholder="For city-specific rules"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editingRule ? 'Update Rule' : 'Create Rule'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {VALID_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rules Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRules.map(rule => (
                <Card key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="capitalize">{rule.category}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base">{rule.act_name}</CardTitle>
                    {rule.section_clause && (
                      <CardDescription>{rule.section_clause}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Authority: </span>
                      <span>{rule.responsible_authority}</span>
                    </div>
                    {rule.sla_days && (
                      <div>
                        <span className="text-muted-foreground">Legal SLA: </span>
                        <Badge variant="secondary">{rule.sla_days} days</Badge>
                      </div>
                    )}
                    {rule.description && (
                      <p className="text-muted-foreground text-xs">{rule.description}</p>
                    )}
                    <div className="flex gap-1 pt-2">
                      {rule.state && <Badge variant="outline" className="text-xs">{rule.state}</Badge>}
                      {rule.city && <Badge variant="outline" className="text-xs">{rule.city}</Badge>}
                      <Badge variant={rule.is_active ? 'default' : 'destructive'} className="text-xs">
                        v{rule.version}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredRules.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No legal rules found. Add one to get started.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
