
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ActivationGate } from "./app/ActivationGate.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <ActivationGate>
      <App />
    </ActivationGate>,
  );
  
