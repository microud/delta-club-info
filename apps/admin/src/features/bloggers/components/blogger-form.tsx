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
import { bloggerFormSchema, type BloggerFormValues } from '../data/schema'

type BloggerFormProps = {
  onSubmit: (data: BloggerFormValues) => void
  isSubmitting?: boolean
}

export function BloggerForm({ onSubmit, isSubmitting }: BloggerFormProps) {
  const form = useForm<BloggerFormValues>({
    resolver: zodResolver(bloggerFormSchema),
    defaultValues: {
      name: '',
      avatar: '',
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
              <FormLabel>博主名称</FormLabel>
              <FormControl>
                <Input placeholder='博主昵称' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='avatar'
          render={({ field }) => (
            <FormItem>
              <FormLabel>头像 URL (可选)</FormLabel>
              <FormControl>
                <Input placeholder='https://...' {...field} />
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
