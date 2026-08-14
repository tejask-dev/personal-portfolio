import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ScrollNavigator from "@/components/ScrollNavigator";
const CaseStudy = lazy(() => import("@/pages/CaseStudy"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/case-studies/:slug">
        <Suspense fallback={<div className="route-loading" aria-label="Loading case study" />}>
          <CaseStudy />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <ScrollNavigator />
    </>
  );
}

export default App;
