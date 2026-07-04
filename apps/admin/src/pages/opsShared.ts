import { useReducer } from "react";

// 列表页就地修改模块数组后需要强制重渲染（原型的 refresh()）。
export function useRefresh(): () => void {
  return useReducer((c: number) => c + 1, 0)[1] as () => void;
}

export function moveItem<T>(arr: T[], idx: number, dir: number): void {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return;
  const t = arr[idx];
  arr[idx] = arr[j];
  arr[j] = t;
}
