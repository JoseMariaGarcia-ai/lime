import { NavLink } from 'react-router-dom'
import { Users, MessageCircle, Calendar, Workflow, Settings, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/authStore'
import logo from '../../assets/logo.png'

const NAV_ITEMS = [
  { to: '/', label: 'Clientes', icon: Users },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-navy-700 bg-navy-900">
      <div className="flex items-center gap-2 px-4 py-5">
        <img src={logo} alt="Lime AI Studio" className="h-8 w-auto" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-lime-500/15 text-lime-400' : 'text-navy-300 hover:bg-navy-800 hover:text-navy-50'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-navy-700 p-4">
        <p className="truncate text-sm font-medium text-navy-100">{user?.name}</p>
        <p className="truncate text-xs text-navy-400">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-sm text-navy-400 hover:text-red-400"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
