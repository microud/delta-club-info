import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { bloggerFormSchema, type BloggerFormValues } from '../data/schema'

type BloggerFormProps = {
  onSubmit: (data: BloggerFormValues) => void
  isSubmitting?: boolean
}

export function BloggerForm({ onSubmit, isSubmitting }: BloggerFormProps) {
  const form = useForm<BloggerFormValues>({
    resolver: zodResolver(bloggerFormSchema),
    defaultValues: {
      platform: 'BILIBILI',
      externalId: '',
      name: '',
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
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='externalId'
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
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>博主名称</FormLabel>
              <FormControl>
                <Input placeholder='博主昵称' {...field} />
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
