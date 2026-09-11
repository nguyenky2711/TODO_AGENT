export interface FunctionDeclaration {
  name: string;
  description: string;
  category?: 'query' | 'mutation';
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  name: string;
  result: any;
  actionId?: string; // If logged in audit log
  requiresConfirmation?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  actionId?: string; // For instant undo
  pendingConfirmation?: {
    actionType: string;
    entityId: string;
    title: string;
    toolCall: ToolCall;
  };
}

export interface AgentRequest {
  messages?: ChatMessage[];
  contents?: any[];
  systemInstruction?: string;
  tools?: FunctionDeclaration[];
  apiKey?: string;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  rawParts?: any[];
}
