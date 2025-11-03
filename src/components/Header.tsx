import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Globe, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-hero" />
          <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            CivicReport
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            {t('nav.home')}
          </Link>
          {user && (
            <>
              <Link to="/report" className="text-sm font-medium hover:text-primary transition-colors">
                {t('nav.report')}
              </Link>
              <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                {t('nav.dashboard')}
              </Link>
              <Link to="/profile" className="text-sm font-medium hover:text-primary transition-colors">
                Profile
              </Link>
              <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors">
                {t('nav.admin')}
              </Link>
            </>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('hi')}>
                हिंदी (Hindi)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button>{t('nav.login')}</Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 flex flex-col gap-4">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.home')}
            </Link>
            {user && (
              <>
                <Link to="/report" className="text-sm font-medium hover:text-primary transition-colors">
                  {t('nav.report')}
                </Link>
                <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                  {t('nav.dashboard')}
                </Link>
                <Link to="/profile" className="text-sm font-medium hover:text-primary transition-colors">
                  Profile
                </Link>
                <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors">
                  {t('nav.admin')}
                </Link>
              </>
            )}
            {user ? (
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button className="w-full">{t('nav.login')}</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
