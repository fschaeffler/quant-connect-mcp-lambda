import {
  backtestInitAiToolBody,
  backtestInitAiToolResponse,
  completeAiToolBody,
  completeAiToolResponse,
  errorEnhanceAiToolBody,
  errorEnhanceAiToolResponse,
  pep8ConvertAiToolBody,
  pep8ConvertAiToolResponse,
  searchAiToolBody,
  searchAiToolResponse,
  syntaxCheckAiToolBody,
  syntaxCheckAiToolResponse,
} from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { AI_TOOL_KEYS } from './tool-keys'

export const getAIToolsDefinitions: ToolRegistrationDefinitions<AI_TOOL_KEYS> = {
  [AI_TOOL_KEYS.CHECK_INITIALIZATION_ERRORS]: {
    config: {
      title: 'Check initialization errors',
      description: 'Run a backtest for a few seconds to initialize the algorithm and get inialization errors if any.',
      inputSchema: backtestInitAiToolBody.shape,
      outputSchema: backtestInitAiToolResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/ai/tools/backtest-init',
  },
  [AI_TOOL_KEYS.COMPLETE_CODE]: {
    config: {
      title: 'Complete code',
      description: 'Show the code completion for a specific text input.',
      inputSchema: completeAiToolBody.shape,
      outputSchema: completeAiToolResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/ai/tools/complete',
  },
  [AI_TOOL_KEYS.ENHANCE_ERROR_MESSAGE]: {
    config: {
      title: 'Enhance error message',
      description: 'Show additional context and suggestions for error messages.',
      inputSchema: errorEnhanceAiToolBody.shape,
      outputSchema: errorEnhanceAiToolResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/ai/tools/error-enhance',
  },
  [AI_TOOL_KEYS.UPDATE_CODE_TO_PEP8]: {
    config: {
      title: 'Update code to PEP8',
      description: 'Update Python code to follow PEP8 style.',
      inputSchema: pep8ConvertAiToolBody.shape,
      outputSchema: pep8ConvertAiToolResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/ai/tools/pep8-convert',
  },
  [AI_TOOL_KEYS.CHECK_SYNTAX]: {
    config: {
      title: 'Check syntax',
      description: 'Check the syntax of a code.',
      inputSchema: syntaxCheckAiToolBody.shape,
      outputSchema: syntaxCheckAiToolResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/ai/tools/syntax-check',
  },
  [AI_TOOL_KEYS.SEARCH_QUANTCONNECT]: {
    config: {
      title: 'Search QuantConnect',
      description: 'Search for content in QuantConnect.',
      inputSchema: searchAiToolBody.shape,
      outputSchema: searchAiToolResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/ai/tools/search',
  },
}
