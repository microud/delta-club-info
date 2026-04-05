import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ClubForm } from './club-form'
import { type ClubFormValues } from '../data/schema'

type ClubsActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ClubFormValues
  onSubmit: (data: ClubFormValues) => void
  isSubmitting?: boolean
}

export function ClubsActionDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: ClubsActionDialogProps) {
  const isEdit = !!initialData

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑俱乐部' : '添加俱乐部'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '修改俱乐部信息，完成后点击保存。'
              : '填写俱乐部基本信息，完成后点击保存。'}
          </DialogDescription>
        </DialogHeader>
        <ClubForm
          initialData={initialData}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
