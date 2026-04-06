import { useState, useCallback } from 'react'
import { uploadFile } from '@/lib/api'
import { X, Plus, Loader2 } from 'lucide-react'

type ImageUploadGridProps = {
  value?: string[]
  onChange: (urls: string[]) => void
  columns?: string
}

export function ImageUploadGrid({
  value = [],
  onChange,
  columns = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5',
}: ImageUploadGridProps) {
  const [uploading, setUploading] = useState(false)
  const [pendingPreviews, setPendingPreviews] = useState<{ id: string; preview: string }[]>([])

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) return

      const previews = imageFiles.map((file) => ({
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
      }))
      setPendingPreviews((prev) => [...prev, ...previews])
      setUploading(true)

      try {
        let current = value
        for (let i = 0; i < imageFiles.length; i++) {
          const { url } = await uploadFile(imageFiles[i])
          setPendingPreviews((prev) => prev.filter((p) => p.id !== previews[i].id))
          URL.revokeObjectURL(previews[i].preview)
          current = [...current, url]
          onChange(current)
        }
      } catch {
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

  const handleClickAdd = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => {
      if (input.files) uploadFiles(Array.from(input.files))
    }
    input.click()
  }

  return (
    <div
      className='rounded-lg border border-dashed p-3 outline-none'
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div className={`grid gap-3 ${columns}`}>
        {value.map((url, index) => (
          <div
            key={`${index}-${url}`}
            className='group relative aspect-square overflow-hidden rounded-md border'
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
            className='relative aspect-square overflow-hidden rounded-md border opacity-50'
          >
            <img src={p.preview} alt='上传中' className='h-full w-full object-cover' />
            <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
              <Loader2 className='h-5 w-5 animate-spin text-white' />
            </div>
          </div>
        ))}

        <button
          type='button'
          disabled={uploading}
          onClick={handleClickAdd}
          className='flex aspect-square items-center justify-center rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50'
        >
          {uploading ? (
            <Loader2 className='h-6 w-6 animate-spin' />
          ) : (
            <Plus className='h-6 w-6' />
          )}
        </button>
      </div>
    </div>
  )
}
