import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCrawlConfig, updateCrawlFrequency, setCrawlEnabled } from '@/lib/api'

export function FrequencyConfig() {
  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState<number>(60)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    getCrawlConfig()
      .then((data) => {
        setEnabled(data.enabled)
        setFrequency(data.frequency)
      })
      .catch(() => toast.error('获取爬虫配置失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveFrequency = async () => {
    if (frequency < 1) {
      toast.error('频率不能小于 1 分钟')
      return
    }
    try {
      setSaving(true)
      await updateCrawlFrequency(frequency)
      toast.success('频率已更新')
    } catch {
      toast.error('更新失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    try {
      setToggling(true)
      const next = !enabled
      await setCrawlEnabled(next)
      setEnabled(next)
      toast.success(next ? '定时任务已开启' : '定时任务已关闭')
    } catch {
      toast.error('操作失败')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              爬虫配置
              <Badge variant={enabled ? 'default' : 'secondary'}>
                {enabled ? '已开启' : '已关闭'}
              </Badge>
            </CardTitle>
            <CardDescription>管理爬虫定时任务的开关和抓取频率</CardDescription>
          </div>
          <Button
            variant={enabled ? 'destructive' : 'default'}
            size='sm'
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? '操作中...' : enabled ? '关闭定时' : '开启定时'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-muted-foreground'>每</span>
          <Input
            type='number'
            min={1}
            className='w-24'
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
          />
          <span className='text-sm text-muted-foreground'>分钟执行一次</span>
          <Button onClick={handleSaveFrequency} disabled={saving} size='sm'>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
