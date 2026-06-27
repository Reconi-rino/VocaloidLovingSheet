import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
          style={{ background: "#0a2e2b", color: "#fff" }}
        >
          <div
            className="rounded-lg border p-6 text-center"
            style={{ borderColor: "#39c5bb", maxWidth: 480 }}
          >
            <h2 className="mb-2 text-lg font-bold" style={{ color: "#39c5bb" }}>
              页面渲染出错
            </h2>
            <p className="mb-4 text-sm" style={{ opacity: 0.7 }}>
              {this.state.error?.message || "未知错误"}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: "#39c5bb", color: "#fff" }}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
