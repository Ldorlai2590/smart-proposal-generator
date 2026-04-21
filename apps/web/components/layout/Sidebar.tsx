'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  ChevronLeft,
  Zap,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proposals', label: 'Propuestas', icon: FileText },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/analytics', label: 'Analítica', icon: BarChart3 },
  { href: '/billing', label: 'Facturación', icon: CreditCard },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('spg-sidebar-collapsed')
    if (stored !== null) setCollapsed(JSON.parse(stored))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? null)
        const name = data.user.user_metadata?.full_name
          ?? data.user.email?.split('@')[0]
          ?? null
        setUserName(name)
      }
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('spg-sidebar-collapsed', JSON.stringify(next))
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'relative h-screen bg-[#0F172A] border-r border-[#1E293B] transition-all duration-200 flex-shrink-0 no-print',
        'hidden md:flex md:flex-col',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#1E293B] flex-shrink-0">
        {collapsed ? (
          <Zap className="h-6 w-6 text-[#1D9E75] mx-auto" />
        ) : (
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#1D9E75]" />
            <span className="font-bold text-white text-base tracking-tight">
              Smart<span className="text-[#1D9E75]">SPG</span>
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#1E293B] text-white border-l-[3px] border-[#1D9E75] pl-[9px]'
                  : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC] border-l-[3px] border-transparent pl-[9px]',
                collapsed && 'justify-center pl-0 border-l-0',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  active ? 'text-[#1D9E75]' : 'text-[#94A3B8]',
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-[#1E293B] space-y-3 flex-shrink-0">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2 px-1')}>
          <div className="h-8 w-8 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
            {userName ? (
              <span className="text-xs font-bold text-white leading-none">
                {userName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              {userName && (
                <span className="text-xs text-[#F8FAFC] truncate font-medium leading-tight">
                  {userName}
                </span>
              )}
              {userEmail && (
                <span className="text-[10px] text-[#94A3B8] truncate leading-tight">
                  {userEmail}
                </span>
              )}
            </div>
          )}
        </div>

        {!collapsed && userEmail && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] rounded-lg transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded-lg transition-colors"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  )
}
