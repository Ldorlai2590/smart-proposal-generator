'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Zap,
  User,
  LogOut,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'


const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proposals', label: 'Propuestas', icon: FileText },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/analytics', label: 'Analítica', icon: BarChart3 },
  { href: '/billing', label: 'Facturación', icon: CreditCard },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Close sheet on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUserName(data.user.name)
          setUserEmail(data.user.email)
        }
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/sign-in'
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[#0F172A] border-b border-[#1E293B] text-[#F8FAFC] no-print"
      role="banner"
    >
      <Link href="/dashboard" className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-[#1D9E75]" aria-hidden="true" />
        <span className="font-bold text-base tracking-tight">
          Smart<span className="text-[#1D9E75]">SPG</span>
        </span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="Abrir menú de navegación"
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-[#F8FAFC] hover:bg-[#1E293B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
            />
          }
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-[82%] max-w-[320px] bg-[#0F172A] text-[#F8FAFC] border-[#1E293B] p-0 gap-0"
          showCloseButton={false}
        >
          {/* a11y titles — hidden visually but present for screen readers */}
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SheetDescription className="sr-only">
            Navegación principal de SmartSPG
          </SheetDescription>

          {/* Header with logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E293B] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#1D9E75]" aria-hidden="true" />
              <span className="font-bold text-white text-base tracking-tight">
                Smart<span className="text-[#1D9E75]">SPG</span>
              </span>
            </div>
            <SheetClose
              render={
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
                />
              }
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </SheetClose>
          </div>

          {/* Navigation */}
          <nav
            aria-label="Navegación principal"
            className="flex-1 p-3 space-y-0.5 overflow-y-auto"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]',
                    active
                      ? 'bg-[#1E293B] text-white border-l-[3px] border-[#1D9E75] pl-[9px]'
                      : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC] border-l-[3px] border-transparent pl-[9px]',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      active ? 'text-[#1D9E75]' : 'text-[#94A3B8]',
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom section — user + logout */}
          <div className="p-4 border-t border-[#1E293B] space-y-3 flex-shrink-0">
            <div className="flex items-center gap-3 px-1">
              <div className="h-9 w-9 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
                {userName ? (
                  <span className="text-sm font-bold text-white leading-none">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-4 w-4 text-white" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                {userName && (
                  <span className="text-sm text-[#F8FAFC] truncate font-medium leading-tight">
                    {userName}
                  </span>
                )}
                {userEmail && (
                  <span className="text-xs text-[#94A3B8] truncate leading-tight">
                    {userEmail}
                  </span>
                )}
              </div>
            </div>

            {userName && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Cerrar sesión
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
