/**
 * 生图任务轮询的唯一入口：页面不再自建 setTimeout 轮询链。
 * 生成进度由服务端 watchdog 推进，这里只负责把最新状态拉给 UI。
 * 支持同一用户最多 5 个任务并行轮询，每个任务独立计时与错误退避。
 */
export interface JobPollingOptions {
  jobId: string;
  /** 返回 true 表示任务已到终态，轮询结束。 */
  tick: (jobId: string) => Promise<boolean>;
  onError?: (error: unknown) => void;
  intervalMs?: number;
  errorIntervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_ERROR_INTERVAL_MS = 5000;
const MAX_ERROR_INTERVAL_MS = 15_000;

interface PollingEntry {
  options: JobPollingOptions;
  timer?: ReturnType<typeof setTimeout>;
  consecutiveErrors: number;
}

const entries = new Map<string, PollingEntry>();
let lifecyclePaused = false;

function clearEntryTimer(entry: PollingEntry) {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = undefined;
}

function schedule(entry: PollingEntry, intervalMs: number) {
  clearEntryTimer(entry);
  entry.timer = setTimeout(() => void runTick(entry), intervalMs);
}

async function runTick(entry: PollingEntry) {
  entry.timer = undefined;
  const { options } = entry;
  if (entries.get(options.jobId) !== entry) return;
  try {
    const finished = await options.tick(options.jobId);
    if (entries.get(options.jobId) !== entry) return;
    entry.consecutiveErrors = 0;
    if (finished) {
      entries.delete(options.jobId);
      return;
    }
    if (!lifecyclePaused) schedule(entry, options.intervalMs ?? DEFAULT_INTERVAL_MS);
  } catch (error) {
    if (entries.get(options.jobId) !== entry) return;
    // 查询失败不等于任务失败：递增退避但封顶 15s，网络恢复后自动回到正常节奏。
    entry.consecutiveErrors += 1;
    options.onError?.(error);
    if (lifecyclePaused) return;
    const base = options.errorIntervalMs ?? DEFAULT_ERROR_INTERVAL_MS;
    schedule(entry, Math.min(base * entry.consecutiveErrors, MAX_ERROR_INTERVAL_MS));
  }
}

export function startJobPolling(options: JobPollingOptions) {
  stopJobPolling(options.jobId);
  const entry: PollingEntry = { options, consecutiveErrors: 0 };
  entries.set(options.jobId, entry);
  if (!lifecyclePaused) schedule(entry, 0);
}

export function stopJobPolling(jobId?: string) {
  if (jobId === undefined) {
    entries.forEach((entry) => clearEntryTimer(entry));
    entries.clear();
    return;
  }
  const entry = entries.get(jobId);
  if (!entry) return;
  clearEntryTimer(entry);
  entries.delete(jobId);
}

/** 页面 onHide 时暂停全部，onShow 用 resumeJobPolling 续上。 */
export function pauseJobPolling() {
  if (!entries.size) return;
  lifecyclePaused = true;
  entries.forEach((entry) => clearEntryTimer(entry));
}

export function resumeJobPolling() {
  if (!lifecyclePaused) return;
  lifecyclePaused = false;
  entries.forEach((entry) => {
    if (!entry.timer) schedule(entry, 0);
  });
}

export function activePolledJobIds() {
  return Array.from(entries.keys());
}
