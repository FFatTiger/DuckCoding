import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Loader2, Package, Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DashboardToolCard } from './components/DashboardToolCard';
import { UpdateCheckBanner } from './components/UpdateCheckBanner';
import { ProviderTabs } from './components/ProviderTabs';
import { useDashboard } from './hooks/useDashboard';
import { useDashboardProviders } from './hooks/useDashboardProviders';
import { getToolDisplayName } from '@/utils/constants';
import { useToast } from '@/hooks/use-toast';
import {
  getUserQuota,
  refreshAllToolVersions,
  getUsageStats,
  type ToolStatus,
} from '@/lib/tauri-commands';
import type { UserQuotaResult, UsageStatsResult } from '@/lib/tauri-commands/types';

interface DashboardPageProps {
  tools: ToolStatus[];
  loading: boolean;
}

export function DashboardPage({ tools: toolsProp, loading: loadingProp }: DashboardPageProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(loadingProp);
  const [refreshing, setRefreshing] = useState(false);
  const [quota, setQuota] = useState<UserQuotaResult | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [stats, setStats] = useState<UsageStatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 使用仪表板 Hook
  const {
    tools,
    updating,
    checkingUpdates,
    checkingSingleTool,
    updateCheckMessage,
    checkForUpdates,
    checkSingleToolUpdate,
    handleUpdate,
    updateTools,
  } = useDashboard(toolsProp);

  // 使用供应商管理 Hook
  const {
    providers,
    loading: providersLoading,
    instanceSelections,
    setInstanceSelection,
  } = useDashboardProviders();

  // 选中的供应商 ID（纯前端状态）
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  // 同步外部 tools 数据
  useEffect(() => {
    updateTools(toolsProp);
    setLoading(loadingProp);
  }, [toolsProp, loadingProp, updateTools]);

  // 初始化时选中第一个供应商
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  // 加载用户配额
  const loadQuota = useCallback(async (providerId: string) => {
    setQuotaLoading(true);
    try {
      const quotaData = await getUserQuota(providerId);
      setQuota(quotaData);
    } catch (error) {
      console.error('加载用户配额失败:', error);
      setQuota(null); // 清空旧数据
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  // 加载用量统计
  const loadStats = useCallback(async (providerId: string) => {
    setStatsLoading(true);
    try {
      const statsData = await getUsageStats(providerId);
      setStats(statsData);
    } catch (error) {
      console.error('加载用量统计失败:', error);
      setStats(null); // 清空旧数据
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 加载用户配额和用量统计
  useEffect(() => {
    if (selectedProviderId) {
      loadQuota(selectedProviderId);
      loadStats(selectedProviderId);
    }
  }, [selectedProviderId, loadQuota, loadStats]);

  // 手动刷新工具状态（刷新数据库版本号）
  const handleRefreshToolStatus = async () => {
    setRefreshing(true);
    try {
      const newTools = await refreshAllToolVersions();
      updateTools(newTools);
      toast({
        title: '刷新完成',
        description: '工具版本号已更新',
      });
    } catch (error) {
      toast({
        title: '刷新失败',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 更新工具处理
  const onUpdate = async (toolId: string) => {
    const result = await handleUpdate(toolId);

    if (result.isUpdating) {
      toast({
        title: '请稍候',
        description: result.message,
        variant: 'destructive',
      });
      return;
    }

    if (result.success) {
      toast({
        title: '更新成功',
        description: `${getToolDisplayName(toolId)} ${result.message}`,
      });
      // 更新成功后重新检测工具状态（而不是仅读数据库）
      await handleRefreshToolStatus();
      // 更新成功后自动检测工具更新状态，显示「最新版」标识
      await checkSingleToolUpdate(toolId);
    } else {
      toast({
        title: '更新失败',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  // 切换到配置页面
  const switchToConfig = (toolId?: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-config', { detail: { toolId } }));
  };

  // 切换到安装页面
  const switchToInstall = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-install'));
  };

  // 处理供应商切换（纯前端状态切换）
  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
  };

  // 刷新当前供应商的配额和统计数据
  const handleRefreshProviderData = () => {
    if (selectedProviderId) {
      loadQuota(selectedProviderId);
      loadStats(selectedProviderId);
    }
  };

  // 处理实例选择变更
  const handleInstanceChange = async (toolId: string, instanceType: string) => {
    const result = await setInstanceSelection({
      tool_id: toolId,
      instance_type: instanceType,
    });

    if (result.success) {
      toast({
        title: '实例已切换',
        description: `${getToolDisplayName(toolId)} 已切换到${instanceType === 'local' ? '本地环境' : instanceType === 'wsl' ? 'WSL 环境' : 'SSH 远程'}`,
      });
    } else {
      toast({
        title: '切换失败',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const installedTools = tools.filter((t) => t.installed);

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">仪表板</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">加载中...</span>
        </div>
      ) : (
        <>
          {/* 更新检查提示 */}
          {updateCheckMessage && <UpdateCheckBanner message={updateCheckMessage} />}

          {installedTools.length === 0 ? (
            <Card className="shadow-sm border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">暂无已安装的工具</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    请先前往安装页面安装 AI 开发工具
                  </p>
                  <Button
                    onClick={switchToInstall}
                    className="shadow-md hover:shadow-lg transition-all"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    去安装工具
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* 第一段：工具卡片 + 操作按钮 */}
              <div>
                <div className="flex justify-end gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshToolStatus}
                    disabled={refreshing}
                    className="shadow-sm hover:shadow-md transition-all"
                  >
                    {refreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        检测中...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        检测工具状态
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkForUpdates}
                    disabled={checkingUpdates}
                    className="shadow-sm hover:shadow-md transition-all"
                  >
                    {checkingUpdates ? (
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
                </div>

                {/* 工具卡片列表 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {installedTools.map((tool) => (
                    <DashboardToolCard
                      key={tool.id}
                      tool={tool}
                      updating={updating === tool.id}
                      checking={checkingSingleTool === tool.id}
                      checkingAll={checkingUpdates}
                      instanceSelection={instanceSelections[tool.id]}
                      onUpdate={() => onUpdate(tool.id)}
                      onCheckUpdates={() => checkSingleToolUpdate(tool.id)}
                      onConfigure={() => switchToConfig(tool.id)}
                      onInstanceChange={(instanceType) =>
                        handleInstanceChange(tool.id, instanceType)
                      }
                    />
                  ))}
                </div>
              </div>

              {/* 第二段：供应商标签页 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">供应商与用量统计</h3>
                <ProviderTabs
                  providers={providers}
                  selectedProviderId={selectedProviderId}
                  loading={providersLoading}
                  quota={quota}
                  quotaLoading={quotaLoading}
                  stats={stats}
                  statsLoading={statsLoading}
                  onProviderChange={handleProviderChange}
                  onRefresh={handleRefreshProviderData}
                />
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
