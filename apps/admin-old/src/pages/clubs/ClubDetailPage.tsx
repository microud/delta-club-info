import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { ClubServiceType, RuleSentiment } from '@delta-club/shared';
import type { ClubDto, ClubServiceDto, ClubRuleDto } from '@delta-club/shared';
import {
  getClub,
  updateClub,
  getClubServices,
  createClubService,
  updateClubService,
  deleteClubService,
  getClubRules,
  createClubRule,
  updateClubRule,
  deleteClubRule,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ServiceForm } from '@/components/clubs/ServiceForm';
import { RuleForm } from '@/components/clubs/RuleForm';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  [ClubServiceType.KNIFE_RUN]: '跑刀',
  [ClubServiceType.ACCOMPANY]: '陪玩',
  [ClubServiceType.ESCORT_TRIAL]: '护航体验单',
  [ClubServiceType.ESCORT_STANDARD]: '护航标准单',
  [ClubServiceType.ESCORT_FUN]: '护航趣味玩法',
};

const SENTIMENT_LABELS: Record<string, string> = {
  [RuleSentiment.FAVORABLE]: '有利',
  [RuleSentiment.UNFAVORABLE]: '不利',
  [RuleSentiment.NEUTRAL]: '中性',
};

const SENTIMENT_COLORS: Record<string, string> = {
  [RuleSentiment.FAVORABLE]: 'text-green-600',
  [RuleSentiment.UNFAVORABLE]: 'text-red-600',
  [RuleSentiment.NEUTRAL]: 'text-gray-500',
};

function getServicePriceSummary(service: ClubServiceDto): string {
  if (
    service.type === ClubServiceType.KNIFE_RUN ||
    service.type === ClubServiceType.ESCORT_TRIAL ||
    service.type === ClubServiceType.ESCORT_STANDARD
  ) {
    const parts: string[] = [];
    if (service.priceYuan) parts.push(`¥${service.priceYuan}`);
    if (service.priceHafuCoin) parts.push(`${service.priceHafuCoin}哈夫币`);
    return parts.join(' / ') || '-';
  }
  if (service.type === ClubServiceType.ACCOMPANY) {
    const parts: string[] = [];
    if (service.tier) parts.push(service.tier);
    if (service.pricePerHour) parts.push(`¥${service.pricePerHour}/时`);
    return parts.join(' · ') || '-';
  }
  if (service.type === ClubServiceType.ESCORT_FUN) {
    const parts: string[] = [];
    if (service.gameName) parts.push(service.gameName);
    if (service.priceYuan) parts.push(`¥${service.priceYuan}`);
    return parts.join(' · ') || '-';
  }
  return '-';
}

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [club, setClub] = useState<ClubDto | null>(null);
  const [services, setServices] = useState<ClubServiceDto[]>([]);
  const [rules, setRules] = useState<ClubRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [editClubOpen, setEditClubOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [editServiceOpen, setEditServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClubServiceDto | null>(null);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClubRuleDto | null>(null);

  async function loadData() {
    if (!id) return;
    try {
      const [clubData, servicesData, rulesData] = await Promise.all([
        getClub(id),
        getClubServices(id),
        getClubRules(id),
      ]);
      setClub(clubData);
      setServices(servicesData);
      setRules(rulesData);
    } catch {
      setError('加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleUpdateClub(data: Partial<ClubDto>) {
    if (!id) return;
    const updated = await updateClub(id, data);
    setClub(updated);
    setEditClubOpen(false);
  }

  async function handleAddService(data: Record<string, unknown>) {
    if (!id) return;
    await createClubService(id, data as Partial<ClubServiceDto>);
    setAddServiceOpen(false);
    const updated = await getClubServices(id);
    setServices(updated);
  }

  async function handleEditService(data: Record<string, unknown>) {
    if (!id || !editingService) return;
    await updateClubService(id, editingService.id, data as Partial<ClubServiceDto>);
    setEditServiceOpen(false);
    setEditingService(null);
    const updated = await getClubServices(id);
    setServices(updated);
  }

  async function handleDeleteService(serviceId: string) {
    if (!id) return;
    if (!confirm('确认删除该服务项？')) return;
    await deleteClubService(id, serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  }

  async function handleAddRule(data: { content: string; sentiment: string }) {
    if (!id) return;
    await createClubRule(id, data);
    setAddRuleOpen(false);
    const updated = await getClubRules(id);
    setRules(updated);
  }

  async function handleEditRule(data: { content: string; sentiment: string }) {
    if (!id || !editingRule) return;
    await updateClubRule(id, editingRule.id, data);
    setEditRuleOpen(false);
    setEditingRule(null);
    const updated = await getClubRules(id);
    setRules(updated);
  }

  async function handleDeleteRule(ruleId: string) {
    if (!id) return;
    if (!confirm('确认删除该规则？')) return;
    await deleteClubRule(id, ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="flex items-center justify-center h-48 text-destructive">
        {error ?? '俱乐部不存在'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/clubs')}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-semibold flex-1">{club.name}</h1>
        <Dialog open={editClubOpen} onOpenChange={setEditClubOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Pencil />
            编辑信息
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>编辑俱乐部信息</DialogTitle>
            </DialogHeader>
            <ClubForm initialData={club} onSubmit={handleUpdateClub} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">服务项</TabsTrigger>
          <TabsTrigger value="rules">规则</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus />
                  添加服务项
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>添加服务项</DialogTitle>
                  </DialogHeader>
                  <ServiceForm onSubmit={handleAddService} onCancel={() => setAddServiceOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">类型</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">价格</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">排序</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        暂无服务项
                      </td>
                    </tr>
                  ) : (
                    services.map((service) => (
                      <tr key={service.id} className="border-t">
                        <td className="px-4 py-3">
                          {SERVICE_TYPE_LABELS[service.type] ?? service.type}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {getServicePriceSummary(service)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{service.sortOrder}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditingService(service);
                                setEditServiceOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteService(service.id)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus />
                  添加规则
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>添加规则</DialogTitle>
                  </DialogHeader>
                  <RuleForm onSubmit={handleAddRule} onCancel={() => setAddRuleOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">内容</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">倾向</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        暂无规则
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id} className="border-t">
                        <td className="px-4 py-3 max-w-md">
                          <span className="line-clamp-2">{rule.content}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={SENTIMENT_COLORS[rule.sentiment] ?? 'text-gray-500'}>
                            {SENTIMENT_LABELS[rule.sentiment] ?? rule.sentiment}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditingRule(rule);
                                setEditRuleOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Service Dialog (controlled) */}
      <Dialog
        open={editServiceOpen}
        onOpenChange={(open) => {
          setEditServiceOpen(open);
          if (!open) setEditingService(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑服务项</DialogTitle>
          </DialogHeader>
          {editingService && (
            <ServiceForm
              initialData={editingService}
              onSubmit={handleEditService}
              onCancel={() => {
                setEditServiceOpen(false);
                setEditingService(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog (controlled) */}
      <Dialog
        open={editRuleOpen}
        onOpenChange={(open) => {
          setEditRuleOpen(open);
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑规则</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <RuleForm
              initialData={{ content: editingRule.content, sentiment: editingRule.sentiment }}
              onSubmit={handleEditRule}
              onCancel={() => {
                setEditRuleOpen(false);
                setEditingRule(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
