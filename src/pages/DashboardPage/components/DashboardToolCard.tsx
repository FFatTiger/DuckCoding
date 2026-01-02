import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Loader2, Key } from 'lucide-react';
import { logoMap } from '@/utils/constants';
import { formatVersionLabel } from '@/utils/formatting';
import type { ToolStatus } from '@/lib/tauri-commands';
import type { ToolInstanceSelection } from '@/types/provider';

interface DashboardToolCardProps {
  tool: ToolStatus;
  updating: boolean;
  checking: boolean; // 当前工具是否正在检测更新
  checkingAll: boolean; // 全局检测更新状态
  instanceSelection?: ToolInstanceSelection;
  onUpdate: () => void;
  onCheckUpdates: () => void;
  onConfigure: () => void;
  onInstanceChange: (instanceType: string) => void;
}

export function DashboardToolCard({
  tool,
  updating,
  checking,
  checkingAll,
  instanceSelection,
  onUpdate,
  onCheckUpdates,
  onConfigure,
  onInstanceChange,
}: DashboardToolCardProps) {
  // 是否正在检测更新（全局或单工具）
  const isChecking = checking || checkingAll;
  // 已检测完成且是最新版（确保只在检测更新后才显示）
  const isLatest = tool.hasUpdate === false && Boolean(tool.latestVersion);

  // 实例类型选项
  const instanceOptions = [
    { value: 'local', label: '本地环境 (Local)' },
    { value: 'wsl', label: 'WSL 环境' },
    { value: 'ssh', label: 'SSH 远程' },
  ];

  const currentInstanceType = instanceSelection?.instance_type || 'local';

  return (
    <Card className="shadow-sm border">
      <CardContent className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-secondary p-2.5 rounded-lg flex-shrink-0">
            <img src={logoMap[tool.id]} alt={tool.name} className="w-8 h-8" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-lg">{tool.name}</h4>
              {tool.hasUpdate && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  有更新
                </Badge>
              )}
              {isLatest && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  最新版
                </Badge>
              )}
            </div>

            {/* 实例选择下拉框 */}
            <div className="flex items-center">
              <Select value={currentInstanceType} onValueChange={onInstanceChange}>
                <SelectTrigger className="w-auto min-w-[160px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instanceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              当前版本:
            </span>
            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg shadow-sm">
              {formatVersionLabel(tool.version)}
            </span>
          </div>
          {tool.hasUpdate && tool.latestVersion && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                最新版本:
              </span>
              <span className="font-mono text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2.5 py-1 rounded-lg shadow-sm">
                {formatVersionLabel(tool.latestVersion)}
              </span>
            </div>
          )}
          {isLatest && tool.latestVersion && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                最新版本:
              </span>
              <span className="font-mono text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2.5 py-1 rounded-lg shadow-sm">
                {formatVersionLabel(tool.latestVersion)}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onConfigure} className="flex-1">
            <Key className="mr-2 h-4 w-4" />
            配置
          </Button>

          {tool.hasUpdate ? (
            <Button
              size="sm"
              onClick={onUpdate}
              disabled={updating}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  更新
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onCheckUpdates}
              disabled={isChecking}
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  检查中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  检查更新
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
