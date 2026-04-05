import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

const wechatWorkFormSchema = z.object({
  corpId: z.string().min(1, '请输入企业 ID'),
  agentId: z.string().min(1, '请输入应用 AgentId'),
  secret: z.string().min(1, '请输入应用 Secret'),
  token: z.string().optional(),
  encodingAESKey: z.string().optional(),
})

type WechatWorkFormValues = z.infer<typeof wechatWorkFormSchema>

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
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='corpId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>企业 ID (CorpId)</FormLabel>
              <FormControl>
                <Input placeholder='ww1234567890abcdef' {...field} />
              </FormControl>
              <FormDescription>
                企业微信管理后台「我的企业」中的企业 ID。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='agentId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>应用 AgentId</FormLabel>
              <FormControl>
                <Input placeholder='1000002' {...field} />
              </FormControl>
              <FormDescription>
                企业微信自建应用的 AgentId。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='secret'
          render={({ field }) => (
            <FormItem>
              <FormLabel>应用 Secret</FormLabel>
              <FormControl>
                <Input type='password' placeholder='••••••••' {...field} />
              </FormControl>
              <FormDescription>
                企业微信自建应用的 Secret。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='token'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token（可选）</FormLabel>
              <FormControl>
                <Input placeholder='回调 Token' {...field} />
              </FormControl>
              <FormDescription>
                接收消息回调的 Token，用于验证消息签名。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='encodingAESKey'
          render={({ field }) => (
            <FormItem>
              <FormLabel>EncodingAESKey（可选）</FormLabel>
              <FormControl>
                <Input placeholder='消息加解密密钥' {...field} />
              </FormControl>
              <FormDescription>
                接收消息回调的 EncodingAESKey，用于消息加解密。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>保存配置</Button>
      </form>
    </Form>
  )
}
