// Remote Token Types
//
// NEW API 远程令牌类型定义

/**
 * 远程令牌
 */
export interface RemoteToken {
  id: number;
  user_id: number;
  name: string;
  key: string;
  group: string;
  remain_quota: number;
  used_quota: number;
  expired_time: number;
  status: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits: string;
  allow_ips: string;
  cross_group_retry: boolean;
  created_time: number;
  accessed_time: number;
}

/**
 * 远程令牌分组
 */
export interface RemoteTokenGroup {
  id: string;
  desc: string;
  ratio: number;
}

/**
 * 创建远程令牌请求
 */
export interface CreateRemoteTokenRequest {
  name: string;
  group_id: string;
  quota: number;
  expire_days: number;
}

/**
 * 导入令牌为 Profile 请求
 */
export interface ImportTokenAsProfileRequest {
  provider_id: string;
  remote_token: RemoteToken;
  tool_id: string;
  profile_name: string;
}

/**
 * 创建自定义 Profile 请求
 */
export interface CreateCustomProfileRequest {
  tool_id: string;
  profile_name: string;
  api_key: string;
  base_url: string;
  extra_config?: {
    wire_api?: string; // Codex specific
    model?: string; // Gemini specific
  };
}

/**
 * 令牌状态枚举
 */
export enum TokenStatus {
  Enabled = 1,
  Disabled = 2,
  Expired = 3,
  Exhausted = 4,
}

/**
 * 令牌状态文本映射
 */
export const TOKEN_STATUS_TEXT: Record<TokenStatus, string> = {
  [TokenStatus.Enabled]: '启用',
  [TokenStatus.Disabled]: '禁用',
  [TokenStatus.Expired]: '已过期',
  [TokenStatus.Exhausted]: '已用尽',
};

/**
 * 令牌状态颜色映射（用于 Badge）
 */
export const TOKEN_STATUS_VARIANT: Record<
  TokenStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [TokenStatus.Enabled]: 'default',
  [TokenStatus.Disabled]: 'secondary',
  [TokenStatus.Expired]: 'destructive',
  [TokenStatus.Exhausted]: 'outline',
};
