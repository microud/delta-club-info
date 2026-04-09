import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: ReactNode
  subtext?: ReactNode
  icon?: ReactNode
  highlight?: 'warning' | 'danger'
}

export function StatCard({ title, value, subtext, icon, highlight }: StatCardProps) {
  return (
    <Card
      className={cn(
        highlight === 'warning' && 'border-warning/50',
        highlight === 'danger' && 'border-destructive/50',
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon && <div className='h-4 w-4 text-muted-foreground'>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {subtext && (
          <p className='text-xs text-muted-foreground'>{subtext}</p>
        )}
      </CardContent>
    </Card>
  )
}
