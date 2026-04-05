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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AiConfigDto } from '@delta-club/shared'

const aiConfigFormSchema = z.object({
  name: z.string().min(1, '请输入配置名称'),
  provider: z.enum(['openai', 'anthropic', 'xai', 'deepseek']),
  apiKey: z.string().min(1, '请输入 API Key'),
  baseUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  model: z.string().min(1, '请输入模型名称'),
})

export type AiConfigFormValues = z.infer<typeof aiConfigFormSchema>

interface AiConfigFormProps {
  defaultValues?: AiConfigDto
  onSubmit: (data: AiConfigFormValues) => void
  isSubmitting?: boolean
}

export function AiConfigForm({ defaultValues, onSubmit, isSubmitting }: AiConfigFormProps) {
  const form = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      provider: (defaultValues?.provider as AiConfigFormValues['provider']) ?? 'openai',
      apiKey: defaultValues?.apiKey ?? '',
      baseUrl: defaultValues?.baseUrl ?? '',
      model: defaultValues?.model ?? '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>配置名称</FormLabel>
              <FormControl>
                <Input placeholder='如：图片解析-xAI' {...field} />
              </FormControl>
              <FormDescription>
                为这个配置起一个便于识别的名称。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='provider'
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI 服务商</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue placeholder='选择服务商' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='openai'>OpenAI</SelectItem>
                  <SelectItem value='anthropic'>Anthropic</SelectItem>
                  <SelectItem value='xai'>xAI</SelectItem>
                  <SelectItem value='deepseek'>DeepSeek</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='apiKey'
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input type='password' placeholder='sk-••••••••' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='baseUrl'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base URL（可选）</FormLabel>
              <FormControl>
                <Input placeholder='https://api.openai.com/v1' {...field} />
              </FormControl>
              <FormDescription>
                自定义 API 端点地址，留空使用默认地址。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='model'
          render={({ field }) => (
            <FormItem>
              <FormLabel>模型</FormLabel>
              <FormControl>
                <Input placeholder='gpt-4o' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex justify-end'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
