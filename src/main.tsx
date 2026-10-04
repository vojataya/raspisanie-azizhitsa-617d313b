import "./lib/initialUrl"; // первым: запоминает исходные hash и query до того, как клиент Supabase разберёт ссылку из письма
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
