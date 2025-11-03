import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
interface AdminProfile {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
export default function AdminHeader() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  useEffect(() => {
    const fetchAdminProfile = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).single();
        if (data) setProfile(data);
      }
    };
    fetchAdminProfile();
  }, []);
  return <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">City Issue Control Center</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Badge variant="default">Admin</Badge>
        <div className="flex items-center gap-3 rounded-none">
          <div className="text-right">
            
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Avatar>
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>;
}