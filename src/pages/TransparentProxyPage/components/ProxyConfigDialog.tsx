// 代理配置切换弹窗组件
// 允许用户切换透明代理使用的 API 配置

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useProxyConfigSwitch } from '../hooks/useProxyConfigSwitch';
import type { ToolId } from '../types/proxy-history';

interface ProxyConfigDialogProps {
  /** 弹窗开关状态 */
  open: boolean;
  /** 开关状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 工具 ID */
  toolId: ToolId;
  /** 当前配置名称 */
  currentProfileName: string | null;
  /** 配置更新成功回调 */
  onConfigUpdated: () => void;
}

/**
 * 代理配置切换弹窗组件
 *
 * 功能：
 * - 显示可用配置列表
 * - 用户选择配置后切换
 * - 切换成功后刷新状态
 */
export function ProxyConfigDialog({
  open,
  onOpenChange,
  toolId,
  currentProfileName,
  onConfigUpdated,
}: ProxyConfigDialogProps) {
  const [selectedProfile, setSelectedProfile] = useState(currentProfileName || '');
  const { profiles, loading, loadProfiles, switchConfig } = useProxyConfigSwitch(toolId);
  const { toast } = useToast();

  // 打开弹窗时加载配置列表和重置状态
  useEffect(() => {
    if (open) {
      setSelectedProfile(currentProfileName || '');
      loadProfiles();
    }
  }, [open, currentProfileName, loadProfiles]);

  /**
   * 保存配置按钮点击处理
   */
  const handleSave = async () => {
    if (!selectedProfile) {
      toast({
        title: '请选择配置',
        description: '请先选择一个配置文件',
        variant: 'destructive',
      });
      return;
    }

    const result = await switchConfig(selectedProfile);
    if (result.success) {
      toast({
        title: '配置已切换',
        description: '透明代理已自动更新，无需重启终端',
      });
      onConfigUpdated();
      onOpenChange(false);
    } else {
      toast({
        title: '配置切换失败',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>切换代理配置</DialogTitle>
          <DialogDescription>
            选择透明代理使用的 API 配置。切换后立即生效，无需重启终端。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              暂无可用配置文件，请先在配置页面创建配置。
            </p>
          ) : (
            <RadioGroup value={selectedProfile} onValueChange={setSelectedProfile}>
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div key={profile} className="flex items-center space-x-2">
                    <RadioGroupItem value={profile} id={`proxy-profile-${profile}`} />
                    <Label
                      htmlFor={`proxy-profile-${profile}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      <span
                        className={`font-medium ${profile === currentProfileName ? 'text-primary' : ''}`}
                      >
                        {profile}
                        {profile === currentProfileName && (
                          <span className="ml-2 text-xs text-muted-foreground">(当前)</span>
                        )}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading || profiles.length === 0}>
            {loading ? '切换中...' : '切换配置'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
