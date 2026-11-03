import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./features/open-water/open-water.css";
import "./features/open-water/expedition.css";
import { startAnalytics } from "./lib/analytics";

createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && location.hostname === "tejasskaushik.com") startAnalytics();
