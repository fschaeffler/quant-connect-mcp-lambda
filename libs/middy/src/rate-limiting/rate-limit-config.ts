import { z } from 'zod'

export enum RateLimitTier {
  CRITICAL = 'CRITICAL',     // Live trading operations
  HIGH = 'HIGH',             // Resource-intensive operations
  MEDIUM = 'MEDIUM',         // Management operations
  LOW = 'LOW',               // Read operations
}

export const RateLimitConfigSchema = z.object({
  tier: z.nativeEnum(RateLimitTier),
  windowMs: z.number().positive().describe('Time window in milliseconds'),
  maxRequests: z.number().positive().describe('Maximum requests per window'),
  blockDurationMs: z.number().positive().optional().describe('How long to block after limit exceeded'),
  skipSuccessfulRequests: z.boolean().optional().default(false),
  skipFailedRequests: z.boolean().optional().default(false),
  keyGenerator: z.function().args(z.string(), z.any()).returns(z.string()).optional(),
})

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>

// Default rate limiting configurations for different tiers
export const DEFAULT_RATE_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  [RateLimitTier.CRITICAL]: {
    tier: RateLimitTier.CRITICAL,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,       // Only 5 critical operations per minute
    blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes after limit exceeded
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  [RateLimitTier.HIGH]: {
    tier: RateLimitTier.HIGH,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,      // 10 high-risk operations per minute
    blockDurationMs: 2 * 60 * 1000, // Block for 2 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  [RateLimitTier.MEDIUM]: {
    tier: RateLimitTier.MEDIUM,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,      // 30 operations per minute
    blockDurationMs: 60 * 1000, // Block for 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't count failed requests
  },
  [RateLimitTier.LOW]: {
    tier: RateLimitTier.LOW,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,     // 100 read operations per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
  },
}

// Mapping of tool keys to rate limit tiers
export const TOOL_RATE_LIMIT_MAPPING: Record<string, RateLimitTier> = {
  // CRITICAL: Live trading operations that can cause immediate financial impact
  'create_live_algorithm': RateLimitTier.CRITICAL,
  'liquidate_live_algorithm': RateLimitTier.CRITICAL,
  'stop_live_algorithm': RateLimitTier.CRITICAL,
  'create_live_command': RateLimitTier.CRITICAL,
  'broadcast_live_command': RateLimitTier.CRITICAL,
  
  // HIGH: Resource-intensive operations and strategy development
  'create_backtest': RateLimitTier.HIGH,
  'create_optimization': RateLimitTier.HIGH,
  'create_compile': RateLimitTier.HIGH,
  'estimate_optimization_time': RateLimitTier.HIGH,
  'abort_optimization': RateLimitTier.HIGH,
  
  // MEDIUM: Management operations
  'create_project': RateLimitTier.MEDIUM,
  'update_project': RateLimitTier.MEDIUM,
  'delete_project': RateLimitTier.MEDIUM,
  'create_file': RateLimitTier.MEDIUM,
  'update_file_contents': RateLimitTier.MEDIUM,
  'delete_file': RateLimitTier.MEDIUM,
  'upload_object': RateLimitTier.MEDIUM,
  'delete_object': RateLimitTier.MEDIUM,
  'update_backtest': RateLimitTier.MEDIUM,
  'delete_backtest': RateLimitTier.MEDIUM,
  'delete_optimization': RateLimitTier.MEDIUM,
  'create_project_collaborator': RateLimitTier.MEDIUM,
  'update_project_collaborator': RateLimitTier.MEDIUM,
  'delete_project_collaborator': RateLimitTier.MEDIUM,
  'lock_project_with_collaborators': RateLimitTier.MEDIUM,
  'update_project_nodes': RateLimitTier.MEDIUM,
  
  // LOW: Read operations and informational endpoints
  'read_account': RateLimitTier.LOW,
  'read_project': RateLimitTier.LOW,
  'list_projects': RateLimitTier.LOW,
  'read_backtest': RateLimitTier.LOW,
  'read_backtest_reduced': RateLimitTier.LOW,
  'list_backtests': RateLimitTier.LOW,
  'read_backtest_chart': RateLimitTier.LOW,
  'read_backtest_orders': RateLimitTier.LOW,
  'read_backtest_insights': RateLimitTier.LOW,
  'read_backtest_report': RateLimitTier.LOW,
  'read_file': RateLimitTier.LOW,
  'read_compile': RateLimitTier.LOW,
  'read_live_algorithm': RateLimitTier.LOW,
  'list_live_algorithms': RateLimitTier.LOW,
  'read_live_chart': RateLimitTier.LOW,
  'read_live_logs': RateLimitTier.LOW,
  'read_live_portfolio': RateLimitTier.LOW,
  'read_live_orders': RateLimitTier.LOW,
  'read_live_insights': RateLimitTier.LOW,
  'read_optimization': RateLimitTier.LOW,
  'list_optimizations': RateLimitTier.LOW,
  'read_object_properties': RateLimitTier.LOW,
  'read_object_store_file_job_id': RateLimitTier.LOW,
  'read_object_store_file_download_url': RateLimitTier.LOW,
  'list_object_store_files': RateLimitTier.LOW,
  'read_project_collaborators': RateLimitTier.LOW,
  'read_project_nodes': RateLimitTier.LOW,
  'read_lean_versions': RateLimitTier.LOW,
  'read_infra_health': RateLimitTier.LOW,
  'read_mcp_server_version': RateLimitTier.LOW,
  'read_latest_mcp_server_version': RateLimitTier.LOW,
  'authorize_connection_step1': RateLimitTier.LOW,
  'authorize_connection_step2': RateLimitTier.LOW,
  
  // AI operations - medium risk due to potential resource usage
  'check_initialization_errors': RateLimitTier.MEDIUM,
  'complete_code': RateLimitTier.MEDIUM,
  'enhance_error_message': RateLimitTier.MEDIUM,
  'update_code_to_pep8': RateLimitTier.MEDIUM,
  'check_syntax': RateLimitTier.MEDIUM,
  'search_quantconnect': RateLimitTier.MEDIUM,
}

export function getRateLimitTier(toolName: string): RateLimitTier {
  return TOOL_RATE_LIMIT_MAPPING[toolName] ?? RateLimitTier.MEDIUM
}

export function getRateLimitConfig(tier: RateLimitTier, overrides?: Partial<RateLimitConfig>): RateLimitConfig {
  const baseConfig = DEFAULT_RATE_LIMITS[tier]
  return { ...baseConfig, ...overrides }
}