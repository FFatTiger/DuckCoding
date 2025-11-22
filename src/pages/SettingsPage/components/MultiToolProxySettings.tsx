import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Power, AlertCircle, Info, Sparkles, Save } from 'lucide-react';
import { useMultiToolProxy, SUPPORTED_TOOLS, type ToolMetadata } from '../hooks/useMultiToolProxy';
import { useToast } from '@/hooks/use-toast';
import type { ToolProxyConfig, TransparentProxyStatus } from '@/lib/tauri-commands';

// 单个工具的代理配置卡片
function ToolProxyCard({
  tool,
  config,
  status,
  isLoading,
  onConfigChange,
  onGenerateApiKey,
  onStart,
  onStop,
}: {
  tool: ToolMetadata;
  config: ToolProxyConfig;
  status: TransparentProxyStatus | null;
  isLoading: boolean;
  onConfigChange: (updates: Partial<ToolProxyConfig>) => void;
  onGenerateApiKey: () => void;
  onStart: () => void;
  onStop: () => void;
}) {
  const isRunning = status?.running || false;
  const actualPort = status?.port || config.port;

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        isRunning
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-300 dark:border-blue-700'
          : 'bg-muted/30 border-border'
      }`}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{tool.name}</h4>
          <Badge variant={isRunning ? 'default' : 'secondary'} className="text-xs">
            {isRunning ? `运行中 (端口 ${actualPort})` : '已停止'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* 启用开关 */}
          <Label className="text-xs text-muted-foreground mr-1">启用</Label>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onConfigChange({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
            disabled={isRunning}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{tool.description}</p>

      {config.enabled && (
        <div className="space-y-4">
          {/* 端口配置 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor={`${tool.id}-port`} className="text-xs">
                监听端口
              </Label>
              <Input
                id={`${tool.id}-port`}
                type="number"
                value={config.port}
                onChange={(e) =>
                  onConfigChange({ port: parseInt(e.target.value) || tool.defaultPort })
                }
                disabled={isRunning}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">允许公网访问</Label>
              <div className="flex items-center h-8">
                <input
                  type="checkbox"
                  checked={config.allow_public}
                  onChange={(e) => onConfigChange({ allow_public: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                  disabled={isRunning}
                />
                <span className="text-xs text-muted-foreground ml-2">不推荐</span>
              </div>
            </div>
          </div>

          {/* API Key 配置 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${tool.id}-api-key`} className="text-xs">
                保护密钥 *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onGenerateApiKey}
                disabled={isRunning}
                className="h-6 text-xs px-2"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                生成
              </Button>
            </div>
            <Input
              id={`${tool.id}-api-key`}
              type="password"
              placeholder="点击「生成」按钮自动生成"
              value={config.local_api_key || ''}
              onChange={(e) => onConfigChange({ local_api_key: e.target.value || null })}
              disabled={isRunning}
              className="h-8 text-sm font-mono"
            />
          </div>

          {/* 启动/停止按钮 */}
          <div className="flex justify-end pt-2">
            {isRunning ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onStop}
                disabled={isLoading}
                className="h-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    停止中...
                  </>
                ) : (
                  <>
                    <Power className="h-3 w-3 mr-1" />
                    停止代理
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onStart}
                disabled={isLoading || !config.local_api_key}
                className="h-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    启动中...
                  </>
                ) : (
                  <>
                    <Power className="h-3 w-3 mr-1" />
                    启动代理
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MultiToolProxySettings() {
  const { toast } = useToast();
  const {
    savingConfig,
    hasUnsavedChanges,
    sessionEndpointConfigEnabled,
    setSessionEndpointConfigEnabled,
    updateToolConfig,
    saveToolConfigs,
    generateApiKey,
    handleStartToolProxy,
    handleStopToolProxy,
    getToolStatus,
    getToolConfig,
    isToolLoading,
  } = useMultiToolProxy();

  // 启动代理
  const handleStart = async (toolId: string) => {
    const config = getToolConfig(toolId);
    if (!config.local_api_key) {
      toast({
        title: '配置不完整',
        description: '请先生成或填写保护密钥',
        variant: 'destructive',
      });
      return;
    }

    // 检查是否有未保存的修改
    if (hasUnsavedChanges) {
      toast({
        title: '配置未保存',
        description: '请先点击「保存配置」按钮保存修改',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await handleStartToolProxy(toolId);
      toast({
        title: '启动成功',
        description: result,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: '启动失败',
        description: error?.message || String(error),
        variant: 'destructive',
      });
    }
  };

  // 停止代理
  const handleStop = async (toolId: string) => {
    try {
      const result = await handleStopToolProxy(toolId);
      toast({
        title: '停止成功',
        description: result,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: '停止失败',
        description: error?.message || String(error),
        variant: 'destructive',
      });
    }
  };

  // 保存所有配置
  const handleSaveConfigs = async () => {
    try {
      await saveToolConfigs();
      toast({
        title: '保存成功',
        description: '透明代理配置已保存',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error?.message || String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          <h3 className="text-lg font-semibold">多工具透明代理</h3>
        </div>
        <Button
          type="button"
          variant={hasUnsavedChanges ? 'default' : 'outline'}
          size="sm"
          onClick={handleSaveConfigs}
          disabled={savingConfig}
          className={hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          {savingConfig ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" />
              {hasUnsavedChanges ? '保存配置 (有未保存修改)' : '保存配置'}
            </>
          )}
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-medium">功能说明：</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>支持 Claude Code、Codex、Gemini CLI 三个工具的透明代理</li>
            <li>三个代理可以同时运行，互不干扰</li>
            <li>切换配置无需重启终端，配置实时生效</li>
            <li>启用后需要在各工具的配置中设置对应的代理地址</li>
          </ul>
        </div>
      </div>

      <Separator />

      {/* 会话级端点配置开关 */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">会话级端点配置</Label>
          <p className="text-xs text-muted-foreground">
            允许为每个代理会话单独配置 API 端点，支持多账户、多配置灵活切换
          </p>
        </div>
        <Switch
          checked={sessionEndpointConfigEnabled}
          onCheckedChange={async (checked) => {
            try {
              await setSessionEndpointConfigEnabled(checked);
              toast({
                title: checked ? '已开启' : '已关闭',
                description: checked
                  ? '会话级端点配置已启用，可在透明代理管理页面为每个会话单独设置端点'
                  : '会话级端点配置已关闭',
              });
            } catch (error) {
              toast({
                title: '操作失败',
                description: String(error),
                variant: 'destructive',
              });
            }
          }}
        />
      </div>

      <div className="space-y-4">
        {SUPPORTED_TOOLS.map((tool) => (
          <ToolProxyCard
            key={tool.id}
            tool={tool}
            config={getToolConfig(tool.id)}
            status={getToolStatus(tool.id)}
            isLoading={isToolLoading(tool.id)}
            onConfigChange={(updates) => updateToolConfig(tool.id, updates)}
            onGenerateApiKey={() => generateApiKey(tool.id)}
            onStart={() => handleStart(tool.id)}
            onStop={() => handleStop(tool.id)}
          />
        ))}
      </div>

      <div className="mt-4 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>提示：</strong>
          启动代理后，请将对应工具的 API 地址配置为{' '}
          <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">http://127.0.0.1:端口</code>
          ，API Key 设置为上面生成的保护密钥。
        </p>
      </div>
    </div>
  );
}
