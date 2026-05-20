import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Room } from "./pages/Room";
import { Assignment } from "./pages/Assignment";
import { AuthCallback } from "./pages/AuthCallback";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { VerifyEmail } from "./pages/VerifyEmail";
import { ProfilePage } from "./pages/Profile";
import { Navbar } from "./components/UI/Navbar";
import {
  ProtectedRoute,
  GuestOnlyRoute,
} from "./components/Auth/ProtectedRoute";
import { useStore } from "./store/useStore";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function PageWrap({ children }) {
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
}

/* Convenience wrappers so the JSX below stays compact. */
const Guarded = ({ children, roles }) => (
  <PageWrap>
    <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
  </PageWrap>
);
const GuestOnly = ({ children }) => (
  <PageWrap>
    <GuestOnlyRoute>{children}</GuestOnlyRoute>
  </PageWrap>
);

function App() {
  const location = useLocation();
  const hydrateAuth = useStore((s) => s.hydrateAuth);

  // On app mount, ask the server who we are. The cookie does the talking;
  // we just need to populate the store so guarded routes know what to do.
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public landing — visible to everyone */}
          <Route
            path="/"
            element={
              <PageWrap>
                <Landing />
              </PageWrap>
            }
          />

          {/* Auth pages — only for logged-out users */}
          <Route
            path="/register"
            element={
              <GuestOnly>
                <Register />
              </GuestOnly>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />
          {/* Verify-email is special: user is "in flight" — neither logged
              out nor fully in. We don't gate it; the page itself redirects
              to /register if pendingVerifyEmail is missing. */}
          <Route
            path="/verify-email"
            element={
              <PageWrap>
                <VerifyEmail />
              </PageWrap>
            }
          />

          {/* GitHub OAuth callback — keep open, it sets the session itself */}
          <Route
            path="/auth/callback"
            element={
              <PageWrap>
                <AuthCallback />
              </PageWrap>
            }
          />

          {/* Authenticated routes */}
          <Route
            path="/dashboard"
            element={
              <Guarded>
                <Dashboard />
              </Guarded>
            }
          />
          <Route
            path="/rooms/:id"
            element={
              <Guarded>
                <Room />
              </Guarded>
            }
          />
          <Route
            path="/assignments/:id"
            element={
              <Guarded>
                <Assignment />
              </Guarded>
            }
          />
          <Route
            path="/profile"
            element={
              <Guarded>
                <ProfilePage />
              </Guarded>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <Guarded>
                <ProfilePage />
              </Guarded>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
