/**
 * 生图任务轮询的唯一入口：页面不再自建 setTimeout 轮询链。
 * 生成进度由服务端 watchdog 推进，这里只负责把最新状态拉给 UI。
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

let pollTimer: ReturnType<typeof setTimeout> | undefined;
let pollingJobId = "";
let stoppedByLifecycle = false;
let lastOptions: JobPollingOptions | undefined;

function schedule(options: JobPollingOptions, intervalMs: number) {
  pollTimer = setTimeout(() => void runTick(options), intervalMs);
}

async function runTick(options: JobPollingOptions) {
  if (pollingJobId !== options.jobId) return;
  try {
    const finished = await options.tick(options.jobId);
    if (finished || pollingJobId !== options.jobId) return;
    schedule(options, options.intervalMs ?? DEFAULT_INTERVAL_MS);
  } catch (error) {
    if (pollingJobId !== options.jobId) return;
    options.onError?.(error);
    schedule(options, options.errorIntervalMs ?? DEFAULT_ERROR_INTERVAL_MS);
  }
}

export function startJobPolling(options: JobPollingOptions) {
  stopJobPolling();
  pollingJobId = options.jobId;
  stoppedByLifecycle = false;
  lastOptions = options;
  schedule(options, 0);
}

export function stopJobPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = undefined;
  pollingJobId = "";
  lastOptions = undefined;
  stoppedByLifecycle = false;
}

/** 页面 onHide 时暂停，onShow 用 resumeJobPolling 续上。 */
export function pauseJobPolling() {
  if (!pollingJobId) return;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = undefined;
  stoppedByLifecycle = true;
}

export function resumeJobPolling() {
  if (!stoppedByLifecycle || !lastOptions || !pollingJobId) return;
  stoppedByLifecycle = false;
  schedule(lastOptions, 0);
}

export function activePolledJobId() {
  return pollingJobId;
}
