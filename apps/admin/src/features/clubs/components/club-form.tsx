import { useState } from 'react'
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
import { fetchWechatAvatar } from '@/lib/api'

type ClubFormProps = {
  initialData?: ClubFormValues
  onSubmit: (data: ClubFormValues) => void
  isSubmitting?: boolean
}

export function ClubForm({ initialData, onSubmit, isSubmitting }: ClubFormProps) {
  const [isFetchingAvatar, setIsFetchingAvatar] = useState(false)
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
      companyName: '',
      creditCode: '',
      legalPerson: '',
      registeredAddress: '',
      businessScope: '',
      registeredCapital: '',
      companyEstablishedAt: '',
      businessStatus: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        const cleaned = {
          ...data,
          establishedAt: data.establishedAt || null,
          companyEstablishedAt: data.companyEstablishedAt || null,
        }
        onSubmit(cleaned as ClubFormValues)
      })} className='grid gap-4'>
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
              <div className='flex gap-2'>
                <FormControl>
                  <Input placeholder='请输入 Logo 链接' {...field} />
                </FormControl>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={!form.watch('wechatOfficialAccount') || isFetchingAvatar}
                  onClick={async () => {
                    const account = form.getValues('wechatOfficialAccount')
                    if (!account) return
                    setIsFetchingAvatar(true)
                    try {
                      const { logoUrl } = await fetchWechatAvatar(account)
                      form.setValue('logo', logoUrl)
                    } catch {
                      // toast error
                    } finally {
                      setIsFetchingAvatar(false)
                    }
                  }}
                >
                  {isFetchingAvatar ? '获取中...' : '获取公众号头像'}
                </Button>
              </div>
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
                <Input type='date' {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='space-y-4 border-t pt-4'>
          <h3 className='text-sm font-medium'>工商信息</h3>

          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField control={form.control} name='companyName' render={({ field }) => (
              <FormItem>
                <FormLabel>公司全称</FormLabel>
                <FormControl><Input placeholder='请输入公司全称' {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name='creditCode' render={({ field }) => (
              <FormItem>
                <FormLabel>统一社会信用代码</FormLabel>
                <FormControl><Input placeholder='请输入信用代码' {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField control={form.control} name='legalPerson' render={({ field }) => (
              <FormItem>
                <FormLabel>法人</FormLabel>
                <FormControl><Input placeholder='请输入法人姓名' {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name='businessStatus' render={({ field }) => (
              <FormItem>
                <FormLabel>经营状态</FormLabel>
                <FormControl><Input placeholder='如：存续、注销' {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name='registeredAddress' render={({ field }) => (
            <FormItem>
              <FormLabel>注册地址</FormLabel>
              <FormControl><Input placeholder='请输入注册地址' {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField control={form.control} name='registeredCapital' render={({ field }) => (
              <FormItem>
                <FormLabel>注册资本</FormLabel>
                <FormControl><Input placeholder='如：100万元' {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name='companyEstablishedAt' render={({ field }) => (
              <FormItem>
                <FormLabel>公司成立日期</FormLabel>
                <FormControl><Input type='date' {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name='businessScope' render={({ field }) => (
            <FormItem>
              <FormLabel>经营范围</FormLabel>
              <FormControl><Textarea placeholder='请输入经营范围' {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
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
