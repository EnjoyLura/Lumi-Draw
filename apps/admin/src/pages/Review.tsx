import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  PieChartOutlined
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  type TableProps
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { AdminMetrics } from "../components/AdminMetrics";
import {
  apiApproveReview,
  apiGetReports,
  apiGetReviewSummary,
  apiGetReviews,
  apiRejectReview,
  apiResolveReport,
  type AdminReportData,
  type AdminReviewSummary,
  type AdminWorkDetailData
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { IMG, REPORTS, WORKS, userName, type AdminReport, type AdminWork } from "../data/mock";
import { getReports, getWorks } from "../data/service";
import { useNav } from "../shell/NavContext";

const MODERATION_STATUS_TEXT: Record<string, string> = {
  unchecked: "未提交",
  submitting: "正在提交",
  pending: "微信审核中",
  pass: "已通过",
  review: "待人工复核",
  risky: "未通过",
  failed: "审核服务异常",
  skipped: "已关闭"
};

export function moderationStatusText(status?: string) {
  return MODERATION_STATUS_TEXT[status || ""] || "未提交";
}

export function RejectForm({
  work,
  useMock = true,
  onAfter
}: {
  work: AdminWork;
  useMock?: boolean;
  onAfter?: () => void;
}) {
  const { closeSheet, toast } = useNav();
  const [saving, setSaving] = useState(false);

  const submit = async ({ reason, description }: { reason: string; description?: string }) => {
    setSaving(true);
    try {
      const finalReason = description?.trim() || reason;
      if (useMock) work.status = "已下架";
      else await apiRejectReview(work.id, finalReason);
      closeSheet();
      onAfter?.();
      toast("作品已拒绝并下架");
    } catch (reasonValue) {
      toast(reasonValue instanceof Error ? reasonValue.message : "拒绝失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      layout="vertical"
      initialValues={{ reason: "低质量内容" }}
      requiredMark={false}
      onFinish={(values) => void submit(values)}
    >
      <Form.Item label="拒绝原因" name="reason" rules={[{ required: true }]}>
        <Select
          options={["色情低俗", "违法违规", "侵权盗版", "低质量内容", "其他"].map((value) => ({ label: value, value }))}
        />
      </Form.Item>
      <Form.Item label="补充说明" name="description">
        <Input.TextArea rows={4} maxLength={200} showCount placeholder="可填写更具体的原因，便于作者修改" />
      </Form.Item>
      <Space className="lumi-drawer-actions">
        <Button onClick={closeSheet}>取消</Button>
        <Button type="primary" danger htmlType="submit" loading={saving}>确认拒绝</Button>
      </Space>
    </Form>
  );
}

function HandleReportForm({
  report,
  useMock,
  onDone
}: {
  report: AdminReport | AdminReportData;
  useMock: boolean;
  onDone: () => void;
}) {
  const { closeSheet, toast } = useNav();
  const [saving, setSaving] = useState(false);

  const submit = async (action: "offline" | "warn" | "ignore") => {
    setSaving(true);
    try {
      if (useMock) {
        if (action === "offline") {
          const work = WORKS.find((item) => item.id === report.workId);
          if (work) work.status = "已下架";
        }
        const index = REPORTS.findIndex((item) => item.id === report.id);
        if (index >= 0) REPORTS.splice(index, 1);
      } else {
        await apiResolveReport(report.id, action);
      }
      closeSheet();
      onDone();
      toast(action === "ignore" ? "举报已驳回" : "举报已处理");
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "处理失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={12} className="lumi-report-actions">
      <Button danger block loading={saving} onClick={() => void submit("offline")}>下架被举报作品</Button>
      <Button block loading={saving} onClick={() => void submit("warn")}>警告作者并标记已处理</Button>
      <Button block loading={saving} onClick={() => void submit("ignore")}>驳回举报（内容合规）</Button>
    </Space>
  );
}

export function Review({ param }: { param?: string }) {
  const { go, openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(param === "report" ? "report" : "work");

  useEffect(() => {
    if (param === "report") setTab("report");
  }, [param]);

  const reviewsQuery = useQuery({
    queryKey: ["admin", "reviews", "pending"],
    queryFn: () => apiGetReviews(),
    enabled: !useMock
  });
  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", "pending"],
    queryFn: apiGetReports,
    enabled: !useMock
  });
  const summaryQuery = useQuery({
    queryKey: ["admin", "review-summary"],
    queryFn: apiGetReviewSummary,
    enabled: !useMock
  });

  const works = useMock ? getWorks().filter((work) => work.status === "待审核") : reviewsQuery.data ?? [];
  const reports = useMock ? getReports().filter((report) => report.status === "待处理") : reportsQuery.data ?? [];
  const summary: AdminReviewSummary | undefined = useMock ? undefined : summaryQuery.data;
  const reload = async () => {
    if (!useMock) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "review-summary"] })
      ]);
    }
  };

  const approve = async (work: AdminWork) => {
    try {
      if (useMock) work.status = "已发布";
      else await apiApproveReview(work.id);
      toast("作品已通过审核");
      await reload();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "审核失败，请稍后重试");
    }
  };

  const reviewColumns = useMemo<TableProps<AdminWorkDetailData>["columns"]>(() => [
    {
      title: "待审作品",
      key: "work",
      width: 360,
      render: (_, work) => (
        <Space size={12}>
          <Image
            width={72}
            height={72}
            preview={false}
            className="lumi-table-image"
            src={work.thumbnailUrl || work.imageUrl || IMG(`w${work.id}`)}
          />
          <div className="lumi-review-work">
            <Typography.Text strong ellipsis={{ tooltip: work.title }}>{work.title || "未命名作品"}</Typography.Text>
            <Typography.Text type="secondary" ellipsis={{ tooltip: work.prompt }}>{work.prompt || "暂无提示词"}</Typography.Text>
            <Typography.Text type="secondary">{work.author?.name || work.authorName || userName(work.userId)}</Typography.Text>
          </div>
        </Space>
      )
    },
    {
      title: "文本审核",
      dataIndex: "textModerationStatus",
      width: 130,
      render: (value) => <Tag>{moderationStatusText(value)}</Tag>
    },
    {
      title: "图片审核",
      dataIndex: "imageModerationStatus",
      width: 130,
      render: (value) => {
        const text = moderationStatusText(value);
        const color = value === "pass" ? "success" : value === "risky" ? "error" : value === "pending" ? "processing" : "default";
        return <Tag color={color}>{text}</Tag>;
      }
    },
    { title: "风格", dataIndex: "style", width: 130, render: (value) => value || "—" },
    { title: "提交时间", dataIndex: "time", width: 120 },
    {
      title: "操作",
      key: "action",
      width: 230,
      fixed: "right",
      render: (_, work) => (
        <Space>
          <Button type="link" onClick={() => go("reviewDetail", String(work.id))}>详情</Button>
          <Button
            type="primary"
            disabled={["submitting", "pending"].includes(work.imageModerationStatus || "")}
            onClick={() => void approve(work)}
          >
            通过
          </Button>
          <Button danger onClick={() => openSheet("拒绝作品", <RejectForm work={work} useMock={useMock} onAfter={() => void reload()} />)}>
            拒绝
          </Button>
        </Space>
      )
    }
  ], [go, openSheet, useMock]);

  const reportColumns = useMemo<TableProps<AdminReportData>["columns"]>(() => [
    { title: "作品", dataIndex: "workTitle", width: 240, render: (value, report) => <Button type="link" onClick={() => go("reviewDetail", String(report.workId))}>{value || `作品 ${report.workId}`}</Button> },
    { title: "举报原因", dataIndex: "reason", width: 180, render: (value) => <Tag color="error">{value}</Tag> },
    { title: "举报人", dataIndex: "reporterName", width: 150 },
    { title: "提交时间", dataIndex: "time", width: 130 },
    { title: "状态", dataIndex: "status", width: 110, render: (value) => <Tag color={value === "待处理" ? "warning" : "default"}>{value}</Tag> },
    {
      title: "操作",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, report) => (
        <Button
          type="primary"
          ghost
          onClick={() => openSheet("处理举报", <HandleReportForm report={report} useMock={useMock} onDone={() => void reload()} />)}
        >
          处理举报
        </Button>
      )
    }
  ], [go, openSheet, useMock]);

  const reportRows: AdminReportData[] = reports.map((report) => {
    const detail = report as Partial<AdminReportData>;
    return {
      ...report,
      workTitle: typeof detail.workTitle === "string" ? detail.workTitle : `作品 ${report.workId}`,
      reporterName: typeof detail.reporterName === "string" ? detail.reporterName : userName(report.reporter)
    };
  });

  return (
    <div className="lumi-admin-page">
      <AdminMetrics
        items={[
          { key: "pending", title: "待审核作品", value: useMock ? works.length : summary?.pending ?? works.length, icon: <ClockCircleOutlined />, color: "#F59E0B" },
          { key: "reviewed", title: "今日已审", value: useMock ? 328 : summary?.reviewed ?? 0, icon: <CheckCircleOutlined />, color: "#22C55E" },
          { key: "rate", title: "通过率", value: useMock ? 94 : summary?.passRate ?? 0, suffix: "%", icon: <PieChartOutlined />, color: "#5B9FE8" },
          { key: "reports", title: "举报待处理", value: useMock ? reports.length : summary?.pendingReports ?? reports.length, icon: <FlagOutlined />, color: "#EF4444" }
        ]}
      />
      <Card className="lumi-table-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          className="lumi-table-tabs"
          items={[
            {
              key: "work",
              label: `作品审核 ${works.length ? `(${works.length})` : ""}`,
              children: (
                <Table<AdminWorkDetailData>
                  rowKey="id"
                  columns={reviewColumns}
                  dataSource={works as AdminWorkDetailData[]}
                  loading={!useMock && reviewsQuery.isFetching}
                  scroll={{ x: 1120 }}
                  pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
                />
              )
            },
            {
              key: "report",
              label: `举报管理 ${reports.length ? `(${reports.length})` : ""}`,
              children: (
                <Table<AdminReportData>
                  rowKey="id"
                  columns={reportColumns}
                  dataSource={reportRows}
                  loading={!useMock && reportsQuery.isFetching}
                  scroll={{ x: 960 }}
                  pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
