import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/api'
import { Upload, Loader2 } from 'lucide-react'

export function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)

  return (
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
        input.onchange = async () => {
          const files = input.files
          if (!files) return
          setUploading(true)
          try {
            for (const file of Array.from(files)) {
              const { url } = await uploadFile(file)
              onUploaded(url)
            }
          } finally {
            setUploading(false)
          }
        }
        input.click()
      }}
    >
      {uploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
      {uploading ? '上传中...' : '上传图片'}
    </Button>
  )
}
