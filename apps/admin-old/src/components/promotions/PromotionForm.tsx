import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getClubs } from '@/lib/api';
import type { ClubDto } from '@delta-club/shared';

interface PromotionFormProps {
  onSubmit: (data: { clubId: string; fee: number; startAt: string; endAt: string }) => Promise<void>;
  onCancel: () => void;
}

export function PromotionForm({ onSubmit, onCancel }: PromotionFormProps) {
  const [clubs, setClubs] = useState<ClubDto[]>([]);
  const [clubId, setClubId] = useState('');
  const [fee, setFee] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClubs({ pageSize: 200 }).then((res) => setClubs(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !fee || !startAt || !endAt) return;
    setSubmitting(true);
    try {
      await onSubmit({ clubId, fee: Number(fee), startAt, endAt });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">俱乐部</label>
        <Select value={clubId} onValueChange={(v) => setClubId(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择俱乐部" />
          </SelectTrigger>
          <SelectContent>
            {clubs.map((club) => (
              <SelectItem key={club.id} value={club.id}>
                {club.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">费用（元）</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="请输入费用"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">开始日期</label>
        <Input
          type="date"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">结束日期</label>
        <Input
          type="date"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          取消
        </Button>
        <Button type="submit" disabled={submitting || !clubId}>
          {submitting ? '提交中...' : '创建'}
        </Button>
      </div>
    </form>
  );
}
