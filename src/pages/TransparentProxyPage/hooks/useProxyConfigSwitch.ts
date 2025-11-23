// 代理配置切换 Hook
// 用于透明代理开关框内的配置切换功能

import { useState, useCallback } from 'react';
import { listProfiles, switchProfile } from '@/lib/tauri-commands';
import type { ToolId } from '../types/proxy-history';

/**
 * 代理配置切换 Hook
 *
 * 功能：
 * - 加载指定工具的配置列表
 * - 切换配置（复用后端 switch_profile 命令）
 */
export function useProxyConfigSwitch(toolId: ToolId) {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 加载配置列表
   */
  const loadProfiles = useCallback(async () => {
    try {
      const profileList = await listProfiles(toolId);
      setProfiles(profileList);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      setProfiles([]);
    }
  }, [toolId]);

  /**
   * 切换配置
   * @param profile - 配置名称
   * @returns 操作结果
   */
  const switchConfig = useCallback(
    async (profile: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      try {
        await switchProfile(toolId, profile);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      } finally {
        setLoading(false);
      }
    },
    [toolId],
  );

  return {
    /** 配置列表 */
    profiles,
    /** 加载状态 */
    loading,
    /** 加载配置列表 */
    loadProfiles,
    /** 切换配置 */
    switchConfig,
  };
}
