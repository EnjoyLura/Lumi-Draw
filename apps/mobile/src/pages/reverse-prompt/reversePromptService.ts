import { api } from "../../services/api";

export interface ReversePromptResult {
  prompt: string;
  costCredits: number;
  creditsAfter: number;
  provider: string;
}

export function reversePrompt(payload: { imageUrl: string; hint?: string }) {
  return api.post<ReversePromptResult>("/generate/reverse-prompt", payload);
}
