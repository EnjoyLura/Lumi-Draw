import {
  EyeInvisibleOutlined,
  FileImageOutlined,
  PlusOutlined,
  StarOutlined,
  ThunderboltOutlined
} from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Image,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  type TableProps
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminMetrics } from "../components/AdminMetrics";
import {
  apiFeatureWork,
  apiGetWorksPage,
  apiGetWorksSummary,
  apiRecommendWork,
  type AdminWorksSummary,
  type AdminWorkQuery
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, userName, type AdminWork } from "../data/mock";
import { getWorks } from "../data/service";
import { useNav } from "../shell/NavContext";
import { WorkUploadForm } from "./WorkUploadForm";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: Array<{ label: string; value: "all" | NonNullable<AdminWorkQuery["status"]> }> = [
  { label: "全部状态", value: "all" },
  { label: "已发布", value: "published" },
  { label: "待审核", value: "pending" },
  { label: "已下架", value: "offline" },
  { label: "已驳回", value: "rejected" },
  { label: "草稿", value: "draft" }
];

const STATUS_TO_CN: Record<string, string> = {
  published: "已发布",
  pending: "待审核",
  offline: "已下架",
  rejected: "已驳回",
  draft: "草稿"
};

function statusColor(status: string) {
  if (status === "已发布") return "success";
  if (status === "待审核") return "warning";
  if (status === "已下架" || status === "已驳回") return "error";
  return "default";
}

export function Works() {
  const { go, openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const queryClient = useQueryClient();
  const [urlParams, setUrlParams] = useSearchParams();
  const [page, setPage] = useState(() => Math.max(1, Number(urlParams.get("page")) || 1));
  const [keyword, setKeyword] = useState(() => urlParams.get("keyword") || "");
  const [searchKeyword, setSearchKeyword] = useState(() => urlParams.get("keyword") || "");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>(() => {
    const value = urlParams.get("status");
    return STATUS_OPTIONS.some((item) => item.value === value)
      ? value as (typeof STATUS_OPTIONS)[number]["value"]
      : "all";
  });
  const [special, setSpecial] = useState<"all" | "featured" | "recommend">(() => {
    const value = urlParams.get("special");
    return value === "featured" || value === "recommend" ? value : "all";
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    if (urlParams.get("mock") === "1") next.mock = "1";
    if (page > 1) next.page = String(page);
    if (searchKeyword) next.keyword = searchKeyword;
    if (status !== "all") next.status = status;
    if (special !== "all") next.special = special;
    setUrlParams(next, { replace: true });
  }, [page, searchKeyword, setUrlParams, special, status]);

  const worksQuery = useQuery({
    queryKey: ["admin", "works", { page, searchKeyword, status, special }],
    queryFn: () => apiGetWorksPage({
      page,
      pageSize: PAGE_SIZE,
      keyword: searchKeyword,
      status: status === "all" ? undefined : status,
      featured: special === "featured" ? true : undefined,
      recommend: special === "recommend" ? true : undefined
    }),
    enabled: !useMock,
    placeholderData: keepPreviousData
  });
  const summaryQuery = useQuery({
    queryKey: ["admin", "works", "summary"],
    queryFn: apiGetWorksSummary,
    enabled: !useMock,
    staleTime: 30_000
  });

  const mockRows = useMemo(() => {
    const query = searchKeyword.trim().toLowerCase();
    return getWorks().filter((work) => {
      if (status !== "all" && work.status !== STATUS_TO_CN[status]) return false;
      if (special === "featured" && !work.featured) return false;
      if (special === "recommend" && !work.recommend) return false;
      return !query
        || work.title.toLowerCase().includes(query)
        || work.prompt.toLowerCase().includes(query)
        || (work.authorName || userName(work.userId)).toLowerCase().includes(query);
    });
  }, [searchKeyword, special, status]);

  const allMockWorks = getWorks();
  const localSummary: AdminWorksSummary = {
    total: allMockWorks.length,
    todayNew: 0,
    featured: allMockWorks.filter((work) => work.featured).length,
    offline: allMockWorks.filter((work) => work.status === "已下架").length
  };
  const summary = useMock ? localSummary : summaryQuery.data ?? localSummary;
  const rows = useMock
    ? mockRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : worksQuery.data?.items ?? [];
  const total = useMock ? mockRows.length : worksQuery.data?.total ?? 0;

  const refreshWorks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "works"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "works", "summary"] })
    ]);
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ work, kind, enabled }: { work: AdminWork; kind: "featured" | "recommend"; enabled: boolean }) => {
      if (useMock) {
        work[kind] = enabled;
        return work;
      }
      return kind === "featured"
        ? apiFeatureWork(work.id, enabled)
        : apiRecommendWork(work.id, enabled);
    },
    onSuccess: async (_, variables) => {
      toast(variables.enabled ? "设置已启用" : "设置已关闭");
      await refreshWorks();
    },
    onError: (reason) => toast(reason instanceof Error ? reason.message : "操作失败，请稍后重试")
  });

  const columns: TableProps<AdminWork>["columns"] = [
    {
      title: "作品",
      key: "work",
      width: 330,
      fixed: "left",
      render: (_, work) => (
        <Space size={12}>
          <Image
            width={64}
            height={64}
            preview={false}
            className="lumi-table-image"
            src={work.thumbnailUrl || work.imageUrl || IMG(`w${work.id}`)}
            fallback={IMG("placeholder")}
          />
          <div className="lumi-work-cell">
            <Typography.Text strong ellipsis={{ tooltip: work.title }}>{work.title || "未命名作品"}</Typography.Text>
            <Typography.Text type="secondary" ellipsis>
              {work.authorName || userName(work.userId)} · ID {work.id}
            </Typography.Text>
          </div>
        </Space>
      )
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value) => <Tag color={statusColor(value)}>{value}</Tag>
    },
    { title: "模型", dataIndex: "model", width: 150, ellipsis: true },
    { title: "规格", key: "spec", width: 130, render: (_, work) => `${work.ratio || "—"} / ${work.quality || "—"}` },
    { title: "获赞", dataIndex: "likes", width: 80, sorter: (a, b) => a.likes - b.likes },
    {
      title: "精选",
      dataIndex: "featured",
      width: 90,
      render: (value, work) => (
        <Switch
          size="small"
          checked={value}
          loading={toggleMutation.isPending && toggleMutation.variables?.work.id === work.id && toggleMutation.variables.kind === "featured"}
          onChange={(enabled) => toggleMutation.mutate({ work, kind: "featured", enabled })}
        />
      )
    },
    {
      title: "首页推荐",
      dataIndex: "recommend",
      width: 110,
      render: (value, work) => (
        <Switch
          size="small"
          checked={value}
          loading={toggleMutation.isPending && toggleMutation.variables?.work.id === work.id && toggleMutation.variables.kind === "recommend"}
          onChange={(enabled) => toggleMutation.mutate({ work, kind: "recommend", enabled })}
        />
      )
    },
    { title: "发布时间", dataIndex: "time", width: 120 },
    {
      title: "操作",
      key: "action",
      width: 90,
      fixed: "right",
      render: (_, work) => <Button type="link" onClick={() => go("workDetail", String(work.id))}>查看</Button>
    }
  ];

  const openUpload = () => {
    openSheet("上传并发布作品", <WorkUploadForm useMock={useMock} onPublished={() => void refreshWorks()} />);
  };

  return (
    <div className="lumi-admin-page">
      <AdminMetrics
        loading={!useMock && summaryQuery.isLoading}
        items={[
          { key: "total", title: "总作品", value: summary.total, icon: <FileImageOutlined />, color: "#5B9FE8" },
          { key: "today", title: "今日新增", value: summary.todayNew, icon: <ThunderboltOutlined />, color: "#22C55E" },
          { key: "featured", title: "精选作品", value: summary.featured, icon: <StarOutlined />, color: "#F59E0B" },
          { key: "offline", title: "已下架", value: summary.offline, icon: <EyeInvisibleOutlined />, color: "#EF4444" }
        ]}
      />
      <Card className="lumi-table-card">
        <div className="lumi-table-toolbar">
          <Space wrap>
            <Input.Search
              allowClear
              value={keyword}
              placeholder="搜索作品标题、提示词或作者"
              className="lumi-search-input"
              onChange={(event) => setKeyword(event.target.value)}
              onSearch={(value) => { setSearchKeyword(value.trim()); setPage(1); }}
            />
            <Select
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => { setStatus(value); setPage(1); }}
            />
            <Select
              value={special}
              options={[
                { label: "全部推荐状态", value: "all" },
                { label: "精选作品", value: "featured" },
                { label: "首页推荐", value: "recommend" }
              ]}
              onChange={(value) => { setSpecial(value); setPage(1); }}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openUpload}>上传作品</Button>
        </div>
        <Table<AdminWork>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={!useMock && worksQuery.isFetching}
          scroll={{ x: 1280 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (value) => `共 ${value} 条`
          }}
          onChange={(pagination) => setPage(pagination.current || 1)}
          onRow={(work) => ({ onDoubleClick: () => go("workDetail", String(work.id)) })}
        />
      </Card>
    </div>
  );
}
