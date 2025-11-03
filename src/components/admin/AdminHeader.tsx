import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';

interface AdminProfile {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export default function AdminHeader() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchAdminProfile();
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">City Issue Control Center</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        <Badge variant="default">Admin</Badge>
        <Button
          variant="ghost"
          className="flex items-center gap-3 h-auto p-2 hover:bg-muted rounded-lg"
          onClick={() => navigate('/admin/settings')}
        >
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Avatar className="cursor-pointer">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </header>
  );
}