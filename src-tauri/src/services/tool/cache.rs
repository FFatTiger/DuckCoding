// 工具状态缓存模块
//
// 提供工具安装状态的缓存和并行检测功能，优化启动性能

use crate::models::{Tool, ToolStatus};
use crate::services::InstallerService;
use futures_util::future::join_all;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// 缓存的工具状态
#[derive(Debug, Clone)]
struct CachedToolStatus {
    status: ToolStatus,
}

/// 工具状态缓存
///
/// 提供以下功能：
/// - 并行检测所有工具状态
/// - 缓存检测结果，避免重复检测
/// - 支持手动清除缓存
pub struct ToolStatusCache {
    cache: Arc<RwLock<HashMap<String, CachedToolStatus>>>,
}

impl ToolStatusCache {
    /// 创建新的缓存实例
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 获取所有工具状态（优先使用缓存）
    ///
    /// 如果缓存命中，直接返回缓存结果（<10ms）
    /// 如果缓存未命中，并行检测所有工具（~1.3s）
    pub async fn get_all_status(&self) -> Vec<ToolStatus> {
        // 尝试从缓存读取
        {
            let cache = self.cache.read().await;
            let tools = Tool::all();

            // 检查是否所有工具都有缓存
            if tools.iter().all(|t| cache.contains_key(&t.id)) {
                return tools
                    .iter()
                    .filter_map(|t| cache.get(&t.id).map(|c| c.status.clone()))
                    .collect();
            }
        }

        // 缓存未命中，执行并行检测
        let statuses = self.detect_all_parallel().await;

        // 更新缓存
        {
            let mut cache = self.cache.write().await;
            for status in &statuses {
                cache.insert(
                    status.id.clone(),
                    CachedToolStatus {
                        status: status.clone(),
                    },
                );
            }
        }

        statuses
    }

    /// 并行检测所有工具状态
    ///
    /// 关键优化：
    /// 1. 使用 futures::join_all 并行执行
    /// 2. 合并 is_installed 和 get_version 为单个命令
    async fn detect_all_parallel(&self) -> Vec<ToolStatus> {
        let tools = Tool::all();

        // 并行检测所有工具
        let futures: Vec<_> = tools
            .into_iter()
            .map(|tool| async move { Self::detect_single_tool(tool).await })
            .collect();

        join_all(futures).await
    }

    /// 检测单个工具状态
    ///
    /// 优化：直接执行 --version 命令
    /// - 成功 = 已安装 + 获取版本
    /// - 失败 = 未安装
    async fn detect_single_tool(tool: Tool) -> ToolStatus {
        let installer = InstallerService::new();

        // 直接尝试获取版本，合并 is_installed 和 get_version
        let version = installer.get_installed_version(&tool).await;
        let installed = version.is_some();

        ToolStatus {
            id: tool.id,
            name: tool.name,
            installed,
            version,
        }
    }

    /// 清除所有缓存
    ///
    /// 在以下场景调用：
    /// - 安装工具完成后
    /// - 更新工具完成后
    /// - 用户手动刷新
    pub async fn clear(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }

    /// 清除指定工具的缓存
    #[allow(dead_code)]
    pub async fn clear_tool(&self, tool_id: &str) {
        let mut cache = self.cache.write().await;
        cache.remove(tool_id);
    }
}

impl Default for ToolStatusCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_creation() {
        let cache = ToolStatusCache::new();
        // 初始缓存应该为空，会触发检测
        let statuses = cache.get_all_status().await;
        assert_eq!(statuses.len(), 3); // 3 个工具
    }

    #[tokio::test]
    async fn test_cache_clear() {
        let cache = ToolStatusCache::new();
        // 首次获取，填充缓存
        let _ = cache.get_all_status().await;
        // 清除缓存
        cache.clear().await;
        // 再次获取应该重新检测
        let statuses = cache.get_all_status().await;
        assert_eq!(statuses.len(), 3);
    }
}
