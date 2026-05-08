import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Chapter from "./pages/Chapter";
import Login from "./pages/Login";
import Toc from "./pages/Toc";

function RootGate() {
  const { ready, user } = useAuth();
  if (!ready) {
    return (
      <div className="app-shell muted" style={{ paddingTop: "2rem" }}>
        加载中…
      </div>
    );
  }
  return <Navigate to={user ? "/toc" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RootGate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/toc" element={<Toc />} />
          <Route path="/read/:slug" element={<Chapter />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
