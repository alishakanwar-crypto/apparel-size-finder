import { Link, useLocation } from 'react-router-dom';
import { Ruler, Users, Settings, Shirt, Scan, Target } from 'lucide-react';

const links = [
  { to: '/', label: 'Measure', icon: Ruler },
  { to: '/ai-measure', label: 'AI Detect', icon: Scan },
  { to: '/calibration', label: 'Calibrate', icon: Target },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/sizes', label: 'Size Chart', icon: Settings },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl no-underline">
            <Shirt className="w-7 h-7" />
            <span>SizeFit</span>
          </Link>
          <div className="flex gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                  pathname === to
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
