/**
 * NOTE: catches a crash while drawing and shows a message instead of a blank white page.
 * Why it exists: PRD O2. Without a boundary, one thrown error in any component unmounts the whole app.
 * Why it's a class: React has no hook for catching render errors, so this is the one class component here.
 * Connects to: `App.tsx` (around everything) and `Layout.tsx` (around each page).
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  /** React calls this during rendering, to decide what to draw instead of the part that crashed. */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /** React calls this after the crash, with the details. Logging an error is what this method is for. */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("A component crashed:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex flex-col items-start gap-4 p-6">
          <h1 className="text-3xl font-bold">Something went wrong.</h1>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
