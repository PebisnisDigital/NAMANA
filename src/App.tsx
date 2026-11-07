import { IdentityFlip } from "./components/IdentityFlip";
import { AuthProvider } from "./platform/auth";
import { Landing, Legal } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";
import { Canvas, Studio } from "./pages/Studio";
import { PublicSite } from "./pages/PublicSite";
import "./namana.css";

function App() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  let page;
  if (path === "/") page = <Landing />;
  else if (path === "/demo") page = <IdentityFlip />;
  else if (path === "/canvas") page = <Canvas />;
  else if (path === "/login" || path === "/auth")
    page = <Login recovery={path === "/auth"} />;
  else if (path === "/dashboard") page = <Dashboard />;
  else if (path === "/studio" || path.startsWith("/studio/sites/"))
    page = <Studio siteId={path.split("/")[3]} />;
  else if (path === "/admin" || path.startsWith("/admin/")) page = <Admin />;
  else if (path.startsWith("/preview/"))
    page = <PublicSite token={path.split("/")[2]} />;
  else if (path === "/privacy" || path === "/terms")
    page = <Legal terms={path === "/terms"} />;
  else page = <PublicSite slug={path.slice(1)} />;
  return <AuthProvider>{page}</AuthProvider>;
}

export default App;
