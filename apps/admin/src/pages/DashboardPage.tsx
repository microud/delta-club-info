import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router';

export default function DashboardPage() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Delta Club Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{admin?.username}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            退出
          </Button>
        </div>
      </header>
      <main className="p-6">
        <p className="text-muted-foreground">欢迎使用 Delta Club 管理后台。功能模块将在后续 Stage 中逐步添加。</p>
      </main>
    </div>
  );
}
