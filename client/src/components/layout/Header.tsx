import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Train, User, LogOut, Heart, Shield } from 'lucide-react';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="bg-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold hover:text-blue-200">
          <Train size={28} />
          <span>ComfortTravel CZ</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isAdmin ? (
            <>
              <Link to="/admin" className="hover:text-blue-200 flex items-center gap-1">
                <Shield size={18} /> Administrace
              </Link>
              <Link to="/admin/uzivatele" className="hover:text-blue-200">Uživatelé</Link>
              <button onClick={logout} className="hover:text-blue-200 flex items-center gap-1">
                <LogOut size={18} /> Odhlásit
              </button>
            </>
          ) : user ? (
            <>
              <Link to="/oblibene" className="hover:text-blue-200 flex items-center gap-1">
                <Heart size={18} /> Oblíbené
              </Link>
              <Link to="/profil" className="hover:text-blue-200 flex items-center gap-1">
                <User size={18} /> {user.first_name || user.email}
              </Link>
              <button onClick={logout} className="hover:text-blue-200 flex items-center gap-1">
                <LogOut size={18} /> Odhlásit
              </button>
            </>
          ) : (
            <>
              <Link to="/prihlaseni" className="hover:text-blue-200">Přihlášení</Link>
              <Link to="/registrace" className="bg-white text-blue-700 px-4 py-1.5 rounded-lg font-medium hover:bg-blue-50">
                Registrace
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
