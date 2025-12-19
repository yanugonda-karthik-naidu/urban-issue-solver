import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Clock, MapPin, Search, User, List, Map } from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import IssueDetailsModal from '@/components/admin/IssueDetailsModal';
import IssuesMap from '@/components/admin/IssuesMap';
import { SLABadge } from '@/components/admin/SLABadge';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useAdminAccess } from '@/hooks/useAdminAccess';

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
  department_id: string | null;
  sla_deadline: string | null;
  resolved_at: string | null;
  assigned_worker_id: string | null;
}

interface Worker {
  id: string;
  name: string;
  assigned_area: string | null;
  assigned_district: string | null;
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
}

export default function DepartmentIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRemarks, setEditingRemarks] = useState<{ [key: string]: string }>({});
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [department, setDepartment] = useState<Department | null>(null);

  const { departments, getDepartmentById } = useDepartments();
  const { adminInfo, isSuperAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (!adminLoading && adminInfo) {
      if (isSuperAdmin) {
        navigate('/admin/issues');
        return;
      }
      
      if (adminInfo.department_id) {
        const dept = getDepartmentById(adminInfo.department_id);
        setDepartment(dept || null);
        fetchIssues(adminInfo.department_id);
        fetchWorkers(adminInfo.department_id);
      }
    }
  }, [adminInfo, adminLoading, departments]);

  const fetchIssues = async (deptId: string) => {
    try {
      let query = supabase
        .from('issues')
        .select('*')
        .eq('department_id', deptId)
        .order('created_at', { ascending: false });

      // Filter by admin's assigned locations if not super admin
      if (adminInfo?.assigned_districts?.length) {
        query = query.in('district', adminInfo.assigned_districts);
      }

      const { data: issuesData, error: issuesError } = await query;

      if (issuesError) throw issuesError;

      setIssues((issuesData as Issue[]) || []);

      // Fetch user profiles
      const userIds = [...new Set(issuesData?.map(i => i.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = { full_name: profile.full_name, email: profile.email };
          return acc;
        }, {} as { [key: string]: UserProfile });

        setUserProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async (deptId: string) => {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('department_id', deptId);
    setWorkers((data as Worker[]) || []);
  };

  useEffect(() => {
    if (!adminInfo?.department_id) return;

    const channel = supabase
      .channel('dept-issues-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `department_id=eq.${adminInfo.department_id}` },
        () => {
          fetchIssues(adminInfo.department_id!);
          toast.info('Issues updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminInfo?.department_id]);

  const updateStatus = async (issueId: string, newStatus: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ status: newStatus })
        .eq('id', issueId);

      if (error) throw error;
      toast.success('Status updated successfully!');
      fetchIssues(adminInfo!.department_id!);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const assignWorker = async (issueId: string, workerId: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ assigned_worker_id: workerId || null })
        .eq('id', issueId);

      if (error) throw error;
      toast.success('Worker assigned successfully!');
      fetchIssues(adminInfo!.department_id!);
    } catch (error) {
      toast.error('Failed to assign worker');
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
      fetchIssues(adminInfo!.department_id!);
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
    .filter((i) => 
      searchQuery === '' || 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.area?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getWorkerById = (id: string | null) => workers.find(w => w.id === id);

  if (loading || adminLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">{department?.name} Issues</h1>
                <p className="text-muted-foreground">{filteredIssues.length} issues in your department</p>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or area..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Map View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="map">
                <Card className="shadow-soft">
                  <CardContent className="p-4 relative">
                    <IssuesMap 
                      issues={filteredIssues} 
                      height="500px" 
                      onIssueClick={(issue) => handleViewDetails(issue as Issue)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="list">
                {filteredIssues.length === 0 ? (
                  <Card className="shadow-medium">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No issues found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredIssues.map((issue) => {
                      const assignedWorker = getWorkerById(issue.assigned_worker_id);
                      
                      return (
                        <Card key={issue.id} className="shadow-soft hover:shadow-medium transition-all">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                              {issue.photo_url && (
                                <div className="lg:w-48 flex-shrink-0">
                                  <img 
                                    src={issue.photo_url} 
                                    alt={issue.title}
                                    className="rounded-lg w-full h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => handleViewDetails(issue)}
                                  />
                                </div>
                              )}

                              <div className="flex-1 space-y-4">
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                  <div className="space-y-1">
                                    <h3 className="text-lg font-semibold">{issue.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Reported by: {userProfiles[issue.user_id]?.full_name || 'Unknown'}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {getStatusBadge(issue.status)}
                                    <SLABadge 
                                      slaDeadline={issue.sla_deadline} 
                                      status={issue.status}
                                      resolvedAt={issue.resolved_at}
                                    />
                                  </div>
                                </div>

                                <p className="text-sm line-clamp-2">{issue.description}</p>

                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <p className="font-medium">
                                    {issue.area && issue.district && issue.state
                                      ? `${issue.area}, ${issue.district}, ${issue.state}`
                                      : 'Location not specified'}
                                  </p>
                                </div>

                                {/* Worker Assignment */}
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Assign to:</span>
                                  <Select 
                                    value={issue.assigned_worker_id || ''} 
                                    onValueChange={(val) => assignWorker(issue.id, val)}
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue placeholder="Select worker" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Unassigned</SelectItem>
                                      {workers.map((worker) => (
                                        <SelectItem key={worker.id} value={worker.id}>
                                          {worker.name} ({worker.assigned_area || worker.assigned_district || 'All areas'})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium">Status:</span>
                                    <Select value={issue.status} onValueChange={(val) => updateStatus(issue.id, val, issue.user_id)}>
                                      <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-sm font-medium">Remarks:</span>
                                    <Textarea
                                      placeholder="Add remarks for the user..."
                                      value={editingRemarks[issue.id] ?? issue.admin_remarks ?? ''}
                                      onChange={(e) => setEditingRemarks((prev) => ({ ...prev, [issue.id]: e.target.value }))}
                                      className="min-h-[60px]"
                                    />
                                    {editingRemarks[issue.id] !== undefined && (
                                      <Button size="sm" onClick={() => updateRemarks(issue.id, editingRemarks[issue.id])}>
                                        Save Remarks
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(issue)}>
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <IssueDetailsModal
        issue={selectedIssue as any}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
