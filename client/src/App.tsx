import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { Component, lazy, Suspense, type ReactNode } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
const CaseStudy = lazy(() => import("@/pages/CaseStudy"));

class RouteBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="case-page case-empty case-shell">
        <p className="section-label">Connection interrupted</p>
        <h1>The work is still here.</h1>
        <p>
          This page could not finish loading. Reload to try again, or return to
          the work index.
        </p>
        <p>
          <a className="text-link" href={location.href}>
            Reload this page
          </a>
        </p>
        <a className="text-link" href={`${import.meta.env.BASE_URL}#work`}>
          Open the work index
        </a>
      </main>
    );
  }
}
function Routes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/case-studies/:slug">
        <RouteBoundary>
          <Suspense
            fallback={
              <main className="case-page case-empty case-shell">
                <p role="status">Opening the case study…</p>
                <Link className="text-link" href="/#work">
                  Return to the work index
                </Link>
              </main>
            }
          >
            <CaseStudy />
          </Suspense>
        </RouteBoundary>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}
export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Routes />
    </WouterRouter>
  );
}
