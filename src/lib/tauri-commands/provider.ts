// 供应商管理命令模块
// 负责供应商的 CRUD、验证、工具实例选择

import { invoke } from '@tauri-apps/api/core';
import type {
  Provider,
  ToolInstanceSelection,
  _ProviderFormData,
  ProviderValidationResult,
} from './types';

/**
 * 列出所有供应商
 */
export async function listProviders(): Promise<Provider[]> {
  return invoke<Provider[]>('list_providers');
}

/**
 * 创建新供应商
 */
export async function createProvider(provider: Provider): Promise<Provider> {
  return invoke<Provider>('create_provider', { provider });
}

/**
 * 更新供应商
 */
export async function updateProvider(id: string, provider: Provider): Promise<Provider> {
  return invoke<Provider>('update_provider', { id, provider });
}

/**
 * 删除供应商
 */
export async function deleteProvider(id: string): Promise<void> {
  return invoke<void>('delete_provider', { id });
}

/**
 * 获取工具实例选择
 */
export async function getToolInstanceSelection(
  toolId: string,
): Promise<ToolInstanceSelection | null> {
  return invoke<ToolInstanceSelection | null>('get_tool_instance_selection', { toolId });
}

/**
 * 设置工具实例选择
 */
export async function setToolInstanceSelection(selection: ToolInstanceSelection): Promise<void> {
  return invoke<void>('set_tool_instance_selection', { selection });
}

/**
 * 验证供应商配置（检查 API 连通性，获取用户名）
 */
export async function validateProviderConfig(
  provider: Provider,
): Promise<ProviderValidationResult> {
  try {
    return await invoke<ProviderValidationResult>('validate_provider_config', { provider });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
