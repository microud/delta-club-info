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
import { showSubmittedData } from '@/lib/show-submitted-data'

const aiConfigFormSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'deepseek']),
  apiKey: z.string().min(1, '请输入 API Key'),
  baseUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  model: z.string().min(1, '请输入模型名称'),
})

type AiConfigFormValues = z.infer<typeof aiConfigFormSchema>

export function AiConfigForm() {
  const form = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigFormSchema),
    defaultValues: {
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      model: '',
    },
  })

  function onSubmit(data: AiConfigFormValues) {
    showSubmittedData(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
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
                  <SelectItem value='deepseek'>DeepSeek</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                选择 AI 服务提供商。
              </FormDescription>
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
              <FormDescription>
                AI 服务商提供的 API 密钥。
              </FormDescription>
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
              <FormDescription>
                指定使用的模型名称。
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
