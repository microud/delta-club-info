import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageUploadGrid } from '@/components/image-upload-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  serviceFormSchema,
  type ServiceFormValues,
  serviceTypes,
  serviceTypeLabels,
} from '../../data/service-schema'

type ServiceFormProps = {
  initialData?: ServiceFormValues
  onSubmit: (data: ServiceFormValues) => void
  isSubmitting?: boolean
}

export function ServiceForm({ initialData, onSubmit, isSubmitting }: ServiceFormProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData ?? {
      type: '',
      sortOrder: 0,
      priceYuan: '',
      priceHafuCoin: '',
      tier: '',
      pricePerHour: '',
      gameName: '',
      hasGuarantee: false,
      guaranteeHafuCoin: '',
      rules: '',
      images: [],
    },
  })

  const watchType = form.watch('type')
  const watchHasGuarantee = form.watch('hasGuarantee')

  const showPriceFields = ['KNIFE_RUN', 'ESCORT_TRIAL', 'ESCORT_STANDARD', 'ESCORT_FUN'].includes(watchType)
  const showAccompanyFields = watchType === 'ACCOMPANY'
  const showEscortFunFields = watchType === 'ESCORT_FUN'
  const showGuaranteeFields = ['KNIFE_RUN', 'ESCORT_TRIAL', 'ESCORT_STANDARD', 'ESCORT_FUN'].includes(watchType)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
        <FormField
          control={form.control}
          name='type'
          render={({ field }) => (
            <FormItem>
              <FormLabel>服务类型 *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='请选择服务类型' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {serviceTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {serviceTypeLabels[t]}
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
          name='sortOrder'
          render={({ field }) => (
            <FormItem>
              <FormLabel>排序</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='0'
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showPriceFields && (
          <FormField
            control={form.control}
            name='priceYuan'
            render={({ field }) => (
              <FormItem>
                <FormLabel>价格 (元)</FormLabel>
                <FormControl>
                  <Input placeholder='请输入价格' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showAccompanyFields && (
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='tier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>等级</FormLabel>
                  <FormControl>
                    <Input placeholder='请输入等级' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='pricePerHour'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>每小时价格</FormLabel>
                  <FormControl>
                    <Input placeholder='请输入每小时价格' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {showEscortFunFields && (
          <FormField
            control={form.control}
            name='gameName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>玩法名称</FormLabel>
                <FormControl>
                  <Input placeholder='请输入玩法名称' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showGuaranteeFields && (
          <>
            <FormField
              control={form.control}
              name='hasGuarantee'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center gap-2'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className='!mt-0'>提供保底</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchHasGuarantee && (
              <FormField
                control={form.control}
                name='guaranteeHafuCoin'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>保底哈夫币 (万)</FormLabel>
                    <FormControl>
                      <Input placeholder='请输入保底哈夫币数额（万）' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='rules'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>规则说明</FormLabel>
                  <FormControl>
                    <Textarea placeholder='请输入规则说明' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name='images'
          render={({ field }) => (
            <FormItem>
              <FormLabel>辅助图片</FormLabel>
              <FormControl>
                <ImageUploadGrid
                  value={field.value ?? []}
                  onChange={field.onChange}
                  columns='grid-cols-2 sm:grid-cols-3'
                />
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

