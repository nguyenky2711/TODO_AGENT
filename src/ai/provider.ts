import { AgentRequest, AgentResponse } from './types';

export interface LLMProvider {
  name: string;
  generate(request: AgentRequest): Promise<AgentResponse>;
}
