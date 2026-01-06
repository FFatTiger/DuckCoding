// Create Remote Token Dialog
//
// 创建远程令牌对话框

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Provider } from '@/types/provider';
import type { RemoteTokenGroup, CreateRemoteTokenRequest } from '@/types/remote-token';
import { fetchProviderGroups, createProviderToken } from '@/lib/tauri-commands/token';
import { useToast } from '@/hooks/use-toast';

interface CreateRemoteTokenDialogProps {
  provider: Provider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * 创建远程令牌对话框
 */
export function CreateRemoteTokenDialog({
  provider,
  open,
  onOpenChange,
  onSuccess,
}: CreateRemoteTokenDialogProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<RemoteTokenGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState<CreateRemoteTokenRequest>({
    name: '',
    group_id: '',
    quota: -1, // 默认无限额度 (-1 表示无限)
    expire_days: 0, // 默认永不过期 (0 表示永不过期)
  });

  const [unlimitedQuota, setUnlimitedQuota] = useState(true); // 默认勾选无限额度
  const [unlimitedExpire, setUnlimitedExpire] = useState(false); // 默认不勾选无限时长

  /**
   * 加载分组列表
   */
  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const result = await fetchProviderGroups(provider);
      setGroups(result);
      // 如果有分组，默认选择第一个
      if (result.length > 0 && !formData.group_id) {
        setFormData((prev) => ({ ...prev, group_id: result[0].id }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: '加载分组失败',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  /**
   * 提交创建
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!formData.name.trim()) {
      toast({
        title: '验证失败',
        description: '请输入令牌名称',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.group_id) {
      toast({
        title: '验证失败',
        description: '请选择分组',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      await createProviderToken(provider, formData);
      toast({
        title: '令牌已创建',
        description: `令牌「${formData.name}」已成功创建`,
      });
      onSuccess();
      onOpenChange(false);
      // 重置表单
      setFormData({
        name: '',
        group_id: groups.length > 0 ? groups[0].id : '',
        quota: -1,
        expire_days: 0,
      });
      setUnlimitedQuota(true);
      setUnlimitedExpire(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: '创建失败',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  /**
   * 对话框打开时加载分组
   */
  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建远程令牌</DialogTitle>
          <DialogDescription>在供应商「{provider.name}」创建新的 API 令牌</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 令牌名称 */}
          <div className="space-y-2">
            <Label htmlFor="token-name">令牌名称 *</Label>
            <Input
              id="token-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：Production API Key"
              required
            />
          </div>

          {/* 分组 */}
          <div className="space-y-2">
            <Label htmlFor="token-group">分组 *</Label>
            {loadingGroups ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">加载分组...</span>
              </div>
            ) : (
              <Select
                value={formData.group_id}
                onValueChange={(value) => setFormData({ ...formData, group_id: value })}
              >
                <SelectTrigger id="token-group">
                  <SelectValue placeholder="选择分组">
                    {formData.group_id &&
                      (() => {
                        const selectedGroup = groups.find((g) => g.id === formData.group_id);
                        return selectedGroup
                          ? `${selectedGroup.id} (${selectedGroup.ratio}x)`
                          : formData.group_id;
                      })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">{group.id}({group.ratio}x)</span>
                        <span className="text-xs text-muted-foreground">{group.desc} </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 额度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token-quota">限制额度 (美元)</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unlimited-quota"
                  checked={unlimitedQuota}
                  onCheckedChange={(checked) => {
                    setUnlimitedQuota(checked === true);
                    if (checked) {
                      setFormData({ ...formData, quota: -1 });
                    } else {
                      setFormData({ ...formData, quota: 100000 }); // 默认 0.1 美元
                    }
                  }}
                />
                <Label htmlFor="unlimited-quota" className="text-sm font-normal cursor-pointer">
                  无限额度
                </Label>
              </div>
            </div>
            <Input
              id="token-quota"
              type="number"
              min="0"
              step="0.01"
              value={unlimitedQuota ? '' : (formData.quota / 1000000).toFixed(2)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quota: Math.round(parseFloat(e.target.value || '0') * 1000000),
                })
              }
              placeholder="0.10"
              disabled={unlimitedQuota}
            />
            <p className="text-xs text-muted-foreground">
              {unlimitedQuota ? '令牌将拥有无限额度' : '设置令牌的初始额度限制'}
            </p>
          </div>

          {/* 有效期 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token-expire-days">有效期 (天)</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unlimited-expire"
                  checked={unlimitedExpire}
                  onCheckedChange={(checked) => {
                    setUnlimitedExpire(checked === true);
                    if (checked) {
                      setFormData({ ...formData, expire_days: 0 });
                    } else {
                      setFormData({ ...formData, expire_days: 30 }); // 默认 30 天
                    }
                  }}
                />
                <Label htmlFor="unlimited-expire" className="text-sm font-normal cursor-pointer">
                  无限时长
                </Label>
              </div>
            </div>
            <Input
              id="token-expire-days"
              type="number"
              min="1"
              value={unlimitedExpire ? '' : formData.expire_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expire_days: parseInt(e.target.value || '30', 10),
                })
              }
              placeholder="30"
              disabled={unlimitedExpire}
            />
            <p className="text-xs text-muted-foreground">
              {unlimitedExpire ? '令牌将永不过期' : '设置令牌的有效期天数'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button type="submit" disabled={creating || loadingGroups}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
