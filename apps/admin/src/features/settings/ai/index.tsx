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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
      desc='管理多个 AI 服务商配置，在不同业务中使用不同的 AI。'
    >
      <div className='space-y-6'>
        {!loading && configs.length > 0 && (
          <div className='space-y-2'>
            <Label>AI 解析使用的配置</Label>
            <Select value={parseConfigId} onValueChange={handleParseConfigChange}>
              <SelectTrigger className='w-[300px]'>
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
            <p className='text-muted-foreground text-xs'>
              用于俱乐部智能录入等图片/文本解析功能
            </p>
          </div>
        )}

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
          <div className='grid gap-3'>
            {configs.map((config) => (
              <Card key={config.id}>
                <CardHeader className='flex flex-row items-center justify-between pb-2'>
                  <CardTitle className='text-base font-medium'>
                    {config.name}
                  </CardTitle>
                  <div className='flex items-center gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => handleEdit(config)}
                    >
                      <Pencil className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-destructive'
                      onClick={() => setDeleteTarget(config)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Badge variant='secondary'>
                    {providerLabels[config.provider] ?? config.provider}
                  </Badge>
                  <span>{config.model}</span>
                  {config.baseUrl && (
                    <span className='truncate max-w-[200px]'>{config.baseUrl}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
