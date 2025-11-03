import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  area: string | null;
  district: string | null;
  state: string | null;
  photo_url: string | null;
  admin_remarks: string | null;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUserId(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const fetchIssues = async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load issues');
      } else {
        setIssues((data as Issue[]) || []);
      }
      setLoading(false);
    };

    fetchIssues();

    const channel = supabase
      .channel('issues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />{t('status.pending')}</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><AlertCircle className="h-3 w-3 mr-1" />{t('status.inProgress')}</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />{t('status.resolved')}</Badge>;
    }
  };

  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === 'pending').length,
    inProgress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  // Helper to determine an issue's priority for demo purposes when not present in DB
  const getIssuePriority = (issue: Issue, idx: number) => {
    if ((issue as any).priority) return (issue as any).priority as 'high' | 'medium' | 'low';
    // deterministic demo assignment: cycle through high, medium, low
    const map = ['high', 'medium', 'low'] as const;
    return map[idx % 3];
  };

  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  // displayedIssues removed — rendering all issues

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle') || ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/report')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.reportIssue')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center text-center p-6">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground">{t('dashboard.stats.total')}</div>
              <div className="text-3xl font-extrabold mt-2">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center text-center p-6">
              <div className="p-3 rounded-full bg-warning/10 text-warning mb-2">
                <Clock className="h-5 w-5" />
              </div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground">{t('dashboard.stats.pending')}</div>
              <div className="text-3xl font-extrabold text-warning mt-2">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center text-center p-6">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground">{t('dashboard.stats.inProgress')}</div>
              <div className="text-3xl font-extrabold text-primary mt-2">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center text-center p-6">
              <div className="p-3 rounded-full bg-success/10 text-success mb-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-sm uppercase tracking-wider text-muted-foreground">{t('dashboard.stats.resolved')}</div>
              <div className="text-3xl font-extrabold text-success mt-2">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Priority filter */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Priority</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Filter:</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="rounded-md border bg-background px-2 py-1 text-sm">
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Issues List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : issues.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('dashboard.noReports')}</p>
              <Button variant="hero" onClick={() => navigate('/report')}>
                {t('dashboard.reportIssue')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {issues.map((issue, idx) => (
              <Card key={issue.id} className="shadow-md hover:shadow-lg transition-all overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center">
                    {/* Image on the left */}
                    <div className="w-full md:w-56 h-40 md:h-32 flex-shrink-0 overflow-hidden bg-muted/10 flex items-center justify-center">
                      {issue.photo_url ? (
                        <img src={issue.photo_url} alt={issue.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{issue.title}</h3>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">{issue.category}</Badge>
                            <span className="text-xs text-muted-foreground">{issue.area && issue.district && issue.state ? `${issue.area}, ${issue.district}` : t('dashboard.locationNotSpecified') || 'Location not specified'}</span>
                          </div>
                          <div className="mt-2">
                            {/* demo priority badge */}
                            {(() => {
                              const p = getIssuePriority(issue, idx);
                              if (p === 'high') return <Badge className="bg-destructive/10 text-destructive border-destructive/20">High</Badge>;
                              if (p === 'medium') return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
                              return <Badge className="bg-success/10 text-success border-success/20">Low</Badge>;
                            })()}
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col items-end gap-2">
                          {getStatusBadge(issue.status)}
                          <div>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedIssue(issue); setDialogOpen(true); }}>
                              View
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedIssue(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedIssue?.title}</DialogTitle>
              <DialogDescription>
                {selectedIssue && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">{selectedIssue.category}</Badge>
                      {getStatusBadge(selectedIssue.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">{selectedIssue.area && selectedIssue.district ? `${selectedIssue.area}, ${selectedIssue.district}, ${selectedIssue.state ?? ''}` : t('dashboard.locationNotSpecified') || 'Location not specified'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(selectedIssue.created_at).toLocaleString()}</div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedIssue && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{selectedIssue.description}</p>
                </div>
                
                {selectedIssue.photo_url && (
                  <div>
                    <img src={selectedIssue.photo_url} alt={selectedIssue.title} className="w-full max-h-80 object-cover rounded-md" />
                  </div>
                )}

                {selectedIssue.admin_remarks && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm font-medium mb-2">Admin Update</p>
                    <p className="text-sm text-muted-foreground">{selectedIssue.admin_remarks}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
