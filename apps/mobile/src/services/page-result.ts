// 分页响应的统一形状（/generate 与 /engine 分页接口一致）
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
