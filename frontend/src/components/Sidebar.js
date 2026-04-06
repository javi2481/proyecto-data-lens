import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  LayoutDashboard, 
  FileBarChart, 
  GitCompare, 
  AlertTriangle, 
  FileStack, 
  Settings,
  Sun,
  Moon,
  LogOut,
  Crown,
  Globe
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('nav.overview') },
    { path: '/dashboard/reports', icon: FileStack, label: t('nav.reports') },
    { path: '/dashboard/compare', icon: GitCompare, label: t('nav.compare'), pro: true },
  ];

  const planBadgeClass = {
    free: 'plan-badge-free',
    pro: 'plan-badge-pro',
    team: 'plan-badge-team'
  };

  return (
    <aside className="sidebar h-screen bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <FileBarChart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">DataLens</h1>
            <p className="text-xs text-muted-foreground">Data Profiling</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.path.split('/').pop() || 'overview'}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span className="flex-1">{item.label}</span>
              {item.pro && user?.plan === 'free' && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Theme & Language toggles */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleTheme}
            className="flex-1 justify-start gap-2"
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-xs">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleLanguage}
            className="flex-1 justify-start gap-2"
            data-testid="language-toggle"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs uppercase">{language}</span>
          </Button>
        </div>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              data-testid="user-menu-trigger"
            >
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${planBadgeClass[user?.plan] || planBadgeClass.free}`}>
                    {user?.plan?.toUpperCase() || 'FREE'}
                  </span>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" data-testid="user-menu">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/pricing" className="flex items-center gap-2 cursor-pointer" data-testid="menu-pricing">
                <Crown className="w-4 h-4" />
                <span>{t('pricing.upgrade')}</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout} 
              className="text-destructive focus:text-destructive cursor-pointer"
              data-testid="menu-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>{t('auth.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default Sidebar;
