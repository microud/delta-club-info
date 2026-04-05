import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { AiConfigDto } from '@delta-club/shared'
import {
  getAiConfigs,
  createAiConfig,
  updateAiConfig,
  deleteAiConfig,
  getSystemConfigs,
  updateSystemConfig,
} from '@/lib/api'
import { ContentSection } from '../components/content-section'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AiConfigForm, type AiConfigFormValues } from './ai-config-form'

const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
  deepseek: 'DeepSeek',
}

export function SettingsAi() {
  const [configs, setConfigs] = useState<AiConfigDto[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AiConfigDto | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<AiConfigDto | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [parseConfigId, setParseConfigId] = useState<string>('')

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const [configsData, sysConfigs] = await Promise.all([
        getAiConfigs(),
        getSystemConfigs(),
      ])
      setConfigs(configsData)
      const parseConfig = sysConfigs.find((c) => c.key === 'ai_parse.ai_config_id')
      setParseConfigId(parseConfig?.value ?? '')
    } catch {
      toast.error('获取 AI 配置列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleParseConfigChange = async (value: string) => {
    try {
      await updateSystemConfig('ai_parse.ai_config_id', value)
      setParseConfigId(value)
      toast.success('AI 解析配置已更新')
    } catch {
      toast.error('更新 AI 解析配置失败')
    }
  }

  const handleCreate = () => {
    setEditingConfig(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (config: AiConfigDto) => {
    setEditingConfig(config)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: AiConfigFormValues) => {
    try {
      setSubmitting(true)
      if (editingConfig) {
        await updateAiConfig(editingConfig.id, data)
        toast.success('更新成功')
      } else {
        await createAiConfig(data)
        toast.success('创建成功')
      }
      setDialogOpen(false)
      fetchConfigs()
    } catch {
      toast.error(editingConfig ? '更新失败' : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAiConfig(deleteTarget.id)
      toast.success('删除成功')
      setDeleteTarget(undefined)
      fetchConfigs()
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <ContentSection
      title='AI 配置'
      desc='管理 AI 服务商配置，并为不同业务绑定对应的 AI。'
    >
      <Tabs defaultValue='configs'>
        <TabsList>
          <TabsTrigger value='configs'>配置管理</TabsTrigger>
          <TabsTrigger value='bindings'>业务绑定</TabsTrigger>
        </TabsList>

        <TabsContent value='configs'>
          <div className='space-y-4'>
            <div className='flex justify-end'>
              <Button onClick={handleCreate} size='sm'>
                <Plus className='mr-1 h-4 w-4' />
                新增配置
              </Button>
            </div>

            {loading ? (
              <p className='text-muted-foreground text-sm'>加载中...</p>
            ) : configs.length === 0 ? (
              <p className='text-muted-foreground text-sm'>暂无 AI 配置，请点击「新增配置」添加。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>服务商</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>自定义地址</TableHead>
                    <TableHead className='text-right'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className='font-medium'>{config.name}</TableCell>
                      <TableCell>
                        <Badge variant='secondary'>
                          {providerLabels[config.provider] ?? config.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>{config.model}</TableCell>
                      <TableCell className='max-w-[200px] truncate text-muted-foreground'>
                        {config.baseUrl || '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleEdit(config)}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setDeleteTarget(config)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value='bindings'>
          {loading ? (
            <p className='text-muted-foreground text-sm'>加载中...</p>
          ) : configs.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              请先在「配置管理」中添加 AI 配置。
            </p>
          ) : (
            <div className='divide-y'>
              <div className='flex items-center justify-between gap-8 py-4'>
                <div className='space-y-1'>
                  <Label>AI 解析（智能录入）</Label>
                  <p className='text-muted-foreground text-xs'>
                    用于俱乐部智能录入等图片/文本解析功能
                  </p>
                </div>
                <Select value={parseConfigId} onValueChange={handleParseConfigChange}>
                  <SelectTrigger className='w-[280px] shrink-0'>
                    <SelectValue placeholder='请选择 AI 配置' />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name} ({providerLabels[config.provider] ?? config.provider} / {config.model})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? '编辑 AI 配置' : '新增 AI 配置'}
            </DialogTitle>
          </DialogHeader>
          <AiConfigForm
            key={editingConfig?.id ?? 'new'}
            defaultValues={editingConfig}
            onSubmit={handleSubmit}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除配置「{deleteTarget?.name}」吗？如果有业务正在使用此配置，删除后将导致该业务无法正常工作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContentSection>
  )
}
