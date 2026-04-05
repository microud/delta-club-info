import { useEffect, useState } from 'react'
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
import { getClubs } from '@/lib/api'
import { promotionFormSchema, type PromotionFormValues } from '../data/schema'

type ClubOption = {
  id: string
  name: string
}

type PromotionFormProps = {
  onSubmit: (data: PromotionFormValues) => void
  isSubmitting?: boolean
}

export function PromotionForm({ onSubmit, isSubmitting }: PromotionFormProps) {
  const [clubs, setClubs] = useState<ClubOption[]>([])

  useEffect(() => {
    getClubs({ page: 1, pageSize: 200 }).then((res) => {
      setClubs(
        res.data.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }))
      )
    })
  }, [])

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      clubId: '',
      fee: 0,
      startAt: '',
      endAt: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
        <FormField
          control={form.control}
          name='clubId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>俱乐部 *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='请选择俱乐部' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='fee'
          render={({ field }) => (
            <FormItem>
              <FormLabel>费用 *</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  min={0}
                  step={0.01}
                  placeholder='请输入费用'
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-4 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='startAt'
            render={({ field }) => (
              <FormItem>
                <FormLabel>开始日期 *</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='endAt'
            render={({ field }) => (
              <FormItem>
                <FormLabel>结束日期 *</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
