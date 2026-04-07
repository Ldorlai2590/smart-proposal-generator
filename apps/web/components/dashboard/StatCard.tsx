import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  iconColor?: string
  iconBg?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = '#2563EB',
  iconBg = '#EFF6FF',
}: StatCardProps) {
  const positive = trend !== undefined && trend >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  )
}
