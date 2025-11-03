import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Clock, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import IssueDetailsModal from '@/components/admin/IssueDetailsModal';

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
  user_id: string;
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
}

export default function AllIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingRemarks, setEditingRemarks] = useState<{ [key: string]: string }>({});
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

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
      const { data: issuesData, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (issuesError) throw issuesError;

      setIssues((issuesData as Issue[]) || []);

      // Fetch user profiles for all unique user_ids
      const userIds = [...new Set(issuesData?.map(i => i.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = {
          full_name: profile.full_name,
          email: profile.email,
        };
        return acc;
      }, {} as { [key: string]: UserProfile });

      setUserProfiles(profilesMap);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Set up real-time subscription for automatic updates
    const channel = supabase
      .channel('admin-all-issues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Fetch fresh data whenever any change occurs
          fetchIssues();
          
          // Show notification for new issues
          if (payload.eventType === 'INSERT') {
            toast.info('New issue reported!');
          }
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
      fetchIssues();
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
      fetchIssues();
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

  const handleViewDetails = (issue: Issue) => {
    const issueWithUserData = {
      ...issue,
      user_name: userProfiles[issue.user_id]?.full_name || 'Unknown',
      user_email: userProfiles[issue.user_id]?.email || 'N/A',
    };
    setSelectedIssue(issueWithUserData as any);
    setIsModalOpen(true);
  };

  const filteredIssues = issues
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => categoryFilter === 'all' || i.category === categoryFilter)
    .filter((i) => 
      searchQuery === '' || 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userProfiles[i.user_id]?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const uniqueCategories = Array.from(new Set(issues.map((i) => i.category)));

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">All Issues</h1>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
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
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading issues...</p>
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
                        {issue.photo_url && (
                          <div className="lg:w-64 flex-shrink-0">
                            <img 
                              src={issue.photo_url} 
                              alt={issue.title}
                              className="rounded-lg w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => handleViewDetails(issue)}
                            />
                          </div>
                        )}

                        <div className="flex-1 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">{issue.title}</h3>
                              <p className="text-sm text-muted-foreground">{issue.category}</p>
                              <p className="text-sm text-muted-foreground">
                                Reported by: {userProfiles[issue.user_id]?.full_name || 'Unknown'} ({userProfiles[issue.user_id]?.email || 'N/A'})
                              </p>
                            </div>
                            {getStatusBadge(issue.status)}
                          </div>

                          <p className="text-sm line-clamp-2">{issue.description}</p>

                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">
                                {issue.area && issue.district && issue.state
                                  ? `${issue.area}, ${issue.district}, ${issue.state}`
                                  : 'Location not specified'}
                              </p>
                              {issue.latitude && issue.longitude && (
                                <a 
                                  href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  View on Map →
                                </a>
                              )}
                            </div>
                          </div>

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
                                <div className="flex gap-2">
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
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleViewDetails(issue)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateStatus(issue.id, 'pending')}
                              disabled={issue.status === 'pending'}
                              className="bg-warning/10 hover:bg-warning/20 text-warning border-warning/20"
                            >
                              Mark Pending
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(issue.id, 'in_progress')}
                              disabled={issue.status === 'in_progress'}
                              className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                            >
                              Mark In Progress
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(issue.id, 'resolved')}
                              disabled={issue.status === 'resolved'}
                              className="bg-success/10 hover:bg-success/20 text-success border-success/20"
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
        </main>
      </div>

      <IssueDetailsModal
        issue={selectedIssue}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
