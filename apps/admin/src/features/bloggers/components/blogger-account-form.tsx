import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
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
import { bloggerAccountFormSchema, type BloggerAccountFormValues, categoryLabels } from '../data/schema'

type BloggerAccountFormProps = {
  onSubmit: (data: BloggerAccountFormValues) => void
  isSubmitting?: boolean
}

export function BloggerAccountForm({ onSubmit, isSubmitting }: BloggerAccountFormProps) {
  const form = useForm<BloggerAccountFormValues>({
    resolver: zodResolver(bloggerAccountFormSchema),
    defaultValues: {
      platform: 'BILIBILI',
      platformUserId: '',
      platformUsername: '',
      crawlCategories: [],
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='platform'
          render={({ field }) => (
            <FormItem>
              <FormLabel>平台</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='选择平台' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='BILIBILI'>B站</SelectItem>
                  <SelectItem value='DOUYIN'>抖音</SelectItem>
                  <SelectItem value='XIAOHONGSHU'>小红书</SelectItem>
                  <SelectItem value='WECHAT_CHANNELS'>视频号</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='platformUserId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>平台用户 ID</FormLabel>
              <FormControl>
                <Input placeholder='例如: 12345678' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='platformUsername'
          render={({ field }) => (
            <FormItem>
              <FormLabel>平台用户名 (可选)</FormLabel>
              <FormControl>
                <Input placeholder='博主在该平台的昵称' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='crawlCategories'
          render={() => (
            <FormItem>
              <FormLabel>采集分类</FormLabel>
              <div className='flex gap-4'>
                {(Object.entries(categoryLabels) as [string, string][]).map(([value, label]) => (
                  <FormField
                    key={value}
                    control={form.control}
                    name='crawlCategories'
                    render={({ field }) => (
                      <FormItem className='flex items-center space-x-2 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(value as 'REVIEW' | 'SENTIMENT')}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? []
                              if (checked) {
                                field.onChange([...current, value])
                              } else {
                                field.onChange(current.filter((v) => v !== value))
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal'>{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex justify-end'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '添加账号'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
