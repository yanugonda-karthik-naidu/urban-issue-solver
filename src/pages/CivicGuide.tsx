import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Send, MapPin, Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Message = {
  role: 'user' | 'assistant';
  content: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({
            area: '',
            district: '',
            state: '',
            latitude,
            longitude,
          });
          toast.success('Location detected! Please provide area, district, and state details.');
        },
        () => {
          toast.error('Failed to get location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('civic-guide-chat', {
        body: {
          messages: [...messages, userMessage],
          userLocation: location
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
        status: 'pending',
      });

      if (error) throw error;

      toast.success('✅ Issue reported successfully! Redirecting to dashboard...');
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
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Tip: You can type in any language - English, Hindi, Telugu, Tamil, etc.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
