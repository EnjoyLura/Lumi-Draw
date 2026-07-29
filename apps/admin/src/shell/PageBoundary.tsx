import { Component, type ReactNode } from "react";
import { Button, Result } from "antd";

interface Props {
  resetKey: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Keep the admin shell usable if a page fails while loading real API data.
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
        <Result
          status="error"
          title="页面暂时无法显示"
          subTitle={this.state.error.message || "页面运行时出现异常，请重新加载后再试。"}
          extra={<Button type="primary" onClick={() => window.location.reload()}>重新加载</Button>}
        />
      );
    }
    return this.props.children;
  }
}
