import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  Layers, 
  Settings, 
  LogOut,
  LayoutDashboard,
  UserPlus,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const navItems = [
    { href: '/admin', label: 'Обзор', icon: LayoutDashboard, adminOnly: false },
    { href: '/admin/events', label: 'События', icon: CalendarDays, adminOnly: false },
    { href: '/admin/lesson-types', label: 'Виды занятий', icon: Layers, adminOnly: false },
    { href: '/admin/settings', label: 'Настройки виджета', icon: Settings, adminOnly: false },
    { href: '/admin/invites', label: 'Приглашения', icon: UserPlus, adminOnly: true },
    { href: '/admin/users', label: 'Пользователи', icon: Users, adminOnly: true },
  ];

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 min-h-screen bg-[hsl(var(--admin-sidebar))] text-[hsl(var(--admin-sidebar-foreground))] flex flex-col">
      <div className="p-6 border-b border-[hsl(var(--admin-sidebar-accent))]">
        <h1 className="text-xl font-bold">Расписание</h1>
        <p className="text-sm opacity-70 mt-1">Школа каллиграфии</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/admin' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive 
                  ? 'bg-[hsl(var(--admin-sidebar-accent))] text-[hsl(var(--admin-sidebar-foreground))]' 
                  : 'hover:bg-[hsl(var(--admin-sidebar-accent))/0.5] opacity-80 hover:opacity-100'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[hsl(var(--admin-sidebar-accent))]">
        <div className="text-sm opacity-70 mb-3 truncate px-2">
          {user?.email}
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-[hsl(var(--admin-sidebar-foreground))] hover:bg-[hsl(var(--admin-sidebar-accent))]"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Выйти
        </Button>
      </div>
    </aside>
  );
}