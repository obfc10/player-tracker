'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { SeasonProvider } from '@/contexts/SeasonContext';
import {
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
  UserX,
  UserPlus,
  Calendar,
  Shield,
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
    { name: 'Alliance Dashboard', href: '/dashboard/alliance', icon: Shield },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Changes', href: '/dashboard/changes', icon: BarChart3 },
    { name: 'Progress', href: '/dashboard/progress', icon: TrendingUp }
  ];

  const playerChangesNavigation = [
    { name: 'Alliance Moves', href: '/dashboard/alliance-moves', icon: GitBranch },
    { name: 'Name Changes', href: '/dashboard/name-changes', icon: UserCheck },
    { name: 'Joined Realm', href: '/dashboard/joined-realm', icon: UserPlus },
    { name: 'Left Realm', href: '/dashboard/left-realm', icon: UserX }
  ];

  const adminNavigation = [
    { name: 'Players', href: '/dashboard/players', icon: Users },
    { name: 'Upload Data', href: '/dashboard/upload', icon: Upload },
    { name: 'Manage Users', href: '/dashboard/admin/users', icon: UserCheck },
    { name: 'Manage Seasons', href: '/dashboard/admin/seasons', icon: Calendar }
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
    <SeasonProvider>
      <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 transition-all duration-300 flex-shrink-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <h1 className={`text-xl font-bold text-white transition-opacity duration-300 mb-3 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
              Player Tracker
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`
                flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors w-full
                text-gray-300 hover:bg-gray-700 hover:text-white
                ${!sidebarOpen ? 'justify-center' : ''}
              `}
              title={!sidebarOpen ? (sidebarOpen ? 'Collapse Menu' : 'Expand Menu') : undefined}
            >
              {sidebarOpen ? <X className="w-5 h-5 flex-shrink-0" /> : <Menu className="w-5 h-5 flex-shrink-0" />}
              <span className={`ml-3 transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
                {sidebarOpen ? 'Collapse Menu' : 'Expand Menu'}
              </span>
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
                    ${!sidebarOpen ? 'justify-center' : ''}
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

            {/* Player Changes Section */}
            <div className="my-4 border-t border-gray-700" />
            <div className={`px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
              Player Changes
            </div>
            {playerChangesNavigation.map((item) => {
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
                    ${!sidebarOpen ? 'justify-center' : ''}
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
                        ${!sidebarOpen ? 'justify-center' : ''}
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
            <div className={`transition-opacity duration-300 mb-3 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
              <p className="text-sm text-white truncate">{session?.user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize">{session?.user?.role?.toLowerCase() || 'viewer'}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className={`
                flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors w-full
                text-gray-300 hover:bg-gray-700 hover:text-white
                ${!sidebarOpen ? 'justify-center' : ''}
              `}
              title={!sidebarOpen ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={`ml-3 transition-opacity duration-300 ${!sidebarOpen && 'opacity-0 w-0 overflow-hidden'}`}>
                Sign Out
              </span>
            </button>
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
                {(() => {
                  if (pathname === '/dashboard/alliance') return 'Alliance Dashboard';
                  if (pathname === '/dashboard/players') return 'Player Database';
                  if (pathname === '/dashboard/progress') return 'Progress Tracking';
                  if (pathname === '/dashboard/leaderboard') return 'Leaderboards';
                  if (pathname === '/dashboard/changes') return 'Change Analysis';
                  if (pathname === '/dashboard/alliance-moves') return 'Alliance Moves';
                  if (pathname === '/dashboard/name-changes') return 'Name Changes';
                  if (pathname === '/dashboard/left-realm') return 'Left Realm';
                  if (pathname === '/dashboard/upload') return 'Data Upload';
                  if (pathname === '/dashboard/admin/users') return 'User Management';
                  if (pathname === '/dashboard/admin/seasons') return 'Season Management';
                  if (pathname.startsWith('/dashboard/player/')) return 'Player Profile';
                  if (!pathname.includes('/dashboard/')) return 'Dashboard';
                  return 'Dashboard';
                })()}
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
    </SeasonProvider>
  );
}