import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, Upload, X, Camera } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ReportIssue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    area: '',
    district: '',
    state: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCameraChoice, setShowCameraChoice] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Please login to report an issue');
      navigate('/login');
      return;
    }

    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: newIssue, error } = await supabase.from('issues').insert({
        user_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        area: formData.area || null,
        district: formData.district || null,
        state: formData.state || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        photo_url: uploadedImages[0] || null,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      // Notify all admins about new issue
      const { data: admins } = await supabase
        .from('admins')
        .select('user_id');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.user_id,
          title: 'New Issue Reported',
          message: `${formData.title} - ${formData.category}`,
          type: 'new_issue',
          issue_id: newIssue.id,
        }));

        try {
          // Get the current session to pass the auth token
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('No session found for notification creation');
          } else {
            // Call the edge function with authentication
            const { data: funcResult, error: funcError } = await supabase.functions.invoke('create-admin-notifications', {
              body: { 
                notifications,
                issue_id: newIssue.id 
              }
            });

            if (funcError) {
              console.error('Function failed to create notifications:', funcError);
            } else {
              console.log('Inserted admin notifications via function:', funcResult);
            }
          }
        } catch (err) {
          console.error('Failed to create admin notifications:', err);
        }
      }

      toast.success('Issue reported successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to report issue');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setUploadedImages(prev => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCamera = async (facing: 'environment' | 'user' = 'environment') => {
    try {
      // On desktop, this will open the default webcam. On mobile, choose facing mode.
      const constraints: MediaStreamConstraints = { video: { facingMode: facing } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setShowCameraChoice(false);
    } catch (err: any) {
      console.error('Camera error:', err);
      toast.error('Unable to access camera');
      setShowCameraChoice(false);
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      // ignore
    }
    setCameraActive(false);
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    setUploading(true);
    try {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      canvas.width = vw || 1280;
      canvas.height = vh || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to get canvas context');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      if (!blob) throw new Error('Failed to capture image');

      // convert blob to File for upload helper
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadToCloudinary(file);
      setUploadedImages(prev => [...prev, url]);
      toast.success('Photo captured');
    } catch (err: any) {
      console.error('Capture error:', err);
      toast.error(err?.message || 'Failed to capture photo');
    } finally {
      setUploading(false);
      stopCamera();
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData({ 
            ...formData, 
            latitude, 
            longitude,
          });
          toast.success('Location detected! Add area, district, and state manually.');
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

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>Location</Label>
                  <Button type="button" variant="outline" size="sm" onClick={getLocation}>
                    <MapPin className="h-4 w-4 mr-1" />
                    Auto-detect GPS
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="area">Area</Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="Area"
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="District"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                </div>

                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-muted-foreground">
                    GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                )}
                {formData.latitude && formData.longitude && (
                  <div className="mt-2 rounded-md overflow-hidden border">
                    {/* Small embedded map preview using OpenStreetMap */}
                    <iframe
                      title="location-preview"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.longitude! - 0.01}%2C${formData.latitude! - 0.01}%2C${formData.longitude! + 0.01}%2C${formData.latitude! + 0.01}&layer=mapnik&marker=${formData.latitude}%2C${formData.longitude}`}
                      style={{ width: '100%', height: '220px', border: 0 }}
                    />
                    <div className="p-2 text-xs text-muted-foreground">Preview of detected location. Click to open in OpenStreetMap.</div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="photo">{t('report.uploadPhoto')}</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef?.current?.click()} disabled={uploading}>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Uploading...' : t('report.uploadPhoto')}
                    </Button>
                    <Button type="button" variant="ghost" className="ml-2" onClick={() => {
                      // On mobile, show choice front/back. On desktop, open default webcam
                      const isMobile = /Mobi|Android/i.test(navigator.userAgent || '');
                      if (isMobile) setShowCameraChoice((s) => !s);
                      else openCamera('user');
                    }}>
                      <Camera className="mr-1" />
                      Camera
                    </Button>
                  </div>
                  {showCameraChoice && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => openCamera('environment')}>Use rear camera</Button>
                      <Button size="sm" variant="ghost" onClick={() => openCamera('user')}>Use front camera</Button>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="mt-3">
                      <div className="relative">
                        <video ref={videoRef} className="w-full rounded-md bg-black" playsInline />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button size="sm" onClick={captureFromCamera} disabled={uploading}>Capture</Button>
                          <Button size="sm" variant="ghost" onClick={stopCamera}>Close</Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {uploadedImages.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {uploadedImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img src={url} alt={`Upload ${index + 1}`} className="h-20 w-20 object-cover rounded-lg border" />
                          <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
