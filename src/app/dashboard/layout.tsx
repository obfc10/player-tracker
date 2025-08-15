'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Trophy, 
  BarChart3,
  Upload,
  LogOut,
  Menu,
  X,
  GitBranch,
  UserCheck,
  UserX
} from 'lucide-react';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  const navigation = [
    { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
    { name: 'Players', href: '/dashboard/players', icon: Users },
    { name: 'Progress', href: '/dashboard/progress', icon: TrendingUp },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Changes', href: '/dashboard/changes', icon: BarChart3 },
    { name: 'Alliance Moves', href: '/dashboard/alliance-moves', icon: GitBranch },
    { name: 'Name Changes', href: '/dashboard/name-changes', icon: UserCheck },
    { name: 'Left Realm', href: '/dashboard/left-realm', icon: UserX }
  ];

  const adminNavigation = [
    { name: 'Upload Data', href: '/dashboard/upload', icon: Upload }
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 transition-all duration-300 flex-shrink-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h1 className={`text-xl font-bold text-white transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
              Player Tracker
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                  `}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className={`ml-3 transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {/* Admin Section */}
            {session?.user?.role === 'ADMIN' && (
              <>
                <div className="my-4 border-t border-gray-700" />
                <div className={`px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
                  Admin
                </div>
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                        ${isActive 
                          ? 'bg-gray-900 text-white' 
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                      `}
                      title={!sidebarOpen ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className={`ml-3 transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className={`flex-1 transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
                <p className="text-sm text-white truncate">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 capitalize">{session?.user?.role?.toLowerCase() || 'viewer'}</p>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top Header with Search */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-lg font-semibold text-white">
                {pathname === '/dashboard/overview' && 'Kingdom Overview'}
                {pathname === '/dashboard/players' && 'Player Database'}
                {pathname === '/dashboard/progress' && 'Progress Tracking'}
                {pathname === '/dashboard/leaderboard' && 'Leaderboards'}
                {pathname === '/dashboard/changes' && 'Change Analysis'}
                {pathname === '/dashboard/alliance-moves' && 'Alliance Moves'}
                {pathname === '/dashboard/name-changes' && 'Name Changes'}
                {pathname === '/dashboard/upload' && 'Data Upload'}
                {pathname.startsWith('/dashboard/player/') && 'Player Profile'}
                {!pathname.includes('/dashboard/') && 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <GlobalSearch />
              <div className="text-sm text-gray-400">
                {session?.user?.name} • {session?.user?.role?.toLowerCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}