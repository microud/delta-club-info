import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ClubDto } from '@delta-club/shared';

interface ClubFormProps {
  initialData?: Partial<ClubDto>;
  onSubmit: (data: Partial<ClubDto>) => Promise<void>;
}

export function ClubForm({ initialData, onSubmit }: ClubFormProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      name: fd.get('name') as string,
      logo: (fd.get('logo') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      wechatOfficialAccount: (fd.get('wechatOfficialAccount') as string) || undefined,
      wechatMiniProgram: (fd.get('wechatMiniProgram') as string) || undefined,
      contactInfo: (fd.get('contactInfo') as string) || undefined,
      establishedAt: (fd.get('establishedAt') as string) || undefined,
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名称 *</Label>
        <Input id="name" name="name" defaultValue={initialData?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Logo URL</Label>
        <Input id="logo" name="logo" defaultValue={initialData?.logo ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">简介</Label>
        <Textarea id="description" name="description" defaultValue={initialData?.description ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wechatOfficialAccount">公众号 ID</Label>
          <Input id="wechatOfficialAccount" name="wechatOfficialAccount" defaultValue={initialData?.wechatOfficialAccount ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wechatMiniProgram">小程序 AppID</Label>
          <Input id="wechatMiniProgram" name="wechatMiniProgram" defaultValue={initialData?.wechatMiniProgram ?? ''} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactInfo">联系方式</Label>
        <Input id="contactInfo" name="contactInfo" defaultValue={initialData?.contactInfo ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="establishedAt">成立日期</Label>
        <Input id="establishedAt" name="establishedAt" type="date" defaultValue={initialData?.establishedAt ?? ''} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '提交中...' : initialData ? '更新' : '创建'}
      </Button>
    </form>
  );
}
