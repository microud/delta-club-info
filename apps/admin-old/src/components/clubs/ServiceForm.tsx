import { useState } from 'react';
import { ClubServiceType } from '@delta-club/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClubServiceDto } from '@delta-club/shared';

const SERVICE_TYPE_LABELS: Record<ClubServiceType, string> = {
  [ClubServiceType.KNIFE_RUN]: '跑刀',
  [ClubServiceType.ACCOMPANY]: '陪玩',
  [ClubServiceType.ESCORT_TRIAL]: '护航体验单',
  [ClubServiceType.ESCORT_STANDARD]: '护航标准单',
  [ClubServiceType.ESCORT_FUN]: '护航趣味玩法',
};

interface ServiceFormProps {
  initialData?: Partial<ClubServiceDto>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function ServiceForm({ initialData, onSubmit, onCancel }: ServiceFormProps) {
  const [serviceType, setServiceType] = useState<string>(initialData?.type ?? '');

  const [hasGuarantee, setHasGuarantee] = useState<boolean>(initialData?.hasGuarantee ?? false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const data: Record<string, unknown> = {
      type: serviceType,
      sortOrder: Number(fd.get('sortOrder') ?? 0),
    };

    if (
      serviceType === ClubServiceType.KNIFE_RUN ||
      serviceType === ClubServiceType.ESCORT_TRIAL ||
      serviceType === ClubServiceType.ESCORT_STANDARD
    ) {
      data.priceYuan = (fd.get('priceYuan') as string) || null;
      data.priceHafuCoin = (fd.get('priceHafuCoin') as string) || null;
    } else if (serviceType === ClubServiceType.ACCOMPANY) {
      data.tier = (fd.get('tier') as string) || null;
      data.pricePerHour = (fd.get('pricePerHour') as string) || null;
    } else if (serviceType === ClubServiceType.ESCORT_FUN) {
      data.gameName = (fd.get('gameName') as string) || null;
      data.priceYuan = (fd.get('priceYuan') as string) || null;
      data.hasGuarantee = hasGuarantee;
      data.guaranteeHafuCoin = hasGuarantee ? (fd.get('guaranteeHafuCoin') as string) || null : null;
      data.rules = (fd.get('rules') as string) || null;
    }

    await onSubmit(data);
    setSubmitting(false);
  }

  const showPriceFields =
    serviceType === ClubServiceType.KNIFE_RUN ||
    serviceType === ClubServiceType.ESCORT_TRIAL ||
    serviceType === ClubServiceType.ESCORT_STANDARD;

  const showAccompanyFields = serviceType === ClubServiceType.ACCOMPANY;
  const showEscortFunFields = serviceType === ClubServiceType.ESCORT_FUN;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>服务类型 *</Label>
        <Select value={serviceType} onValueChange={(v) => setServiceType(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="请选择服务类型" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ClubServiceType).map((type) => (
              <SelectItem key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showPriceFields && (
        <>
          <div className="space-y-2">
            <Label htmlFor="priceYuan">价格（元）</Label>
            <Input
              id="priceYuan"
              name="priceYuan"
              defaultValue={initialData?.priceYuan ?? ''}
              placeholder="如：88.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceHafuCoin">价格（哈夫币）</Label>
            <Input
              id="priceHafuCoin"
              name="priceHafuCoin"
              defaultValue={initialData?.priceHafuCoin ?? ''}
              placeholder="如：100"
            />
          </div>
        </>
      )}

      {showAccompanyFields && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tier">段位</Label>
            <Input
              id="tier"
              name="tier"
              defaultValue={initialData?.tier ?? ''}
              placeholder="如：钻石"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerHour">每小时价格（元）</Label>
            <Input
              id="pricePerHour"
              name="pricePerHour"
              defaultValue={initialData?.pricePerHour ?? ''}
              placeholder="如：30.00"
            />
          </div>
        </>
      )}

      {showEscortFunFields && (
        <>
          <div className="space-y-2">
            <Label htmlFor="gameName">游戏名称</Label>
            <Input
              id="gameName"
              name="gameName"
              defaultValue={initialData?.gameName ?? ''}
              placeholder="如：三角洲行动"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceYuan">价格（元）</Label>
            <Input
              id="priceYuan"
              name="priceYuan"
              defaultValue={initialData?.priceYuan ?? ''}
              placeholder="如：88.00"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="hasGuarantee"
              type="checkbox"
              checked={hasGuarantee}
              onChange={(e) => setHasGuarantee(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="hasGuarantee">包含担保</Label>
          </div>
          {hasGuarantee && (
            <div className="space-y-2">
              <Label htmlFor="guaranteeHafuCoin">担保哈夫币</Label>
              <Input
                id="guaranteeHafuCoin"
                name="guaranteeHafuCoin"
                defaultValue={initialData?.guaranteeHafuCoin ?? ''}
                placeholder="如：200"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rules">规则说明</Label>
            <Textarea
              id="rules"
              name="rules"
              defaultValue={initialData?.rules ?? ''}
              placeholder="详细说明玩法规则"
              rows={3}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="sortOrder">排序</Label>
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          defaultValue={initialData?.sortOrder ?? 0}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          取消
        </Button>
        <Button type="submit" disabled={submitting || !serviceType}>
          {submitting ? '提交中...' : initialData?.id ? '更新' : '创建'}
        </Button>
      </div>
    </form>
  );
}
