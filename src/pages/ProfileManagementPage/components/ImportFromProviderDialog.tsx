/**
 * 从供应商导入 Profile 对话框
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ToolId } from '@/types/profile';
import type { Provider } from '@/types/provider';
import type { RemoteToken } from '@/types/remote-token';
import { listProviders } from '@/lib/tauri-commands/provider';
import { fetchProviderTokens, importTokenAsProfile } from '@/lib/tauri-commands/token';
import { pmListToolProfiles } from '@/lib/tauri-commands/profile';

interface ImportFromProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolId: ToolId;
  onSuccess: () => void;
}

/**
 * 从供应商导入 Profile 对话框
 */
export function ImportFromProviderDialog({
  open,
  onOpenChange,
  toolId,
  onSuccess,
}: ImportFromProviderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // 供应商和令牌数据
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tokens, setTokens] = useState<RemoteToken[]>([]);

  // 表单数据
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [profileName, setProfileName] = useState('');

  // 获取当前选中的供应商和令牌
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const selectedToken = tokens.find((t) => t.id === selectedTokenId);

  /**
   * 加载供应商列表
   */
  const loadProviders = async () => {
    try {
      setLoading(true);
      const result = await listProviders();
      setProviders(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: '加载供应商失败',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载选中供应商的令牌列表
   */
  const loadTokens = async (provider: Provider) => {
    try {
      setLoading(true);
      const result = await fetchProviderTokens(provider);
      setTokens(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: '加载令牌失败',
        description: errorMsg,
        variant: 'destructive',
      });
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Dialog 打开时加载供应商列表
   */
  useEffect(() => {
    if (open) {
      loadProviders();
      // 重置表单
      setSelectedProviderId('');
      setSelectedTokenId(null);
      setProfileName('');
      setTokens([]);
    }
  }, [open]);

  /**
   * 供应商变更时加载令牌列表
   */
  useEffect(() => {
    if (selectedProvider) {
      loadTokens(selectedProvider);
      setSelectedTokenId(null);
    } else {
      setTokens([]);
      setSelectedTokenId(null);
    }
  }, [selectedProviderId]);

  /**
   * 令牌变更时自动填充 Profile 名称
   */
  useEffect(() => {
    if (selectedToken && !profileName) {
      setProfileName(selectedToken.name + '_profile');
    }
  }, [selectedTokenId]);

  /**
   * 提交导入
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProvider || !selectedToken) {
      toast({
        title: '请选择供应商和令牌',
        variant: 'destructive',
      });
      return;
    }

    if (!profileName.trim()) {
      toast({
        title: '请输入 Profile 名称',
        variant: 'destructive',
      });
      return;
    }

    // 检查保留前缀
    if (profileName.startsWith('dc_proxy_')) {
      toast({
        title: '验证失败',
        description: 'Profile 名称不能以 dc_proxy_ 开头（系统保留）',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      // 检查是否已存在同名 Profile
      const existingProfiles = await pmListToolProfiles(toolId);
      if (existingProfiles.includes(profileName)) {
        toast({
          title: '验证失败',
          description: '该 Profile 名称已存在，请使用其他名称',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      await importTokenAsProfile(selectedProvider, selectedToken, toolId, profileName);
      toast({
        title: '导入成功',
        description:
          '令牌「' + selectedToken.name + '」已成功导入为 Profile「' + profileName + '」',
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: '导入失败',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>从供应商导入 Profile</DialogTitle>
          <DialogDescription>选择供应商和令牌,一键导入为本地 Profile 配置</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 选择供应商 */}
          <div className="space-y-2">
            <Label htmlFor="provider-select">选择供应商 *</Label>
            <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
              <SelectTrigger id="provider-select">
                <SelectValue placeholder="请选择供应商" />
              </SelectTrigger>
              <SelectContent>
                {providers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    暂无可用供应商
                  </div>
                ) : (
                  providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">选择要从哪个供应商导入令牌</p>
          </div>

          {/* 选择令牌 */}
          <div className="space-y-2">
            <Label htmlFor="token-select">选择令牌 *</Label>
            <Select
              value={selectedTokenId?.toString() || ''}
              onValueChange={(v) => setSelectedTokenId(Number(v))}
              disabled={!selectedProvider || loading}
            >
              <SelectTrigger id="token-select">
                <SelectValue placeholder="请先选择供应商" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="p-2 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载中...
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    该供应商暂无可用令牌
                  </div>
                ) : (
                  tokens.map((token) => (
                    <SelectItem key={token.id} value={token.id.toString()}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{token.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {token.unlimited_quota
                            ? '无限'
                            : '$' + (token.remain_quota / 1000000).toFixed(2)}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">选择要导入的令牌</p>
          </div>

          {/* 令牌信息预览 */}
          {selectedToken && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">令牌名称:</span>
                <span className="font-medium">{selectedToken.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">分组:</span>
                <span>{selectedToken.group}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">剩余额度:</span>
                <span>
                  {selectedToken.unlimited_quota
                    ? '无限'
                    : '$' + (selectedToken.remain_quota / 1000000).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Profile 名称 */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Profile 名称 *</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="例如:my_api_profile"
              required
            />
            <p className="text-xs text-muted-foreground">为导入的 Profile 设置一个本地名称</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
            >
              取消
            </Button>
            <Button type="submit" disabled={importing || !selectedProvider || !selectedToken}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!importing && <Download className="mr-2 h-4 w-4" />}
              导入
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
