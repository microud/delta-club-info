import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPromotionRanking } from '@/lib/api'

type RankingItem = {
  clubId: string
  clubName: string
  totalDailyRate: string
}

export function RankingWidget() {
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getPromotionRanking()
      .then((data) => {
        setRanking(data)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  if (!loaded || ranking.length === 0) return null

  return (
    <Card>
      <CardHeader className='flex flex-row items-center gap-2 space-y-0 pb-2'>
        <Trophy className='h-5 w-5 text-yellow-500' />
        <CardTitle className='text-base'>推广排名</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className='space-y-2'>
          {ranking.map((item, index) => (
            <li
              key={item.clubId}
              className='flex items-center justify-between text-sm'
            >
              <span>
                <span className='mr-2 font-semibold text-muted-foreground'>
                  {index + 1}.
                </span>
                {item.clubName}
              </span>
              <span className='font-medium'>
                ¥{Number(item.totalDailyRate).toFixed(2)}/天
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
