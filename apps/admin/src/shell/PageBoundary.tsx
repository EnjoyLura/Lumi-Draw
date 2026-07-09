import { Component, type ReactNode } from "react";

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
        <div className="empty">
          <i className="ri-plug-line" />
          <div className="et">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
