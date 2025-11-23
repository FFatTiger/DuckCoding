// 透明代理功能迁移提示组件
// 提示用户透明代理配置已移至专门页面

import { ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 透明代理迁移提示组件
 *
 * 功能：
 * - 显示功能迁移说明
 * - 提供跳转到透明代理管理页面的按钮
 */
export function TransparentProxyMigrationNotice() {
  const handleNavigate = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-transparent-proxy'));
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">透明代理功能已迁移</h3>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="space-y-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            为了提供更好的用户体验，透明代理的配置和管理功能已整合到专门的
            <strong>「透明代理」</strong>页面。
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1 ml-2">
            <li>每个工具（Claude Code、Codex、Gemini CLI）独立配置</li>
            <li>代理设置与会话管理集中在一处</li>
            <li>支持会话级端点配置（工具级开关）</li>
            <li>更直观的配置切换体验</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button onClick={handleNavigate} className="gap-2">
          前往透明代理管理
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        您之前的配置已自动保留，无需重新设置
      </p>
    </div>
  );
}
