import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCrawlFrequency, updateCrawlFrequency } from '@/lib/api'

export function FrequencyConfig() {
  const [frequency, setFrequency] = useState<number>(60)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCrawlFrequency()
      .then((data) => setFrequency(data.frequency))
      .catch(() => toast.error('获取频率配置失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
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

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>抓取频率</CardTitle>
        <CardDescription>设置爬虫自动抓取的间隔时间</CardDescription>
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
          <Button onClick={handleSave} disabled={saving} size='sm'>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
