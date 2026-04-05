import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { clubFormSchema, type ClubFormValues } from '../data/schema'

type ClubFormProps = {
  initialData?: ClubFormValues
  onSubmit: (data: ClubFormValues) => void
  isSubmitting?: boolean
}

export function ClubForm({ initialData, onSubmit, isSubmitting }: ClubFormProps) {
  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: initialData ?? {
      name: '',
      logo: '',
      description: '',
      wechatOfficialAccount: '',
      wechatMiniProgram: '',
      contactInfo: '',
      establishedAt: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>俱乐部名称 *</FormLabel>
              <FormControl>
                <Input placeholder='请输入俱乐部名称' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='logo'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input placeholder='请输入 Logo 链接' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>简介</FormLabel>
              <FormControl>
                <Textarea placeholder='请输入俱乐部简介' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-4 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='wechatOfficialAccount'
            render={({ field }) => (
              <FormItem>
                <FormLabel>微信公众号</FormLabel>
                <FormControl>
                  <Input placeholder='请输入微信公众号' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='wechatMiniProgram'
            render={({ field }) => (
              <FormItem>
                <FormLabel>微信小程序</FormLabel>
                <FormControl>
                  <Input placeholder='请输入微信小程序' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='contactInfo'
          render={({ field }) => (
            <FormItem>
              <FormLabel>联系方式</FormLabel>
              <FormControl>
                <Input placeholder='请输入联系方式' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='establishedAt'
          render={({ field }) => (
            <FormItem>
              <FormLabel>成立时间</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
