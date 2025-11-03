import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  area: string | null;
  district: string | null;
  state: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  admin_remarks: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingRemarks, setEditingRemarks] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!adminData) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchIssues();
    };

    checkAdminAndFetch();
  }, [navigate]);

  const fetchIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching issues:', error);
        toast.error('Failed to load issues: ' + error.message);
      } else {
        console.log('Fetched issues:', data);
        setIssues((data as any[]) || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-issues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        () => {
          fetchIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const updateStatus = async (issueId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ status: newStatus })
        .eq('id', issueId);

      if (error) throw error;
      toast.success('Status updated successfully!');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const updateRemarks = async (issueId: string, remarks: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ admin_remarks: remarks })
        .eq('id', issueId);

      if (error) throw error;
      toast.success('Remarks updated successfully!');
      setEditingRemarks((prev) => {
        const updated = { ...prev };
        delete updated[issueId];
        return updated;
      });
    } catch (error) {
      toast.error('Failed to update remarks');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>;
    }
  };

  const filteredIssues = issues
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => areaFilter === 'all' || i.area === areaFilter);

  const uniqueAreas = Array.from(new Set(issues.map((i) => i.area).filter(Boolean))) as string[];

  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === 'pending').length,
    inProgress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {uniqueAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warning">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Issues List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <Card className="shadow-medium">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No issues found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredIssues.map((issue) => (
              <Card key={issue.id} className="shadow-soft hover:shadow-medium transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    {issue.photo_url && (
                      <div className="lg:w-64 flex-shrink-0">
                        <img 
                          src={issue.photo_url} 
                          alt={issue.title}
                          className="rounded-lg w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    {/* Content Section */}
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{issue.title}</h3>
                          <p className="text-sm text-muted-foreground">{issue.category}</p>
                          <p className="text-sm text-muted-foreground">
                            Reported by: {issue.profiles?.full_name || 'Unknown'} ({issue.profiles?.email || 'N/A'})
                          </p>
                        </div>
                        {getStatusBadge(issue.status)}
                      </div>

                      <p className="text-sm">{issue.description}</p>

                      {/* Location Info */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">
                              {issue.area && issue.district && issue.state
                                ? `${issue.area}, ${issue.district}, ${issue.state}`
                                : 'Location not specified'}
                            </p>
                            {issue.latitude && issue.longitude && (
                              <p className="text-xs">
                                Coordinates: {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}
                                <a 
                                  href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-primary hover:underline"
                                >
                                  View on Map
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin Remarks */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Remarks</label>
                        {editingRemarks[issue.id] !== undefined ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingRemarks[issue.id]}
                              onChange={(e) =>
                                setEditingRemarks((prev) => ({
                                  ...prev,
                                  [issue.id]: e.target.value,
                                }))
                              }
                              placeholder="Add remarks for the user..."
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateRemarks(issue.id, editingRemarks[issue.id])}
                              >
                                Save Remarks
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingRemarks((prev) => {
                                    const updated = { ...prev };
                                    delete updated[issue.id];
                                    return updated;
                                  })
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {issue.admin_remarks || 'No remarks yet'}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingRemarks((prev) => ({
                                  ...prev,
                                  [issue.id]: issue.admin_remarks || '',
                                }))
                              }
                            >
                              {issue.admin_remarks ? 'Edit Remarks' : 'Add Remarks'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="warning" 
                          size="sm"
                          onClick={() => updateStatus(issue.id, 'pending')}
                          disabled={issue.status === 'pending'}
                        >
                          Mark Pending
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => updateStatus(issue.id, 'in_progress')}
                          disabled={issue.status === 'in_progress'}
                        >
                          Mark In Progress
                        </Button>
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => updateStatus(issue.id, 'resolved')}
                          disabled={issue.status === 'resolved'}
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
