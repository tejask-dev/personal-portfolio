import { Component, type ReactNode } from 'react';

interface SceneErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches WebGL/3D scene failures (context loss, unsupported devices) so a
 * broken canvas degrades to a fallback instead of crashing the whole page.
 */
export default class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
