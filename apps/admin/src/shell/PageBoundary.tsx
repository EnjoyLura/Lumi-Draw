import { Component, type ReactNode } from "react";

interface Props {
  resetKey: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// 页面级错误边界：某个页面渲染抛错（例如关闭模拟数据后后端接口未接入）时，
// 只降级内容区，保留外壳（顶栏 / 抽屉 / 管理员菜单），用户仍可切回模拟数据。
export class PageBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty">
          <i className="ri-plug-line" />
          <div className="et">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
