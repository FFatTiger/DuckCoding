// Dashboard 供应商和实例选择管理 Hook

import { useState, useEffect, useCallback } from 'react';
import {
  listProviders,
  getToolInstanceSelection,
  setToolInstanceSelection,
  getToolInstances,
  type Provider,
  type ToolInstanceSelection,
} from '@/lib/tauri-commands';
import type { ToolInstance } from '@/types/tool-management';

export function useDashboardProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [instanceSelections, setInstanceSelections] = useState<
    Record<string, ToolInstanceSelection>
  >({});
  // 所有工具实例（按工具ID分组）
  const [toolInstances, setToolInstances] = useState<Record<string, ToolInstance[]>>({});

  /**
   * 加载所有工具实例
   */
  const loadToolInstances = useCallback(async () => {
    try {
      const instances = await getToolInstances();
      setToolInstances(instances);
    } catch (error) {
      console.error('加载工具实例失败:', error);
    }
  }, []);

  /**
   * 加载所有供应商
   */
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const providerList = await listProviders();
      setProviders(providerList);
    } catch (error) {
      console.error('加载供应商失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 加载工具的实例选择
   */
  const loadInstanceSelection = useCallback(async (toolId: string) => {
    try {
      const selection = await getToolInstanceSelection(toolId);
      if (selection) {
        setInstanceSelections((prev) => ({
          ...prev,
          [toolId]: selection,
        }));
      }
    } catch (error) {
      console.error(`加载工具 ${toolId} 实例选择失败:`, error);
    }
  }, []);

  /**
   * 更新工具的实例选择
   */
  const handleSetInstanceSelection = useCallback(async (selection: ToolInstanceSelection) => {
    try {
      await setToolInstanceSelection(selection);
      setInstanceSelections((prev) => ({
        ...prev,
        [selection.tool_id]: selection,
      }));
      return { success: true };
    } catch (error) {
      console.error('设置实例选择失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, []);

  /**
   * 批量加载所有工具的实例选择
   */
  const loadAllInstanceSelections = useCallback(async () => {
    const toolIds = ['claude-code', 'codex', 'gemini-cli'];
    await Promise.all(toolIds.map((toolId) => loadInstanceSelection(toolId)));
  }, [loadInstanceSelection]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadProviders();
    loadToolInstances();
    loadAllInstanceSelections();
  }, [loadProviders, loadToolInstances, loadAllInstanceSelections]);

  /**
   * 获取工具的可用实例选项（用于下拉列表）
   * value: instance_id
   * label: [类型-版本]
   */
  const getInstanceOptions = useCallback(
    (toolId: string) => {
      const instances = toolInstances[toolId] || [];

      return instances.map((inst) => {
        // 类型显示文本
        const typeText =
          inst.tool_type === 'Local' ? '本地' : inst.tool_type === 'WSL' ? 'WSL' : 'SSH';

        // 版本显示
        const versionText = inst.version || '未知版本';

        return {
          value: inst.instance_id,
          label: `${typeText} - ${versionText}`,
        };
      });
    },
    [toolInstances],
  );

  return {
    providers,
    loading,
    instanceSelections,
    toolInstances,
    loadProviders,
    loadToolInstances,
    setInstanceSelection: handleSetInstanceSelection,
    getInstanceOptions,
  };
}
