use std::env;

/// 平台信息
#[derive(Debug, Clone)]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub is_windows: bool,
    pub is_macos: bool,
    pub is_linux: bool,
}

impl PlatformInfo {
    /// 获取当前平台信息
    pub fn current() -> Self {
        let os = env::consts::OS.to_string();
        let arch = env::consts::ARCH.to_string();

        PlatformInfo {
            is_windows: os == "windows",
            is_macos: os == "macos",
            is_linux: os == "linux",
            os,
            arch,
        }
    }

    /// 获取平台标识符（用于下载）
    pub fn platform_id(&self) -> String {
        match (self.os.as_str(), self.arch.as_str()) {
            ("macos", "aarch64") => "darwin-arm64".to_string(),
            ("macos", "x86_64") => "darwin-x64".to_string(),
            ("linux", "x86_64") => "linux-x64".to_string(),
            ("linux", "aarch64") => "linux-arm64".to_string(),
            ("windows", "x86_64") => "win32-x64".to_string(),
            ("windows", "aarch64") => "win32-arm64".to_string(),
            _ => format!("{}-{}", self.os, self.arch),
        }
    }

    /// 获取 PATH 分隔符
    pub fn path_separator(&self) -> &str {
        if self.is_windows {
            ";"
        } else {
            ":"
        }
    }

    /// 构建增强的 PATH 环境变量（合并模式：增强路径 + 当前 PATH）
    ///
    /// 策略：在当前 PATH 前追加工具常见路径，保留所有现有环境
    /// - 增强路径包含：Homebrew、npm global、nvm、用户 bin 等
    /// - 当前 PATH：继承系统/shell 的完整 PATH
    ///
    /// 示例（macOS）：
    /// ```
    /// /Users/user/.nvm/current/bin:/opt/homebrew/bin:/usr/local/bin:$PATH
    /// ```
    pub fn build_enhanced_path(&self) -> String {
        let separator = self.path_separator();

        // 实时获取当前 PATH（而非缓存），确保获得最新环境
        let current_path = env::var("PATH").unwrap_or_default();

        let system_paths = if self.is_windows {
            self.windows_system_paths()
        } else {
            self.unix_system_paths()
        };

        // 合并策略：增强路径在前（高优先级），当前 PATH 在后（保留完整环境）
        format!(
            "{}{}{}",
            system_paths.join(separator),
            separator,
            current_path
        )
    }

    /// Windows 系统路径
    fn windows_system_paths(&self) -> Vec<String> {
        let mut paths = vec![
            "C:\\Program Files\\nodejs".to_string(),
            "C:\\Program Files (x86)\\nodejs".to_string(),
        ];

        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            paths.push(format!("{local_app_data}\\Programs\\claude-code"));
            paths.push(format!("{local_app_data}\\Programs\\claude\\bin"));
        }

        if let Ok(user_profile) = env::var("USERPROFILE") {
            paths.push(format!("{user_profile}\\.claude\\bin"));
            paths.push(format!("{user_profile}\\.local\\bin"));
        }

        paths
    }

    /// Unix 系统路径
    fn unix_system_paths(&self) -> Vec<String> {
        let mut paths = vec![
            "/opt/homebrew/bin".to_string(),
            "/usr/local/bin".to_string(),
            "/usr/bin".to_string(),
            "/bin".to_string(),
            "/usr/sbin".to_string(),
            "/sbin".to_string(),
        ];

        if let Some(home_dir) = dirs::home_dir() {
            let home_str = home_dir.to_string_lossy();
            paths.insert(0, format!("{home_str}/.local/bin"));
            paths.insert(0, format!("{home_str}/.claude/bin"));
            paths.insert(0, format!("{home_str}/.claude/local"));

            // NVM 支持 - 增强检测逻辑（2025-12-11）
            // 策略：优先使用环境变量，然后尝试常见路径
            let mut nvm_detected = false;

            if let Ok(nvm_dir) = std::env::var("NVM_DIR") {
                // 检查 nvm current symlink
                let nvm_current = format!("{nvm_dir}/current/bin");
                if std::path::Path::new(&nvm_current).exists() {
                    paths.insert(0, nvm_current);
                    nvm_detected = true;
                } else {
                    // 如果没有 current symlink，尝试使用 default
                    let nvm_default = format!("{home_str}/.nvm/versions/node/default/bin");
                    if std::path::Path::new(&nvm_default).exists() {
                        paths.insert(0, nvm_default);
                        nvm_detected = true;
                    }
                }
            }

            // 即使没有 NVM_DIR 环境变量，也尝试常见的 nvm 路径（GUI 应用修复）
            if !nvm_detected {
                let fallback_nvm_paths = vec![
                    format!("{home_str}/.nvm/current/bin"),
                    format!("{home_str}/.nvm/versions/node/default/bin"),
                ];

                for nvm_path in fallback_nvm_paths {
                    if std::path::Path::new(&nvm_path).exists() {
                        paths.insert(0, nvm_path);
                        nvm_detected = true;
                        break;
                    }
                }
            }

            // 扫描 nvm 所有已安装版本，选择最新的（最后的兜底）
            if !nvm_detected {
                if let Ok(entries) = std::fs::read_dir(format!("{home_str}/.nvm/versions/node")) {
                    let mut versions: Vec<String> = entries
                        .filter_map(|e| e.ok())
                        .filter(|e| e.path().is_dir())
                        .filter_map(|e| e.file_name().to_str().map(|s| s.to_string()))
                        .collect();

                    // 简单排序（字母序，v20 > v18）
                    versions.sort();
                    if let Some(latest_version) = versions.last() {
                        let latest_bin =
                            format!("{home_str}/.nvm/versions/node/{latest_version}/bin");
                        if std::path::Path::new(&latest_bin).exists() {
                            paths.insert(0, latest_bin);
                            // nvm 路径已添加
                        }
                    }
                }
            }

            // npm global bin 支持 - 检查自定义 npm prefix
            if let Ok(npm_prefix) = std::env::var("NPM_CONFIG_PREFIX") {
                paths.insert(0, format!("{npm_prefix}/bin"));
            } else {
                // 默认 npm global bin 路径
                paths.push(format!("{home_str}/.npm-global/bin"));
            }

            // asdf 支持（2025-12-11 新增）
            // asdf 是另一个流行的版本管理器
            let asdf_dir =
                std::env::var("ASDF_DIR").unwrap_or_else(|_| format!("{home_str}/.asdf"));
            let asdf_shims = format!("{asdf_dir}/shims");
            if std::path::Path::new(&asdf_shims).exists() {
                paths.insert(0, asdf_shims);
            }

            // Volta 支持（2025-12-11 新增）
            let volta_home =
                std::env::var("VOLTA_HOME").unwrap_or_else(|_| format!("{home_str}/.volta"));
            let volta_bin = format!("{volta_home}/bin");
            if std::path::Path::new(&volta_bin).exists() {
                paths.insert(0, volta_bin);
            }
        }

        paths
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_detection() {
        let platform = PlatformInfo::current();
        assert!(!platform.os.is_empty());
        assert!(!platform.arch.is_empty());
    }

    #[test]
    fn test_path_separator() {
        let platform = PlatformInfo::current();
        if cfg!(windows) {
            assert_eq!(platform.path_separator(), ";");
        } else {
            assert_eq!(platform.path_separator(), ":");
        }
    }

    #[test]
    fn test_platform_id() {
        let platform = PlatformInfo::current();
        let id = platform.platform_id();
        assert!(id.contains("-"));
    }
}
