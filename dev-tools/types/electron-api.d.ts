// types/electron-api.d.ts
// Complete types for OxichStudio Electron API - Used by main process and control interface

// === SERVER ===
export interface ServerStatus {
  running: boolean;
  port: number;
  hostname: string;
  pid: number | null;
  networkInfo?: NetworkInfo;
  monitoring?: PerformanceMetrics;
}

export interface ServerResponse {
  success: boolean;
  error?: string;
  code?: string;
  suggestions?: number[];
}

// === MONITORING ===
export interface PerformanceMetrics {
  uptime: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  isHealthy: boolean;
  lastHealthCheck: number | null;
  monitoringStarted: number | null;
  isMonitoring: boolean;
}

export interface DetailedMonitoringStatus {
  isMonitoring: boolean;
  serverPort: number | null;
  serverHostname: string | null;
  serverPid: number | null;
  metrics: PerformanceMetrics;
  healthCheckInterval: number;
  retryCount: number;
  maxRetries: number;
}

// === ERROR HANDLING ===
export interface ErrorInfo {
  id: string;
  timestamp: string;
  message: string;
  code: string;
  stack?: string;
  context: Record<string, unknown>;
  category: 'NETWORK' | 'SYSTEM' | 'PROCESS' | 'CONFIG' | 'SERVER' | 'VALIDATION' | 'UNKNOWN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  userMessage: string;
  recoverable: boolean;
  suggestedActions: string[];
}

export interface ErrorStatistics {
  total: number;
  recent: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recoveryAttempts: Record<string, number>;
}

// === SECURITY ===
export interface SecurityStats {
  allowedOrigins: string[];
  blockedIPs: string[];
  activeRateLimits: number;
  activeCSRFTokens: number;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
    blockDuration: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  value?: unknown;
}

// === NOTIFICATIONS ===
export interface ErrorNotification {
  id: string;
  timestamp: string;
  message: string;
  severity: string;
  userMessage: string;
  recoverable: boolean;
  suggestedActions: string[];
}

export interface RecoveryNotification {
  type: 'success' | 'failed' | 'error';
  message: string;
  errorId: string;
}

export interface PortChangeNotification {
  oldPort: number;
  newPort: number;
  reason: string;
}

export interface HealthWarning {
  retryCount: number;
  maxRetries: number;
}

export interface CriticalError {
  metrics: PerformanceMetrics;
}

// === NETWORK ===
export interface NetworkInfo {
  port: number;
  localIP: string;
  urls: {
    local: string;
    localhost: string;
    lan?: string;
  };
  allIPs: NetworkInterface[];
  enableLan: boolean;
  requiresAdmin: boolean;
  hostname: string;
  platform: string;
  architecture: string;
}

export interface NetworkInterface {
  interface: string;
  address: string;
  netmask: string;
}

export interface PortCheckResponse {
  available: boolean;
}

export interface PortSuggestionsResponse {
  suggestions: number[];
}

export interface PreferredPortResponse {
  port: number;
}

// === CONFIGURATION ===
export interface ConfigResponse {
  success: boolean;
  error?: string;
}

export interface ConfigValue {
  [key: string]: unknown;
}

// === LOGS ===
export interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  pid: number;
  data?: unknown;
  error?: {
    message: string;
    stack: string;
    name: string;
  };
}

export interface LogsResponse {
  logs: LogEntry[];
}

export interface LogsExportResponse {
  logs: string | null;
}

export interface LogsClearResponse {
  success: boolean;
  error?: string;
}

// === BACKUP ===
export interface BackupEntry {
  id: string;
  timestamp: string;
  description: string;
  configSnapshot: Record<string, unknown>;
  size: number;
  version: string;
  type: 'auto' | 'manual';
}

export interface BackupCreateOptions {
  description: string;
  type: 'auto' | 'manual';
  includeUserData: boolean;
}

export interface BackupCreateResponse {
  id: string;
  timestamp: string;
  description: string;
  configSnapshot: Record<string, unknown>;
  size: number;
  version: string;
}

export interface BackupRestoreResponse {
  success: boolean;
  error?: string;
}

export interface BackupDeleteResponse {
  success: boolean;
  error?: string;
}

export type BackupListResponse = BackupEntry[];

// === SYSTEM ===
export interface SystemVersions {
  electron: string;
  node: string;
  chrome: string;
  platform: string;
}

// === COMPLETE OXICHSTUDIO ELECTRON API ===
export interface ElectronAPI {
  // Server
  server: {
    getStatus(): Promise<ServerStatus>;
    start(config?: { port: number; hostname: string }): Promise<ServerResponse>;
    stop(): Promise<ServerResponse>;
  };

  // Configuration
  config: {
    get(keyPath: string, defaultValue?: unknown): Promise<unknown>;
    set(keyPath: string, value: unknown): Promise<ConfigResponse>;
    updateMultiple(updates: Record<string, unknown>): Promise<ConfigResponse>;
    reset(): Promise<ConfigResponse>;
    export(): Promise<string | null>;
    import(configString: string): Promise<ConfigResponse>;
  };

  // Network
  network: {
    getInfo(port?: number, enableLan?: boolean): Promise<NetworkInfo | null>;
    checkPort(port: number): Promise<PortCheckResponse>;
    suggestPorts(currentPort: number, count?: number): Promise<PortSuggestionsResponse>;
    findPreferredPort(configuredPort?: number): Promise<PreferredPortResponse>;
  };

  // Logs
  logs: {
    getRecent(limit?: number): Promise<LogsResponse>;
    export(): Promise<LogsExportResponse>;
    clear(): Promise<LogsClearResponse>;
  };

  // Backup
  backup: {
    create(options: BackupCreateOptions): Promise<BackupCreateResponse>;
    restore(backupId: string): Promise<BackupRestoreResponse>;
    delete(backupId: string): Promise<BackupDeleteResponse>;
    list(): Promise<BackupListResponse>;
  };

  // Monitoring
  monitoring: {
    getMetrics(): Promise<PerformanceMetrics | null>;
    getDetailedStatus(): Promise<DetailedMonitoringStatus | null>;
  };

  // Error handling
  errors: {
    getHistory(limit?: number): Promise<ErrorInfo[]>;
    getStatistics(): Promise<ErrorStatistics>;
    clearHistory(): Promise<ConfigResponse>;
  };

  // Security
  security: {
    getStats(): Promise<SecurityStats>;
    validateInput(input: unknown, type: string, options?: Record<string, unknown>): Promise<ValidationResult>;
  };

  // System
  system: {
    getVersions(): Promise<SystemVersions>;
  };

  // Utilities
  utils: {
    openExternal(url: string): Promise<void>;
  };

  // Events
  events: {
    onErrorNotification(callback: (errorInfo: ErrorNotification) => void): void;
    onRecoveryNotification(callback: (notification: RecoveryNotification) => void): void;
    onPortChanged(callback: (data: PortChangeNotification) => void): void;
    onServerHealthWarning(callback: (data: HealthWarning) => void): void;
    onServerCriticalError(callback: (data: CriticalError) => void): void;
    removeAllListeners(): void;
  };

  // Interface (Separated Architecture)
  interface: {
    switchToControl(): Promise<{ success: boolean }>;
    switchToApp(): Promise<{ success: boolean; url?: string; error?: string }>;
    getMode(): Promise<{ mode: string }>;
  };
}

// Global declaration for control interface (vanilla JavaScript)
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 