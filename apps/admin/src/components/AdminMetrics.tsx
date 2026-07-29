import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Card, Col, Row, Statistic, Typography } from "antd";
import type { ReactNode } from "react";

export interface AdminMetric {
  key: string;
  title: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  suffix?: string;
  trend?: number;
}

export function AdminMetrics({ items, loading = false }: { items: AdminMetric[]; loading?: boolean }) {
  return (
    <Row gutter={[16, 16]} className="lumi-metrics">
      {items.map((item) => (
        <Col key={item.key} xs={12} md={12} xl={24 / Math.min(items.length, 4)}>
          <Card loading={loading} className="lumi-metric-card">
            <div className="lumi-metric-icon" style={{ color: item.color, background: `${item.color}16` }}>
              {item.icon}
            </div>
            <Statistic title={item.title} value={item.value} suffix={item.suffix} />
            {typeof item.trend === "number" ? (
              <Typography.Text type={item.trend >= 0 ? "success" : "danger"} className="lumi-metric-trend">
                {item.trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {Math.abs(item.trend)}%
              </Typography.Text>
            ) : null}
          </Card>
        </Col>
      ))}
    </Row>
  );
}
