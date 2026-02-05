import { useState } from 'react';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, LogOut, Building2, UserCog, Shield, Scale } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch';
import { useIssueCounts } from '@/hooks/useIssueCounts';
import { Badge } from '@/components/ui/badge';

const superAdminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, showBadge: false },
  { title: 'All Issues', url: '/admin/issues', icon: FileText, showBadge: true },
  { title: 'Workers', url: '/admin/workers', icon: UserCog, showBadge: false },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3, showBadge: false },
  { title: 'Manage Admins', url: '/admin/manage-admins', icon: Users, showBadge: false },
  { title: 'User Verification', url: '/admin/verification', icon: Shield, showBadge: false },
  { title: 'Legal Rules', url: '/admin/legal-rules', icon: Scale, showBadge: false },
  { title: 'Settings', url: '/admin/settings', icon: Settings, showBadge: false },
];

const departmentAdminMenuItems = [
  { title: 'Dashboard', url: '/department', icon: Building2, showBadge: false },
  { title: 'Issues', url: '/department/issues', icon: FileText, showBadge: true },
  { title: 'Workers', url: '/department/workers', icon: UserCog, showBadge: false },
  { title: 'Analytics', url: '/department/analytics', icon: BarChart3, showBadge: false },
  { title: 'Settings', url: '/admin/settings', icon: Settings, showBadge: false },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { isSuperAdmin, loading } = useAdminAccess();
  const { onMouseEnter } = useRoutePrefetch();
  const { counts } = useIssueCounts();

  const menuItems = isSuperAdmin ? superAdminMenuItems : departmentAdminMenuItems;
  const title = isSuperAdmin ? 'Admin Control Center' : 'Department Control Center';

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <aside className={cn(
      'bg-card border-r border-border min-h-screen flex flex-col transition-width',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className={cn('text-sm font-bold text-primary transition-all', collapsed ? 'hidden' : 'text-lg')}>
          {title}
        </h2>
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(s => !s)}
          className="p-2 rounded-md hover:bg-muted"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {collapsed ? (
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            ) : (
              <>
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      <nav className={cn('flex-1 p-2 space-y-1', collapsed ? 'px-1' : 'p-4')}>
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/admin' || item.url === '/department'}
            onMouseEnter={onMouseEnter(item.url)}
            onFocus={onMouseEnter(item.url)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg transition-colors relative',
              collapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3',
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {/* Badge for collapsed state */}
              {collapsed && item.showBadge && counts.pending > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold"
                >
                  {counts.pending > 99 ? '99+' : counts.pending}
                </Badge>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.showBadge && counts.pending > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-bold"
                  >
                    {counts.pending > 99 ? '99+' : counts.pending}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Issue summary when expanded */}
      {!collapsed && counts.pending > 0 && (
        <div className="px-4 pb-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Quick Stats</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending</span>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {counts.pending}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">In Progress</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {counts.inProgress}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className={cn('p-3 border-t border-border flex items-center', collapsed ? 'justify-center' : '')}>
        <button
          onClick={handleLogout}
          className={cn('flex items-center gap-3 rounded-lg w-full hover:bg-destructive/10 text-destructive transition-colors', collapsed ? 'justify-center p-2' : 'px-4 py-3')}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}