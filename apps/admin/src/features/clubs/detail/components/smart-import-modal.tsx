import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ClubServiceDto } from '@delta-club/shared'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Upload, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { aiImportServices, batchCreateClubServices } from '@/lib/api'
import { serviceTypes, serviceTypeLabels } from '../../data/service-schema'

type ParsedService = {
  type: string
  gameName: string
  priceYuan: string
  hasGuarantee: boolean
  guaranteeHafuCoin: string
  rules: string
}

type SmartImportModalProps = {
  clubId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
  existingServices: ClubServiceDto[]
}

export function SmartImportModal({
  clubId,
  open,
  onOpenChange,
  onImported,
  existingServices,
}: SmartImportModalProps) {
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [textContent, setTextContent] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedServices, setParsedServices] = useState<ParsedService[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('input')
    setImages([])
    setTextContent('')
    setParsing(false)
    setParsedServices([])
    setImporting(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const newImages = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setImages((prev) => [...prev, ...newImages])
  }, [])

  const removeImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      addFiles(files)
    },
    [addFiles],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files)
      if (files.length > 0) {
        e.preventDefault()
        addFiles(files)
      }
    },
    [addFiles],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    addFiles(files)
    e.target.value = ''
  }

  const handleParse = async () => {
    if (images.length === 0 && !textContent.trim()) {
      toast.error('请至少添加一张图片或输入文本')
      return
    }

    try {
      setParsing(true)
      const result = await aiImportServices(clubId, {
        files: images.map((img) => img.file),
        textContent: textContent.trim() || undefined,
      })

      const services: ParsedService[] = []
      for (const svc of result.services) {
        for (const tier of svc.tiers) {
          services.push({
            type: 'ESCORT_FUN',
            gameName: svc.name,
            priceYuan: tier.price.toString(),
            hasGuarantee: !!tier.guarantee,
            guaranteeHafuCoin: tier.guarantee?.replace(/[^0-9.]/g, '') ?? '',
            rules: tier.note ?? '',
          })
        }
      }

      setParsedServices(services)
      setStep('result')
    } catch {
      toast.error('AI 解析失败，请重试')
    } finally {
      setParsing(false)
    }
  }

  const updateParsedService = (index: number, field: keyof ParsedService, value: string | boolean) => {
    setParsedServices((prev) =>
      prev.map((svc, i) => (i === index ? { ...svc, [field]: value } : svc)),
    )
  }

  const removeParsedService = (index: number) => {
    setParsedServices((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    if (parsedServices.length === 0) {
      toast.error('没有可导入的服务')
      return
    }

    try {
      setImporting(true)
      await batchCreateClubServices(
        clubId,
        parsedServices.map((svc, i) => ({
          type: svc.type,
          gameName: svc.gameName,
          priceYuan: svc.priceYuan ? parseFloat(svc.priceYuan) : undefined,
          hasGuarantee: svc.hasGuarantee,
          guaranteeHafuCoin: svc.guaranteeHafuCoin ? parseFloat(svc.guaranteeHafuCoin) : undefined,
          rules: svc.rules || undefined,
          sortOrder: i,
        })),
      )
      toast.success(`成功导入 ${parsedServices.length} 条服务`)
      handleOpenChange(false)
      onImported()
    } catch {
      toast.error('批量导入失败')
    } finally {
      setImporting(false)
    }
  }

  const isDuplicate = (svc: ParsedService) =>
    existingServices.some(
      (existing) => existing.type === svc.type && existing.gameName === svc.gameName,
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className='sm:max-w-2xl max-h-[80vh] overflow-y-auto'
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='h-5 w-5' />
            智能录入
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? '添加俱乐部价目表图片或文本，AI 将自动解析服务信息。'
              : '确认解析结果，可编辑后批量导入。'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className='space-y-4'>
            <div
              className='border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors'
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className='h-8 w-8 mx-auto mb-2 text-muted-foreground' />
              <p className='text-sm text-muted-foreground'>
                拖拽图片到此处、从剪切板粘贴、或点击选择文件
              </p>
              <p className='text-xs text-muted-foreground mt-1'>支持多张图片</p>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                accept='image/*'
                className='hidden'
                onChange={handleFileSelect}
              />
            </div>

            {images.length > 0 && (
              <div className='grid grid-cols-4 gap-2'>
                {images.map((img, i) => (
                  <div key={i} className='relative group'>
                    <img
                      src={img.preview}
                      alt={`预览 ${i + 1}`}
                      className='w-full h-24 object-cover rounded border'
                    />
                    <button
                      type='button'
                      className='absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(i)
                      }}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              placeholder='可选：粘贴文本内容...'
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={3}
            />

            <div className='flex justify-end'>
              <Button
                onClick={handleParse}
                disabled={parsing || (images.length === 0 && !textContent.trim())}
              >
                {parsing ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    解析中...
                  </>
                ) : (
                  '开始解析'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className='space-y-4'>
            {parsedServices.length === 0 ? (
              <p className='text-muted-foreground py-8 text-center'>未解析出任何服务信息</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>服务类型</TableHead>
                    <TableHead>玩法名称</TableHead>
                    <TableHead>价格(元)</TableHead>
                    <TableHead>保底(万哈夫币)</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className='w-12'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedServices.map((svc, i) => (
                    <TableRow
                      key={i}
                      className={isDuplicate(svc) ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                    >
                      <TableCell>
                        <Select
                          value={svc.type}
                          onValueChange={(value) => updateParsedService(i, 'type', value)}
                        >
                          <SelectTrigger className='h-8 w-32'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceTypes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {serviceTypeLabels[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.gameName}
                          onChange={(e) => updateParsedService(i, 'gameName', e.target.value)}
                          className='h-8'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.priceYuan}
                          onChange={(e) => updateParsedService(i, 'priceYuan', e.target.value)}
                          className='h-8 w-20'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.guaranteeHafuCoin}
                          onChange={(e) =>
                            updateParsedService(i, 'guaranteeHafuCoin', e.target.value)
                          }
                          className='h-8 w-24'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.rules}
                          onChange={(e) => updateParsedService(i, 'rules', e.target.value)}
                          className='h-8'
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => removeParsedService(i)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {parsedServices.some(isDuplicate) && (
              <p className='text-xs text-yellow-600'>
                黄色标记的服务与现有服务类型和名称重复
              </p>
            )}

            <div className='flex justify-between'>
              <Button variant='outline' onClick={() => setStep('input')}>
                返回修改
              </Button>
              <Button onClick={handleImport} disabled={importing || parsedServices.length === 0}>
                {importing ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    导入中...
                  </>
                ) : (
                  `确认导入 (${parsedServices.length})`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
