import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { showSubmittedData } from '@/lib/show-submitted-data'

const wechatWorkFormSchema = z.object({
  corpId: z.string().min(1, '请输入企业 ID'),
  agentId: z.string().min(1, '请输入应用 AgentId'),
  secret: z.string().min(1, '请输入应用 Secret'),
  token: z.string().optional(),
  encodingAESKey: z.string().optional(),
})

type WechatWorkFormValues = z.infer<typeof wechatWorkFormSchema>

const fields = [
  { name: 'corpId' as const, label: '企业 ID (CorpId)', desc: '企业微信管理后台「我的企业」中的企业 ID。', placeholder: 'ww1234567890abcdef' },
  { name: 'agentId' as const, label: '应用 AgentId', desc: '企业微信自建应用的 AgentId。', placeholder: '1000002' },
  { name: 'secret' as const, label: '应用 Secret', desc: '企业微信自建应用的 Secret。', placeholder: '••••••••', type: 'password' },
  { name: 'token' as const, label: 'Token（可选）', desc: '接收消息回调的 Token，用于验证消息签名。', placeholder: '回调 Token' },
  { name: 'encodingAESKey' as const, label: 'EncodingAESKey（可选）', desc: '接收消息回调的 EncodingAESKey，用于消息加解密。', placeholder: '消息加解密密钥' },
] as const

export function WechatWorkForm() {
  const form = useForm<WechatWorkFormValues>({
    resolver: zodResolver(wechatWorkFormSchema),
    defaultValues: {
      corpId: '',
      agentId: '',
      secret: '',
      token: '',
      encodingAESKey: '',
    },
  })

  function onSubmit(data: WechatWorkFormValues) {
    showSubmittedData(data)
  }

  return (
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
                    <Input
                      className='w-[280px] shrink-0'
                      type={f.type ?? 'text'}
                      placeholder={f.placeholder}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
        <div className='mt-4 flex justify-end'>
          <Button type='submit'>保存配置</Button>
        </div>
      </form>
    </Form>
  )
}
