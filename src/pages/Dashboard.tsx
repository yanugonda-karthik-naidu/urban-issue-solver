import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Issue {
  id: string;
  title: string;
  category: string;
  status: 'pending' | 'inProgress' | 'resolved';
  createdAt: any;
  location: string;
  photoUrl?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const q = query(
      collection(db, 'issues'),
      where('userId', '==', user.uid)
    );

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />{t('status.pending')}</Badge>;
      case 'inProgress':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><AlertCircle className="h-3 w-3 mr-1" />{t('status.inProgress')}</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />{t('status.resolved')}</Badge>;
    }
  };

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
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <Button variant="hero" onClick={() => navigate('/report')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.reportIssue')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.stats.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warning">
                {t('dashboard.stats.pending')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                {t('dashboard.stats.inProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">
                {t('dashboard.stats.resolved')}
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
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : issues.length === 0 ? (
          <Card className="shadow-medium">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('dashboard.noReports')}</p>
              <Button variant="hero" onClick={() => navigate('/report')}>
                {t('dashboard.reportIssue')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {issues.map((issue) => (
              <Card key={issue.id} className="shadow-soft hover:shadow-medium transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{issue.title}</h3>
                    {getStatusBadge(issue.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{issue.category}</p>
                  <p className="text-sm text-muted-foreground">{issue.location}</p>
                  {issue.photoUrl && (
                    <img 
                      src={issue.photoUrl} 
                      alt={issue.title}
                      className="mt-4 rounded-lg max-h-48 w-auto object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
