// Import Token Dialog
//
// 导入令牌为 Profile 对话框

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Provider } from '@/types/provider';
import type { RemoteToken } from '@/types/remote-token';
import { importTokenAsProfile } from '@/lib/tauri-commands/token';
import { pmListToolProfiles } from '@/lib/tauri-commands/profile';
import type { ToolId } from '@/lib/tauri-commands/types';
import { useToast } from '@/hooks/use-toast';

interface ImportTokenDialogProps {
  provider: Provider;
  token: RemoteToken;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TOOL_OPTIONS = [
  { id: 'claude-code', name: 'Claude Code' },
  { id: 'codex', name: 'Codex' },
  { id: 'gemini-cli', name: 'Gemini CLI' },
];

/**
 * 导入令牌为 Profile 对话框
 */
export function ImportTokenDialog({
  provider,
  token,
  open,
  onOpenChange,
  onSuccess,
}: ImportTokenDialogProps) {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [toolId, setToolId] = useState('claude-code');
  const [profileName, setProfileName] = useState('');

  /**
   * 提交导入
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!profileName.trim()) {
      toast({
        title: '验证失败',
        description: '请输入 Profile 名称',
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
      const existingProfiles = await pmListToolProfiles(toolId as ToolId);
      if (existingProfiles.includes(profileName)) {
        const toolName = TOOL_OPTIONS.find((t) => t.id === toolId)?.name || toolId;
        toast({
          title: '验证失败',
          description: `Profile「${profileName}」已存在于 ${toolName} 中，请使用其他名称`,
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      await importTokenAsProfile(provider, token, toolId, profileName);
      toast({
        title: '导入成功',
        description: `令牌「${token.name}」已成功导入为 Profile「${profileName}」`,
      });
      onSuccess();
      // 重置表单
      setProfileName('');
      setToolId('claude-code');
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
          <DialogTitle>导入令牌为 Profile</DialogTitle>
          <DialogDescription>将令牌「{token.name}」导入为本地 Profile 配置</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 令牌信息 */}
          <div className="rounded-md border bg-muted/50 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">令牌名称:</span>
              <span className="font-medium">{token.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">分组:</span>
              <span>{token.group}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">剩余额度:</span>
              <span>
                {token.unlimited_quota ? '无限' : `$${(token.remain_quota / 1000000).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* 选择工具 */}
          <div className="space-y-2">
            <Label htmlFor="tool-select">目标工具 *</Label>
            <Select value={toolId} onValueChange={setToolId}>
              <SelectTrigger id="tool-select">
                <SelectValue placeholder="选择工具" />
              </SelectTrigger>
              <SelectContent>
                {TOOL_OPTIONS.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">选择要导入到哪个工具的 Profile 配置</p>
          </div>

          {/* Profile 名称 */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Profile 名称 *</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={`例如：${token.name}_profile`}
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
            <Button type="submit" disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              导入
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
