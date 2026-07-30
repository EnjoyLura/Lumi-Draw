import { ArrowRightOutlined } from "@ant-design/icons";
import { Card, Col, Row, Typography } from "antd";

export interface AdminFeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

export function AdminFeatureGrid({ items, onSelect }: { items: AdminFeatureItem[]; onSelect: (id: string) => void }) {
  return (
    <Row gutter={[16, 16]} className="lumi-feature-grid">
      {items.map((item) => (
        <Col key={item.id} xs={24} sm={12} xl={8}>
          <Card hoverable className="lumi-feature-card" onClick={() => onSelect(item.id)}>
            <span className="lumi-feature-card__icon" style={{ background: `${item.color}18`, color: item.color }}>{item.icon}</span>
            <div className="lumi-feature-card__content">
              <Typography.Text strong>{item.title}</Typography.Text>
              <Typography.Paragraph type="secondary">{item.description}</Typography.Paragraph>
              {item.badge ? <span className="lumi-feature-card__badge" style={{ color: item.color }}>{item.badge}</span> : null}
            </div>
            <ArrowRightOutlined className="lumi-feature-card__arrow" />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
