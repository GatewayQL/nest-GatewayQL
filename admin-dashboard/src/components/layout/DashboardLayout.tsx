import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Activity,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Credentials', href: '/dashboard/credentials', icon: KeyRound },
  { name: 'Health', href: '/dashboard/health', icon: Activity },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="fixed inset-y-0 left-0 w-64 bg-card border-r">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="text-xl font-bold">GatewayQL Admin</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <nav className="space-y-1 px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col border-r bg-card">
          <div className="flex h-16 items-center px-6">
            <h1 className="text-xl font-bold">GatewayQL Admin</h1>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">{user?.username}</p>
                <p className="text-muted-foreground">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">GatewayQL Admin</h1>
        </div>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
