import { Routes, Route, NavLink } from 'react-router-dom'
import { Home, TrendingUp, List, Bell } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Trends from './pages/Trends'
import Listings from './pages/Listings'
import Alerts from './pages/Alerts'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/listings', label: 'Listings', icon: List },
  { to: '/alerts', label: 'Alerts', icon: Bell },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-8">
          <span className="text-lg font-semibold text-slate-800">DBRealtor</span>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </main>
    </div>
  )
}
