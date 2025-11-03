import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, Upload } from 'lucide-react';

export default function ReportIssue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    photoUrl: ''
  });

  const user = auth.currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to report an issue');
      navigate('/login');
      return;
    }

    if (!formData.title || !formData.description || !formData.category || !formData.location) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'issues'), {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast.success('Issue reported successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to report issue');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData({ ...formData, location: `${latitude}, ${longitude}` });
          toast.success('Location detected!');
        },
        (error) => {
          toast.error('Failed to get location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-card py-8">
      <div className="container max-w-2xl">
        <Card className="shadow-strong">
          <CardHeader>
            <CardTitle className="text-2xl">{t('report.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="category">{t('report.category')}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('report.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roads">{t('report.categories.roads')}</SelectItem>
                    <SelectItem value="garbage">{t('report.categories.garbage')}</SelectItem>
                    <SelectItem value="water">{t('report.categories.water')}</SelectItem>
                    <SelectItem value="electricity">{t('report.categories.electricity')}</SelectItem>
                    <SelectItem value="other">{t('report.categories.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">{t('report.issueTitle')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('report.issueTitle')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t('report.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('report.description')}
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">{t('report.location')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t('report.location')}
                    required
                  />
                  <Button type="button" variant="outline" onClick={getLocation}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="photo">{t('report.uploadPhoto')}</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    {t('report.uploadPhoto')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Photo upload via Cloudinary coming soon
                </p>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? t('report.submitting') : t('report.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
