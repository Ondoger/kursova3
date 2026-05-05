import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CharacterPage } from "./pages/Character";
import { AchievementsPage } from "./pages/Achievements";
import { QuestsPage } from "./pages/Quests";
import { ProfilePage } from "./pages/Profile";
import { FriendsPage } from "./pages/Friends";
import { AuthCallback } from "./pages/AuthCallback";
import { Navbar } from "./components/UI/Navbar";
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
function App() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageWrap>
                <Landing />
              </PageWrap>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PageWrap>
                <Dashboard />
              </PageWrap>
            }
          />
          <Route
            path="/character"
            element={
              <PageWrap>
                <CharacterPage />
              </PageWrap>
            }
          />
          <Route
            path="/achievements"
            element={
              <PageWrap>
                <AchievementsPage />
              </PageWrap>
            }
          />
          <Route
            path="/quests"
            element={
              <PageWrap>
                <QuestsPage />
              </PageWrap>
            }
          />
          <Route
            path="/profile"
            element={
              <PageWrap>
                <ProfilePage />
              </PageWrap>
            }
          />
          <Route
            path="/friends"
            element={
              <PageWrap>
                <FriendsPage />
              </PageWrap>
            }
          />
          <Route
            path="/auth/callback"
            element={
              <PageWrap>
                <AuthCallback />
              </PageWrap>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
export default App;
