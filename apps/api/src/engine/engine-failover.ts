import type { ProviderErrorKind } from "./engine.types";

export type FailureDecision = "retry-same" | "fallback" | "fail";

/** 立即终止、不重试也不换线路的错误：内容/参数问题换平台也没用。 */
const FATAL_KINDS: ReadonlySet<ProviderErrorKind> = new Set(["policy", "invalid_request", "size"]);

/**
 * 确定未送达、允许同线路快速重试的连接类错误。
 * 上游已受理且结果未知（maybeBilled）的提交绝不在此列——只能等确认或退款。
 */
const CONNECT_ONLY_KINDS: ReadonlySet<ProviderErrorKind> = new Set(["network"]);

/**
 * 故障转移决策（纯函数，穷举测试用）。
 * 原则：计费型提交禁止隐性重试；快速失败（≤15s 且明确未送达）优先同线路重试，
 * 超过每平台次数上限则切换备用线路；慢速失败直接退款，避免双倍上游计费。
 */
export function decideFailure(input: {
  kind: ProviderErrorKind;
  maybeBilled: boolean;
  latencyMs: number;
  attemptsForProvider: number;
  maxAttemptsPerProvider: number;
  quickFailureWindowMs: number;
  hasNextProvider: boolean;
}): FailureDecision {
  if (FATAL_KINDS.has(input.kind)) return "fail";
  if (input.maybeBilled) return "fail";
  const canRetrySame = input.latencyMs <= input.quickFailureWindowMs
    && CONNECT_ONLY_KINDS.has(input.kind)
    && input.attemptsForProvider < input.maxAttemptsPerProvider;
  if (canRetrySame) return "retry-same";
  return input.hasNextProvider ? "fallback" : "fail";
}
