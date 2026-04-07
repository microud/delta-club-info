import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { getSystemConfigs, updateSystemConfig } from '@/lib/api'
import { ContentSection } from '../components/content-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'

const formSchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseUrl: z.string().url('请输入有效的 URL').default('https://api.tikhub.io'),
  rateLimit: z.coerce.number().min(1, '最小值为 1').max(100, '最大值为 100').default(10),
})

type FormValues = z.infer<typeof formSchema>

export function SettingsTikHub() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: '',
      baseUrl: 'https://api.tikhub.io',
      rateLimit: 10,
    },
  })

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const configs = await getSystemConfigs()
      const apiKey = configs.find((c) => c.key === 'tikhub.apiKey')?.value ?? ''
      const baseUrl = configs.find((c) => c.key === 'tikhub.baseUrl')?.value ?? 'https://api.tikhub.io'
      const rateLimit = Number(configs.find((c) => c.key === 'tikhub.rateLimit')?.value ?? '10')
      form.reset({ apiKey, baseUrl, rateLimit })
    } catch {
      toast.error('获取 TikHub 配置失败')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitting(true)
      await Promise.all([
        updateSystemConfig('tikhub.apiKey', data.apiKey),
        updateSystemConfig('tikhub.baseUrl', data.baseUrl),
        updateSystemConfig('tikhub.rateLimit', String(data.rateLimit)),
      ])
      toast.success('TikHub 配置已保存')
    } catch {
      toast.error('保存 TikHub 配置失败')
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    {
      name: 'apiKey' as const,
      label: 'API Key',
      desc: 'TikHub API 密钥，用于访问 TikHub 数据服务。',
      placeholder: '••••••••',
      isPassword: true,
    },
    {
      name: 'baseUrl' as const,
      label: 'API 地址',
      desc: 'TikHub API 基础 URL，默认为 https://api.tikhub.io。',
      placeholder: 'https://api.tikhub.io',
      isPassword: false,
    },
    {
      name: 'rateLimit' as const,
      label: '速率限制',
      desc: '每秒最大请求数，建议根据账号套餐设置，范围 1-100。',
      placeholder: '10',
      isPassword: false,
      type: 'number',
    },
  ] as const

  return (
    <ContentSection title='TikHub 配置' desc='配置 TikHub API 访问参数，用于抖音数据采集。'>
      {loading ? (
        <p className='text-muted-foreground text-sm'>加载中...</p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className='divide-y'>
              {fields.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between gap-8 py-4'>
                      <div className='space-y-1'>
                        <Label>{f.label}</Label>
                        <p className='text-muted-foreground text-xs'>{f.desc}</p>
                        <FormMessage />
                      </div>
                      <FormControl>
                        {f.isPassword ? (
                          <div className='relative w-[280px] shrink-0'>
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              placeholder={f.placeholder}
                              className='pr-10'
                              {...field}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                              onClick={() => setShowApiKey((v) => !v)}
                            >
                              {showApiKey ? (
                                <EyeOff className='h-4 w-4 text-muted-foreground' />
                              ) : (
                                <Eye className='h-4 w-4 text-muted-foreground' />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Input
                            className='w-[280px] shrink-0'
                            type={f.type ?? 'text'}
                            placeholder={f.placeholder}
                            {...(field as React.InputHTMLAttributes<HTMLInputElement>)}
                          />
                        )}
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className='mt-4 flex justify-end'>
              <Button type='submit' disabled={submitting}>
                {submitting ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </ContentSection>
  )
}
