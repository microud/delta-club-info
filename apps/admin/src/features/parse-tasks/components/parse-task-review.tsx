import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { getParseTask, retryParseTask, confirmParseTask, getClubs } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

export function ParseTaskReview() {
  const { id } = useParams({ from: '/_authenticated/parse-tasks/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedClubId, setSelectedClubId] = useState<string>('')
  const [editedJson, setEditedJson] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: task, isLoading } = useQuery({
    queryKey: ['parse-task', id],
    queryFn: () => getParseTask(id),
  })

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', { page: 1, pageSize: 100 }],
    queryFn: () => getClubs({ page: 1, pageSize: 100 }),
  })

  const retryMutation = useMutation({
    mutationFn: () => retryParseTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parse-task', id] }),
  })

  const confirmMutation = useMutation({
    mutationFn: () => {
      const parsedResult = isEditing ? JSON.parse(editedJson) : undefined
      return confirmParseTask(id, { clubId: selectedClubId, parsedResult })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parse-tasks'] })
      navigate({ to: '/parse-tasks' })
    },
  })

  if (isLoading || !task) return <div>加载中...</div>

  const statusMap: Record<string, string> = {
    pending: '待解析',
    parsing: '解析中',
    completed: '已完成',
    failed: '失败',
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>解析任务详情</h2>
          <Badge className='mt-1'>{statusMap[task.status] ?? task.status}</Badge>
        </div>
        <div className='flex gap-2'>
          {(task.status === 'failed' || task.status === 'pending') && (
            <Button
              variant='outline'
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              {retryMutation.isPending ? '解析中...' : '重新解析'}
            </Button>
          )}
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* 左侧：原始图片 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>原始消息</h3>
          <div className='space-y-2'>
            {task.messages?.map((msg) => (
              <div key={msg.id} className='rounded-md border p-3'>
                {msg.msgType === 'image' && msg.mediaUrl && (
                  <img
                    src={msg.mediaUrl}
                    alt='消息图片'
                    className='max-h-96 rounded-md object-contain'
                  />
                )}
                {msg.msgType === 'text' && msg.content && (
                  <p className='text-sm'>{msg.content}</p>
                )}
                <p className='mt-1 text-xs text-muted-foreground'>
                  {new Date(msg.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
            {(!task.messages || task.messages.length === 0) && (
              <p className='text-sm text-muted-foreground'>无关联消息</p>
            )}
          </div>
        </div>

        {/* 右侧：解析结果 */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-medium'>AI 解析结果</h3>
            {task.parsedResult && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (!isEditing) {
                    setEditedJson(JSON.stringify(task.parsedResult, null, 2))
                  }
                  setIsEditing(!isEditing)
                }}
              >
                {isEditing ? '取消编辑' : '编辑'}
              </Button>
            )}
          </div>

          {task.errorMessage && (
            <div className='rounded-md border border-destructive p-3'>
              <p className='text-sm text-destructive'>{task.errorMessage}</p>
            </div>
          )}

          {task.parsedResult && !isEditing && (
            <pre className='max-h-[500px] overflow-auto rounded-md bg-muted p-4 text-sm'>
              {JSON.stringify(task.parsedResult, null, 2)}
            </pre>
          )}

          {isEditing && (
            <Textarea
              value={editedJson}
              onChange={(e) => setEditedJson(e.target.value)}
              className='min-h-[400px] font-mono text-sm'
            />
          )}

          {task.status === 'completed' && task.parsedResult && (
            <div className='space-y-3 border-t pt-4'>
              <h4 className='text-sm font-medium'>关联俱乐部</h4>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger>
                  <SelectValue placeholder='选择俱乐部' />
                </SelectTrigger>
                <SelectContent>
                  {clubsData?.data.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className='w-full'
                disabled={!selectedClubId || confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                {confirmMutation.isPending ? '确认中...' : '确认并导入'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
