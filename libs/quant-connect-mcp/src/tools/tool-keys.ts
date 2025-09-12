export enum MCP_SERVER_TOOL_KEYS {
  READ_INFRA_HEALTH = 'read_infra_health',
  READ_MCP_SERVER_VERSION = 'read_mcp_server_version',
  READ_LATEST_MCP_SERVER_VERSION = 'read_latest_mcp_server_version',
}

export enum PROJECT_TOOL_KEYS {
  CREATE_PROJECT = 'create_project',
  READ_PROJECT = 'read_project',
  LIST_PROJECTS = 'list_projects',
  UPDATE_PROJECT = 'update_project',
  DELETE_PROJECT = 'delete_project',
}

export enum BACKTEST_TOOL_KEYS {
  CREATE_BACKTEST = 'create_backtest',
  READ_BACKTEST = 'read_backtest',
  READ_BACKTEST_REDUCED = 'read_backtest_reduced',
  LIST_BACKTESTS = 'list_backtests',
  READ_BACKTEST_CHART = 'read_backtest_chart',
  READ_BACKTEST_ORDERS = 'read_backtest_orders',
  READ_BACKTEST_INSIGHTS = 'read_backtest_insights',
  READ_BACKTEST_REPORT = 'read_backtest_report',
  UPDATE_BACKTEST = 'update_backtest',
  DELETE_BACKTEST = 'delete_backtest',
}

export enum FILE_TOOL_KEYS {
  CREATE_FILE = 'create_file',
  READ_FILE = 'read_file',
  UPDATE_FILE_NAME = 'update_file_name',
  UPDATE_FILE_CONTENTS = 'update_file_contents',
  DELETE_FILE = 'delete_file',
}

export enum COMPILE_TOOL_KEYS {
  CREATE_COMPILE = 'create_compile',
  READ_COMPILE = 'read_compile',
}

export enum ACCOUNT_TOOL_KEYS {
  READ_ACCOUNT = 'read_account',
}

export enum AI_TOOL_KEYS {
  CHECK_INITIALIZATION_ERRORS = 'check_initialization_errors',
  COMPLETE_CODE = 'complete_code',
  ENHANCE_ERROR_MESSAGE = 'enhance_error_message',
  UPDATE_CODE_TO_PEP8 = 'update_code_to_pep8',
  CHECK_SYNTAX = 'check_syntax',
  SEARCH_QUANTCONNECT = 'search_quantconnect',
}

export enum LEAN_VERSION_TOOL_KEYS {
  READ_LEAN_VERSIONS = 'read_lean_versions',
}

export enum LIVE_COMMAND_TOOL_KEYS {
  CREATE_LIVE_COMMAND = 'create_live_command',
  BROADCAST_LIVE_COMMAND = 'broadcast_live_command',
}

export enum LIVE_TOOL_KEYS {
  AUTHORIZE_CONNECTION_STEP1 = 'authorize_connection_step1',
  AUTHORIZE_CONNECTION_STEP2 = 'authorize_connection_step2',
  CREATE_LIVE_ALGORITHM = 'create_live_algorithm',
  READ_LIVE_ALGORITHM = 'read_live_algorithm',
  LIST_LIVE_ALGORITHMS = 'list_live_algorithms',
  READ_LIVE_CHART = 'read_live_chart',
  READ_LIVE_LOGS = 'read_live_logs',
  READ_LIVE_PORTFOLIO = 'read_live_portfolio',
  READ_LIVE_ORDERS = 'read_live_orders',
  READ_LIVE_INSIGHTS = 'read_live_insights',
  STOP_LIVE_ALGORITHM = 'stop_live_algorithm',
  LIQUIDATE_LIVE_ALGORITHM = 'liquidate_live_algorithm',
}

export enum OBJECT_STORE_TOOL_KEYS {
  UPLOAD_OBJECT = 'upload_object',
  READ_OBJECT_PROPERTIES = 'read_object_properties',
  READ_OBJECT_STORE_FILE_JOB_ID = 'read_object_store_file_job_id',
  READ_OBJECT_STORE_FILE_DOWNLOAD_URL = 'read_object_store_file_download_url',
  LIST_OBJECT_STORE_FILES = 'list_object_store_files',
  DELETE_OBJECT = 'delete_object',
}

export enum OPTIMIZATION_TOOL_KEYS {
  ESTIMATE_OPTIMIZAION_TIME = 'estimate_optimization_time',
  CREATE_OPTIMIZATION = 'create_optimization',
  READ_OPTIMIZATION = 'read_optimization',
  LIST_OPTIMIZATIONS = 'list_optimizations',
  UPDATE_OPTIMIZATION = 'update_optimization',
  ABORT_OPTIMIZATION = 'abort_optimization',
  DELETE_OPTIMIZATION = 'delete_optimization',
}

export enum PROJECT_COLLABORATION_TOOL_KEYS {
  CREATE_PROJECT_COLLABORATOR = 'create_project_collaborator',
  READ_PROJECT_COLLABORATORS = 'read_project_collaborators',
  UPDATE_PROJECT_COLLABORATOR = 'update_project_collaborator',
  DELETE_PROJECT_COLLABORATOR = 'delete_project_collaborator',
  LOCK_PROJECT_WITH_COLLABORATORS = 'lock_project_with_collaborators',
}

export enum PROJECT_NODE_TOOL_KEYS {
  READ_PROJECT_NODES = 'read_project_nodes',
  UPDATE_PROJECT_NODES = 'update_project_nodes',
}

export type TOOL_KEYS =
  | MCP_SERVER_TOOL_KEYS
  | PROJECT_TOOL_KEYS
  | BACKTEST_TOOL_KEYS
  | FILE_TOOL_KEYS
  | COMPILE_TOOL_KEYS
  | ACCOUNT_TOOL_KEYS
  | AI_TOOL_KEYS
  | LEAN_VERSION_TOOL_KEYS
  | LIVE_COMMAND_TOOL_KEYS
  | LIVE_TOOL_KEYS
  | OBJECT_STORE_TOOL_KEYS
  | OPTIMIZATION_TOOL_KEYS
  | PROJECT_COLLABORATION_TOOL_KEYS
  | PROJECT_NODE_TOOL_KEYS
