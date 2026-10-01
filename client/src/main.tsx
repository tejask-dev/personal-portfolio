import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./features/open-water/open-water.css";
import "./features/open-water/expedition.css";

createRoot(document.getElementById("root")!).render(<App />);
