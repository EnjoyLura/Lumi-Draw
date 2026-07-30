import {
  CrownOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Avatar, Button, Card, Input, Select, Space, Table, Tag, Typography, type TableProps } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminMetrics } from "../components/AdminMetrics";
import { apiGetUsersPage, apiGetUsersSummary, type AdminUsersSummary } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { getUsers } from "../data/service";
import type { AdminUser } from "../data/mock";
import { useNav } from "../shell/NavContext";

const PAGE_SIZE = 20;

function isToday(dateText: string) {
  const date = new Date(dateText);
  const now = new Date();
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function Users() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const [urlParams, setUrlParams] = useSearchParams();
  const [page, setPage] = useState(() => Math.max(1, Number(urlParams.get("page")) || 1));
  const [keyword, setKeyword] = useState(() => urlParams.get("keyword") || "");
  const [searchKeyword, setSearchKeyword] = useState(() => urlParams.get("keyword") || "");
  const [status, setStatus] = useState<"all" | "normal" | "banned">(() => {
    const value = urlParams.get("status");
    return value === "normal" || value === "banned" ? value : "all";
  });
  const [member, setMember] = useState<"all" | "member">(() => urlParams.get("member") === "member" ? "member" : "all");

  useEffect(() => {
    const next: Record<string, string> = {};
    if (urlParams.get("mock") === "1") next.mock = "1";
    if (page > 1) next.page = String(page);
    if (searchKeyword) next.keyword = searchKeyword;
    if (status !== "all") next.status = status;
    if (member !== "all") next.member = member;
    setUrlParams(next, { replace: true });
  }, [member, page, searchKeyword, setUrlParams, status]);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { page, searchKeyword, status, member }],
    queryFn: () => apiGetUsersPage({
      page,
      pageSize: PAGE_SIZE,
      keyword: searchKeyword,
      status: status === "all" ? undefined : status,
      member: member === "member" ? "member" : undefined
    }),
    enabled: !useMock,
    placeholderData: keepPreviousData
  });
  const summaryQuery = useQuery({
    queryKey: ["admin", "users", "summary"],
    queryFn: apiGetUsersSummary,
    enabled: !useMock,
    staleTime: 30_000
  });

  const mockRows = useMemo(() => {
    const query = searchKeyword.trim().toLowerCase();
    return getUsers().filter((user) => {
      if (status === "banned" && user.status !== "封禁") return false;
      if (status === "normal" && user.status === "封禁") return false;
      if (member === "member" && user.member === "无") return false;
      return !query
        || user.name.toLowerCase().includes(query)
        || String(user.id).includes(query)
        || user.phone.includes(query);
    });
  }, [member, searchKeyword, status]);

  const localSummary: AdminUsersSummary = {
    total: getUsers().length,
    todayNew: getUsers().filter((user) => isToday(user.reg)).length,
    members: getUsers().filter((user) => user.member !== "无").length,
    banned: getUsers().filter((user) => user.status === "封禁").length
  };
  const summary = useMock ? localSummary : summaryQuery.data ?? localSummary;
  const rows = useMock
    ? mockRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : usersQuery.data?.items ?? [];
  const total = useMock ? mockRows.length : usersQuery.data?.total ?? 0;

  const columns: TableProps<AdminUser>["columns"] = [
    {
      title: "用户",
      key: "user",
      width: 230,
      fixed: "left",
      render: (_, user) => (
        <Space size={12}>
          <Avatar style={{ background: user.color }}>{user.avatar}</Avatar>
          <div>
            <Typography.Text strong>{user.name}</Typography.Text>
            <div><Typography.Text type="secondary">ID {user.id}</Typography.Text></div>
          </div>
        </Space>
      )
    },
    { title: "手机号", dataIndex: "phone", width: 140, render: (value) => value || "—" },
    {
      title: "会员",
      dataIndex: "member",
      width: 120,
      render: (value) => value === "无" ? <Typography.Text type="secondary">普通用户</Typography.Text> : <Tag color="gold">{value}</Tag>
    },
    { title: "积分", dataIndex: "credits", width: 110, sorter: (a, b) => a.credits - b.credits },
    { title: "作品", dataIndex: "works", width: 90, sorter: (a, b) => a.works - b.works },
    { title: "获赞", dataIndex: "likes", width: 90, sorter: (a, b) => a.likes - b.likes },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value) => <Tag color={value === "封禁" ? "error" : "success"}>{value}</Tag>
    },
    { title: "注册时间", dataIndex: "reg", width: 130 },
    {
      title: "操作",
      key: "action",
      width: 90,
      fixed: "right",
      render: (_, user) => <Button type="link" onClick={() => go("userDetail", String(user.id))}>查看</Button>
    }
  ];

  const submitSearch = (value: string) => {
    setSearchKeyword(value.trim());
    setPage(1);
  };

  return (
    <div className="lumi-admin-page">
      <AdminMetrics
        loading={!useMock && summaryQuery.isLoading}
        items={[
          { key: "total", title: "总用户", value: summary.total, icon: <TeamOutlined />, color: "#5B9FE8" },
          { key: "today", title: "今日新增", value: summary.todayNew, icon: <UserAddOutlined />, color: "#22C55E" },
          { key: "members", title: "会员用户", value: summary.members, icon: <CrownOutlined />, color: "#F59E0B" },
          { key: "banned", title: "已封禁", value: summary.banned, icon: <SafetyCertificateOutlined />, color: "#EF4444" }
        ]}
      />

      <Card className="lumi-table-card">
        <div className="lumi-table-toolbar">
          <Space wrap>
            <Input.Search
              allowClear
              value={keyword}
              placeholder="搜索用户昵称、ID 或手机号"
              className="lumi-search-input"
              onChange={(event) => setKeyword(event.target.value)}
              onSearch={submitSearch}
            />
            <Select
              value={status}
              options={[
                { label: "全部状态", value: "all" },
                { label: "正常", value: "normal" },
                { label: "已封禁", value: "banned" }
              ]}
              onChange={(value) => { setStatus(value); setPage(1); }}
            />
            <Select
              value={member}
              options={[
                { label: "全部用户", value: "all" },
                { label: "会员用户", value: "member" }
              ]}
              onChange={(value) => { setMember(value); setPage(1); }}
            />
          </Space>
          <Typography.Text type="secondary">共 {total.toLocaleString("zh-CN")} 位用户</Typography.Text>
        </div>
        <Table<AdminUser>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={!useMock && usersQuery.isFetching}
          scroll={{ x: 1120 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (value) => `共 ${value} 条`
          }}
          onChange={(pagination) => setPage(pagination.current || 1)}
          onRow={(user) => ({
            onDoubleClick: () => go("userDetail", String(user.id))
          })}
        />
      </Card>
    </div>
  );
}
