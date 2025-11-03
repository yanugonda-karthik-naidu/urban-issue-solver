import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'inProgress' | 'resolved';
  createdAt: any;
  location: string;
  photoUrl?: string;
  userName?: string;
  userEmail?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const q = query(collection(db, 'issues'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData: Issue[] = [];
      snapshot.forEach((doc) => {
        issuesData.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(issuesData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const updateStatus = async (issueId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'issues', issueId), {
        status: newStatus
      });
      toast.success('Status updated successfully!');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'inProgress':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>;
    }
  };

  const filteredIssues = filter === 'all' ? issues : issues.filter(i => i.status === filter);

  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === 'pending').length,
    inProgress: issues.filter(i => i.status === 'inProgress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inProgress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
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
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{issue.title}</h3>
                      <p className="text-sm text-muted-foreground">{issue.category}</p>
                      <p className="text-sm text-muted-foreground">{issue.userName} ({issue.userEmail})</p>
                    </div>
                    {getStatusBadge(issue.status)}
                  </div>
                  <p className="text-sm mb-2">{issue.description}</p>
                  <p className="text-sm text-muted-foreground mb-4">{issue.location}</p>
                  {issue.photoUrl && (
                    <img 
                      src={issue.photoUrl} 
                      alt={issue.title}
                      className="mb-4 rounded-lg max-h-48 w-auto object-cover"
                    />
                  )}
                  <div className="flex gap-2">
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
                      onClick={() => updateStatus(issue.id, 'inProgress')}
                      disabled={issue.status === 'inProgress'}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
