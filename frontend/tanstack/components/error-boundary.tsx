import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rouge/30 bg-rouge/5 p-10">
          <AlertTriangle className="h-10 w-10 text-rouge" />
          <p className="mt-4 font-semibold">Une erreur est survenue</p>
          <p className="mt-1 text-sm text-muted-foreground">{this.state.error?.message ?? "Erreur inattendue"}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
