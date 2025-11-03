import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function ManageAdmins() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
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
      setLoading(false);
    };

    checkAdmin();
  }, [navigate]);

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
            <h1 className="text-3xl font-bold">Manage Admins</h1>

            <Card className="shadow-soft">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Admin management coming soon. This feature will allow super admins to add and remove admin users.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
