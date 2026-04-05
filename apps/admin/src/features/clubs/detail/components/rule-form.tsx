import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import {
  ruleFormSchema,
  type RuleFormValues,
  sentiments,
  sentimentLabels,
} from '../../data/rule-schema'

type RuleFormProps = {
  initialData?: RuleFormValues
  onSubmit: (data: RuleFormValues) => void
  isSubmitting?: boolean
}

export function RuleForm({ initialData, onSubmit, isSubmitting }: RuleFormProps) {
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: initialData ?? {
      content: '',
      sentiment: 'NEUTRAL',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
        <FormField
          control={form.control}
          name='content'
          render={({ field }) => (
            <FormItem>
              <FormLabel>规则内容 *</FormLabel>
              <FormControl>
                <Textarea placeholder='请输入规则内容' rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='sentiment'
          render={({ field }) => (
            <FormItem>
              <FormLabel>倾向性</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='请选择倾向性' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sentiments.map((s) => (
                    <SelectItem key={s} value={s}>
                      {sentimentLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
