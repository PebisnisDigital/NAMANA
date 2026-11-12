import { useEffect } from "react";
import { Landing, Legal } from "./pages/Landing";
import { StaticStudio } from "./pages/StaticStudio";
import { StudioV2 } from "./pages/StudioV2";
import { StudioV2Canvas } from "./pages/StudioV2Canvas";
import { ClientForm } from "./pages/ClientForm";
import { StaticSite } from "./pages/StaticSite";
import { ThemeDemo, ThemeGallery } from "./pages/ThemeDemos";
import { getDemoTheme } from "./themes/catalog";
import "./namana.css";

function Redirect({ to }: { to: string }) {
  useEffect(() => { location.replace(to); }, [to]);
  return <p role="status">Membuka {to}…</p>;
}

function App() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  const demoTheme = getDemoTheme(path.slice(1));
  let page;
  if (path === "/") page = <Landing />;
  else if (path === "/formulir") page = <ClientForm />;
  // Visual Studio is the official editor; the 8-stage generator remains available.
  else if (path === "/studio" || path === "/studio-v2") page = <StudioV2 />;
  else if (path === "/studio-v1" || path === "/generator") page = <StaticStudio />;
  else if (path === "/studio-v2-canvas") page = <StudioV2Canvas />;
  else if (path === "/gaya" || path === "/templates") page = <ThemeGallery />;
  else if (demoTheme) page = <ThemeDemo theme={demoTheme} />;
  else if (["/login", "/auth", "/dashboard", "/admin"].includes(path))
    page = <Redirect to="/studio" />;
  else if (path === "/demo") page = <Redirect to="/vini" />;
  else if (path === "/privacy" || path === "/terms")
    page = <Legal terms={path === "/terms"} />;
  else page = <StaticSite slug={path.slice(1)} />;
  return page;
}

export default App;
