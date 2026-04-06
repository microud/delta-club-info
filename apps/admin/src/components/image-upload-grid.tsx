import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/api'
import { X, Upload, Loader2, ClipboardPaste } from 'lucide-react'

type ImageUploadGridProps = {
  value?: string[]
  onChange: (urls: string[]) => void
  columns?: string
}

export function ImageUploadGrid({
  value = [],
  onChange,
  columns = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
}: ImageUploadGridProps) {
  const [uploading, setUploading] = useState(false)
  const [pendingPreviews, setPendingPreviews] = useState<{ id: string; preview: string }[]>([])

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) return

      // Show local previews immediately
      const previews = imageFiles.map((file) => ({
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
      }))
      setPendingPreviews((prev) => [...prev, ...previews])
      setUploading(true)

      try {
        for (let i = 0; i < imageFiles.length; i++) {
          const { url } = await uploadFile(imageFiles[i])
          // Remove preview and add real URL
          setPendingPreviews((prev) => prev.filter((p) => p.id !== previews[i].id))
          URL.revokeObjectURL(previews[i].preview)
          onChange([...value, url])
          // Update value reference for next iteration
          value = [...value, url]
        }
      } catch {
        // Clean up remaining previews on error
        previews.forEach((p) => URL.revokeObjectURL(p.preview))
        setPendingPreviews([])
      } finally {
        setUploading(false)
      }
    },
    [value, onChange],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.items)
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
      if (files.length > 0) {
        e.preventDefault()
        uploadFiles(files)
      }
    },
    [uploadFiles],
  )

  const handleRemove = useCallback(
    (index: number) => {
      const next = [...value]
      next.splice(index, 1)
      onChange(next)
    },
    [value, onChange],
  )

  return (
    <div className='space-y-3 outline-none' onPaste={handlePaste} tabIndex={0}>
      {(value.length > 0 || pendingPreviews.length > 0) && (
        <div className={`grid gap-3 ${columns}`}>
          {value.map((url, index) => (
            <div
              key={`${index}-${url}`}
              className='group relative aspect-[3/4] overflow-hidden rounded-lg border'
            >
              <img src={url} alt={`图片 ${index + 1}`} className='h-full w-full object-cover' />
              <button
                type='button'
                className='absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100'
                onClick={() => handleRemove(index)}
              >
                <X className='h-3 w-3' />
              </button>
            </div>
          ))}
          {pendingPreviews.map((p) => (
            <div
              key={p.id}
              className='relative aspect-[3/4] overflow-hidden rounded-lg border opacity-50'
            >
              <img src={p.preview} alt='上传中' className='h-full w-full object-cover' />
              <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                <Loader2 className='h-6 w-6 animate-spin text-white' />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={uploading}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.multiple = true
            input.onchange = () => {
              if (input.files) uploadFiles(Array.from(input.files))
            }
            input.click()
          }}
        >
          {uploading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Upload className='mr-2 h-4 w-4' />
          )}
          {uploading ? '上传中...' : '上传图片'}
        </Button>
        <span className='flex items-center gap-1 text-xs text-muted-foreground'>
          <ClipboardPaste className='h-3 w-3' />
          支持粘贴图片
        </span>
      </div>
    </div>
  )
}
