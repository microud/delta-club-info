import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getPromotions, createPromotion, deletePromotion, getPromotionRanking } from '@/lib/api';
import { PromotionForm } from '@/components/promotions/PromotionForm';
import { Plus, Trash2, Trophy } from 'lucide-react';
import type { PromotionOrderDto } from '@delta-club/shared';

interface RankingItem {
  clubId: string;
  clubName: string;
  totalDailyRate: string;
}

export default function PromotionListPage() {
  const [promotions, setPromotions] = useState<PromotionOrderDto[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [promoData, rankingData] = await Promise.all([
      getPromotions(),
      getPromotionRanking(),
    ]);
    setPromotions(promoData);
    setRanking(rankingData);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: { clubId: string; fee: number; startAt: string; endAt: string }) {
    await createPromotion(data);
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该推广订单？')) return;
    await deletePromotion(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">推广管理</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" />新建推广订单
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建推广订单</DialogTitle>
            </DialogHeader>
            <PromotionForm
              onSubmit={handleCreate}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {ranking.length > 0 && (
        <div className="mb-6 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold">推广排名（日均费用）</h3>
          </div>
          <ol className="flex flex-col gap-1.5">
            {ranking.map((item, index) => (
              <li key={item.clubId} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-center text-muted-foreground font-medium">{index + 1}</span>
                <span className="flex-1 font-medium">{item.clubName}</span>
                <span className="text-muted-foreground">
                  ¥{Number(item.totalDailyRate).toFixed(2)}/天
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>俱乐部</TableHead>
            <TableHead>费用</TableHead>
            <TableHead>日均</TableHead>
            <TableHead>开始</TableHead>
            <TableHead>结束</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions.map((promo) => (
            <TableRow key={promo.id}>
              <TableCell className="font-medium">{promo.clubName ?? promo.clubId}</TableCell>
              <TableCell>¥{Number(promo.fee).toFixed(2)}</TableCell>
              <TableCell>¥{Number(promo.dailyRate).toFixed(2)}/天</TableCell>
              <TableCell>{promo.startAt}</TableCell>
              <TableCell>{promo.endAt}</TableCell>
              <TableCell>
                {promo.isActive ? (
                  <Badge variant="default">生效中</Badge>
                ) : (
                  <Badge variant="secondary">未生效</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(promo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {promotions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                暂无推广订单
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
