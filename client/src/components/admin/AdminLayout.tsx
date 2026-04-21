import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users } from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Přehled', exact: true },
  { to: '/admin/uzivatele', icon: Users, label: 'Uživatelé' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
      <nav className="w-56 shrink-0">
        <div className="bg-white rounded-xl shadow p-4 space-y-1 sticky top-4">
          <h2 className="font-bold text-gray-800 text-lg mb-3">Administrace</h2>
          {navItems.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
                  ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
