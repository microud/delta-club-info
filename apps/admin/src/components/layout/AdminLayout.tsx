import { NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Building2, Megaphone, LayoutDashboard, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/clubs', label: '俱乐部管理', icon: Building2 },
  { to: '/promotions', label: '推广管理', icon: Megaphone },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-muted/40 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Delta Club</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{admin?.username}</span>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
