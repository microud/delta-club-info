import { useState } from 'react';
import { RuleSentiment } from '@delta-club/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SENTIMENT_LABELS: Record<RuleSentiment, string> = {
  [RuleSentiment.FAVORABLE]: '有利',
  [RuleSentiment.UNFAVORABLE]: '不利',
  [RuleSentiment.NEUTRAL]: '中性',
};

interface RuleFormProps {
  initialData?: { content?: string; sentiment?: string };
  onSubmit: (data: { content: string; sentiment: string }) => Promise<void>;
  onCancel: () => void;
}

export function RuleForm({ initialData, onSubmit, onCancel }: RuleFormProps) {
  const [sentiment, setSentiment] = useState<string>(initialData?.sentiment ?? RuleSentiment.NEUTRAL);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      content: fd.get('content') as string,
      sentiment,
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content">规则内容 *</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={initialData?.content ?? ''}
          required
          placeholder="请输入规则内容"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>情感倾向</Label>
        <Select value={sentiment} onValueChange={(v) => setSentiment(v ?? RuleSentiment.NEUTRAL)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="请选择情感倾向" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(RuleSentiment).map((s) => (
              <SelectItem key={s} value={s}>
                {SENTIMENT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? '提交中...' : initialData?.content ? '更新' : '创建'}
        </Button>
      </div>
    </form>
  );
}
