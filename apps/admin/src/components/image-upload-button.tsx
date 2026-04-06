import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/api'
import { Upload, Loader2, ClipboardPaste } from 'lucide-react'

export function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)

  const uploadFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of imageFiles) {
        const { url } = await uploadFile(file)
        onUploaded(url)
      }
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

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

  return (
    <div
      className='flex items-center gap-2 outline-none'
      onPaste={handlePaste}
      tabIndex={0}
    >
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
        {uploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
        {uploading ? '上传中...' : '上传图片'}
      </Button>
      <span className='flex items-center gap-1 text-xs text-muted-foreground'>
        <ClipboardPaste className='h-3 w-3' />
        支持粘贴图片
      </span>
    </div>
  )
}
