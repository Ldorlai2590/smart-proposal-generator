import Link from 'next/link'
import { Zap } from 'lucide-react'

const LINKS = {
  Producto: [
    { label: 'Características', href: '#features' },
    { label: 'Precios', href: '#pricing' },
    { label: 'Integraciones', href: '#integrations' },
    { label: 'Changelog', href: '/changelog' },
  ],
  Empresa: [
    { label: 'Sobre nosotros', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contacto', href: 'mailto:hola@smartspg.com' },
  ],
  Legal: [
    { label: 'Términos de uso', href: '/legal/terms' },
    { label: 'Privacidad', href: '/legal/privacy' },
    { label: 'Cookies', href: '/legal/cookies' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-14">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-[#1D9E75]" />
              <span className="font-bold text-gray-900">
                Smart<span className="text-[#1D9E75]">SPG</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Propuestas comerciales con IA para agencias y consultoras en LATAM.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} SmartSPG. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-400">
            Hecho en LATAM · Chile · México · Colombia
          </p>
        </div>
      </div>
    </footer>
  )
}
