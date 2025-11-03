import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Send, MapPin, Bot, Image as ImageIcon, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { uploadToCloudinary } from '@/lib/cloudinary';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
};

type LocationData = {
  area: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
};

export default function CivicGuide() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello 👋! I\'m your Civic Guide. Let\'s report your issue together step-by-step.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUserId(session.user.id);
        // Automatically get location on mount
        getLocation();
      }
    });
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to get address details
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            
            const locationData = {
              area: data.address.suburb || data.address.neighbourhood || data.address.road || '',
              district: data.address.city || data.address.town || data.address.county || '',
              state: data.address.state || '',
              latitude,
              longitude,
            };
            
            setLocation(locationData);
            toast.success(`📍 Location detected: ${locationData.area}, ${locationData.district}, ${locationData.state}`);
          } catch (error) {
            setLocation({
              area: '',
              district: '',
              state: '',
              latitude,
              longitude,
            });
            toast.success('📍 Location coordinates detected!');
          }
        },
        () => {
          toast.error('Failed to get location. Please enable location access.');
        }
      );
    } else {
      toast.error('Geolocation not supported by your browser');
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
      // Append a user message immediately with uploaded image links
      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          content: `📷 Uploaded ${urls.length} image(s): ${urls.join(', ')}`,
          imageUrl: urls[0],
          imageUrls: urls,
        } as Message,
      ]);
      toast.success(`✅ ${urls.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && uploadedImages.length === 0) || loading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input || '📷 Image uploaded',
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : undefined
    };
    
    // Add user message with images to chat
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const messageContent = uploadedImages.length > 0 
        ? `${input}\n\n[User uploaded ${uploadedImages.length} image(s). Image URLs: ${uploadedImages.join(', ')}]`
        : input;

      const { data, error } = await supabase.functions.invoke('civic-guide-chat', {
        body: {
          messages: [...messages, { role: 'user', content: messageContent }],
          userLocation: location,
          images: uploadedImages
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if AI wants to submit the report
      try {
        const jsonMatch = data.message.match(/\{[\s\S]*"action":\s*"SUBMIT_REPORT"[\s\S]*\}/);
        if (jsonMatch) {
          const reportData = JSON.parse(jsonMatch[0]);
          if (reportData.action === 'SUBMIT_REPORT' && reportData.data) {
            await submitReport(reportData.data);
          }
        }
      } catch (e) {
        // Not a JSON response, continue conversation
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async (data: any) => {
    if (!userId) {
      toast.error('Please login to report an issue');
      navigate('/login');
      return;
    }

    try {
      const { error } = await supabase.from('issues').insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        category: data.category,
        area: data.area || location?.area || null,
        district: data.district || location?.district || null,
        state: data.state || location?.state || null,
        latitude: location?.latitude,
        longitude: location?.longitude,
        photo_url: uploadedImages[0] || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('✅ Issue reported successfully! Redirecting to dashboard...');
      
      // Clear images after successful submission
      setUploadedImages([]);
      
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to report issue');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error submitting your report. Please try again or use the manual form.'
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-card py-8">
      <div className="container max-w-4xl">
        <Card className="shadow-strong h-[calc(100vh-8rem)] flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-primary">
                <AvatarFallback>
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">AI Civic Guide</CardTitle>
                <p className="text-sm text-muted-foreground">Let's report your issue together</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getLocation}
                className="ml-auto"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Detect Location
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="Uploaded"
                      className="rounded-lg mb-2 max-w-full h-auto max-h-48 object-cover"
                    />
                  )}
                  {message.imageUrls && message.imageUrls.length > 1 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {message.imageUrls.map((url, i) => (
                        <img key={i} src={url} alt={`Uploaded ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border" />
                      ))}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="border-t p-4">
            {uploadedImages.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Upload ${index + 1}`} 
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message or upload an image..."
                disabled={loading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={loading || (!input.trim() && uploadedImages.length === 0)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              📍 Location: {location ? `${location.area}, ${location.district}, ${location.state}` : 'Detecting...'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
