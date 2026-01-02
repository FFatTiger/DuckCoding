// Dashboard 供应商和实例选择管理 Hook

import { useState, useEffect, useCallback } from 'react';
import {
  listProviders,
  getToolInstanceSelection,
  setToolInstanceSelection,
  type Provider,
  type ToolInstanceSelection,
} from '@/lib/tauri-commands';

export function useDashboardProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [instanceSelections, setInstanceSelections] = useState<
    Record<string, ToolInstanceSelection>
  >({});

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
    loadAllInstanceSelections();
  }, [loadProviders, loadAllInstanceSelections]);

  return {
    providers,
    loading,
    instanceSelections,
    loadProviders,
    setInstanceSelection: handleSetInstanceSelection,
  };
}
