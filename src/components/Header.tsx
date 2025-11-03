import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Menu, X, Globe } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
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
          <Link to="/report" className="text-sm font-medium hover:text-primary transition-colors">
            {t('nav.report')}
          </Link>
          <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
            {t('nav.dashboard')}
          </Link>
          <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors">
            {t('nav.admin')}
          </Link>
          
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

          <Link to="/login">
            <Button>{t('nav.login')}</Button>
          </Link>
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
            <Link to="/report" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.report')}
            </Link>
            <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.dashboard')}
            </Link>
            <Link to="/admin" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.admin')}
            </Link>
            <Link to="/login">
              <Button className="w-full">{t('nav.login')}</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
