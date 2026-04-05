import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { getClubs, createClub, deleteClub } from '@/lib/api';
import { ClubForm } from '@/components/clubs/ClubForm';
import { Plus, Trash2 } from 'lucide-react';
import type { ClubDto } from '@delta-club/shared';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  closed: '已倒闭',
  archived: '已归档',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'destructive',
  archived: 'outline',
};

export default function ClubListPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await getClubs({ page, pageSize: 20, search: search || undefined });
    setClubs(res.data);
    setTotal(res.total);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: Partial<ClubDto>) {
    await createClub(data);
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该俱乐部？')) return;
    await deleteClub(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">俱乐部管理</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-1" />新建俱乐部
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建俱乐部</DialogTitle>
            </DialogHeader>
            <ClubForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="搜索俱乐部名称..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>成立日期</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clubs.map((club) => (
            <TableRow key={club.id} className="cursor-pointer" onClick={() => navigate(`/clubs/${club.id}`)}>
              <TableCell className="font-medium">{club.name}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[club.status]}>
                  {statusLabels[club.status]}
                </Badge>
              </TableCell>
              <TableCell>{club.establishedAt ?? '-'}</TableCell>
              <TableCell>{new Date(club.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(club.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground leading-8">第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
