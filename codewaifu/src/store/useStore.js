import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  fetchAuthenticatedGitHubUser,
  fetchGitHubStats,
} from "../utils/github";
import { authApi, ApiError } from "../utils/api";
export const useStore = create()(
  persist(
    (set, get) => ({
      // ── Auth (server-backed) ──────────────────────────────────────
      // `authUser` holds the user record returned by /api/auth/me. Null
      // means "not logged in or not yet hydrated". `authReady` flips to
      // true once we've made the first /me call so guarded routes know
      // whether to wait or redirect.
      authUser: null,
      authReady: false,
      authLoading: false,
      authError: null,
      // After a successful /register we stash the email here so the
      // VerifyEmail page knows whose code to validate.
      pendingVerifyEmail: null,
      devVerifyCode: null,

      // ── Legacy GitHub-direct flow (kept for now, will retire later) ─
      username: null,
      token: null,
      stats: null,
      characterName: "GitQuest",
      loading: false,
      error: null,
      mood: "idle",
      unlockedAchievements: [],
      lastSeenLevel: 1,
      coins: 0,
      claimedQuests: {},
      ownedShopItems: [],
      activeTitleId: null,
      profileCustomization: {
        status: "Пишу код, іноді навіть спеціально.",
        bio: "Тут живе мій GitQuest профіль: GitHub-ритм, титули, коіни і трохи хаосу.",
        favoriteStack: "React · Tailwind · GitHub API",
        bannerStyle: "sakura",
        accentColor: "#58a6ff",
      },
      friends: [],
      updateProfileCustomization: (patch) => {
        const { profileCustomization } = get();
        set({ profileCustomization: { ...profileCustomization, ...patch } });
      },
      addFriend: (login) => {
        const clean = login.trim().replace(/^@/, "");
        if (!clean) return false;
        const { friends, username } = get();
        if (username && clean.toLowerCase() === username.toLowerCase())
          return false;
        if (
          friends.some((friend) => friend.toLowerCase() === clean.toLowerCase())
        )
          return false;
        set({ friends: [...friends, clean] });
        return true;
      },
      removeFriend: (login) => {
        const { friends } = get();
        set({
          friends: friends.filter(
            (friend) => friend.toLowerCase() !== login.toLowerCase(),
          ),
        });
      },
      claimQuest: (claimKey, reward) => {
        if (!claimKey || reward <= 0) return false;
        const { claimedQuests, coins } = get();
        if (claimedQuests?.[claimKey]) return false;
        set({
          coins: coins + reward,
          claimedQuests: { ...claimedQuests, [claimKey]: true },
        });
        return true;
      },
      buyShopItem: (item) => {
        if (!item) return false;
        const { coins, ownedShopItems } = get();
        if (ownedShopItems.includes(item.id)) return true;
        if (coins < item.price) return false;
        set({
          coins: coins - item.price,
          ownedShopItems: [...ownedShopItems, item.id],
          activeTitleId: item.type === "title" ? item.id : get().activeTitleId,
        });
        return true;
      },
      equipShopItem: (itemId) => {
        const { ownedShopItems } = get();
        if (!ownedShopItems.includes(itemId)) return false;
        set({ activeTitleId: itemId });
        return true;
      },
      connect: async (username, token) => {
        set({ loading: true, error: null, mood: "climbing" });
        try {
          const stats = await fetchGitHubStats(username.trim(), token, {
            force: true,
          });
          set({
            username: stats.user.login,
            token: token ?? null,
            stats,
            loading: false,
          });
          get().triggerMood("rumbaDancing", 3200);
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "Помилка завантаження",
          });
          get().triggerMood("sad", 2600);
          throw e;
        }
      },
      connectWithGitHub: async (token) => {
        set({ loading: true, error: null, mood: "climbing" });
        try {
          const user = await fetchAuthenticatedGitHubUser(token);
          const stats = await fetchGitHubStats(user.login, token, {
            force: true,
          });
          set({ username: stats.user.login, token, stats, loading: false });
          get().triggerMood("rumbaDancing", 3200);
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "GitHub OAuth помилка",
          });
          get().triggerMood("sad", 2600);
          throw e;
        }
      },
      refresh: async () => {
        const { username, token } = get();
        if (!username) return;
        set({ loading: true, error: null, mood: "climbing" });
        try {
          const stats = await fetchGitHubStats(username, token ?? undefined, {
            force: true,
          });
          set({ stats, loading: false });
          get().triggerMood("sittingLaughing", 2200);
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "Помилка",
          });
          get().triggerMood("sad", 2600);
        }
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* tolerate offline */
        }
        set({
          authUser: null,
          authReady: true,
          authError: null,
          pendingVerifyEmail: null,
          devVerifyCode: null,
          username: null,
          token: null,
          stats: null,
          error: null,
          mood: "idle",
          unlockedAchievements: [],
          lastSeenLevel: 1,
        });
      },

      updateAuthUser: (patch) => {
        const current = get().authUser;
        if (current) set({ authUser: { ...current, ...patch } });
      },

      /* ── Auth (email + password) ──────────────────────────────── */

      hydrateAuth: async () => {
        if (get().authReady && get().authUser) return get().authUser;
        try {
          const { user } = await authApi.me();
          set({ authUser: user, authReady: true });
          return user;
        } catch (e) {
          set({ authUser: null, authReady: true });
          if (e instanceof ApiError && e.status >= 500) {
            console.warn("[auth] hydrate failed:", e.message);
          }
          return null;
        }
      },

      register: async ({ email, password, name, role }) => {
        set({ authLoading: true, authError: null });
        try {
          const data = await authApi.register({ email, password, name, role });
          set({
            authLoading: false,
            pendingVerifyEmail: data.email,
            devVerifyCode: data.devCode ?? null,
          });
          return data; // includes { email, expiresAt, delivered, devCode? }
        } catch (e) {
          set({
            authLoading: false,
            authError: e instanceof Error ? e.message : "Помилка реєстрації",
          });
          throw e;
        }
      },

      verifyEmailCode: async ({ email, code }) => {
        set({ authLoading: true, authError: null });
        try {
          const { user } = await authApi.verifyEmail({ email, code });
          set({
            authUser: user,
            authReady: true,
            authLoading: false,
            pendingVerifyEmail: null,
            devVerifyCode: null,
          });
          return user;
        } catch (e) {
          set({
            authLoading: false,
            authError: e instanceof Error ? e.message : "Невірний код",
          });
          throw e;
        }
      },

      resendVerifyCode: async ({ email, purpose = "signup" }) => {
        try {
          const data = await authApi.resendCode({ email, purpose });
          set({ devVerifyCode: data?.devCode ?? null });
          return data;
        } catch (e) {
          set({
            authError: e instanceof Error ? e.message : "Не вдалось надіслати",
          });
          throw e;
        }
      },

      login: async ({ email, password }) => {
        set({ authLoading: true, authError: null });
        try {
          const { user } = await authApi.login({ email, password });
          set({
            authUser: user,
            authReady: true,
            authLoading: false,
            pendingVerifyEmail: null,
          });
          return user;
        } catch (e) {
          // 403 with requireVerification → caller should redirect to /verify-email
          if (e instanceof ApiError && e.data?.requireVerification) {
            set({
              authLoading: false,
              authError: null,
              pendingVerifyEmail: e.data.email,
              devVerifyCode: null,
            });
            throw e;
          }
          set({
            authLoading: false,
            authError: e instanceof Error ? e.message : "Помилка входу",
          });
          throw e;
        }
      },

      devLogin: async (role, persona) => {
        set({ authLoading: true, authError: null });
        try {
          const { user } = await authApi.devLogin(role, persona);
          set({
            authUser: user,
            authReady: true,
            authLoading: false,
            authError: null,
            pendingVerifyEmail: null,
            devVerifyCode: null,
          });
          return user;
        } catch (e) {
          set({
            authLoading: false,
            authError: e instanceof Error ? e.message : "Dev-вхід не вдався",
          });
          throw e;
        }
      },

      clearAuthError: () => set({ authError: null }),
      setMood: (mood) => set({ mood }),
      triggerMood: (mood, durationMs = 2400) => {
        set({ mood });
        window.setTimeout(() => {
          // Only revert if still in this mood
          if (get().mood === mood) set({ mood: "idle" });
        }, durationMs);
      },
      setCharacterName: (name) =>
        set({ characterName: name.trim() || "GitQuest" }),
      setUnlocked: (ids) => set({ unlockedAchievements: ids }),
      setLastSeenLevel: (lvl) => set({ lastSeenLevel: lvl }),
    }),
    {
      name: "gitquest-store",
      partialize: (s) => ({
        // NB: authUser is intentionally NOT persisted — we hydrate from
        // /api/auth/me on each app load (server cookie is source of truth).
        // Only pendingVerifyEmail survives reloads so the user can return
        // to the verify-email page with their email pre-filled.
        pendingVerifyEmail: s.pendingVerifyEmail,
        username: s.username,
        token: s.token,
        characterName: s.characterName,
        unlockedAchievements: s.unlockedAchievements,
        lastSeenLevel: s.lastSeenLevel,
        coins: s.coins,
        claimedQuests: s.claimedQuests,
        ownedShopItems: s.ownedShopItems,
        activeTitleId: s.activeTitleId,
        profileCustomization: s.profileCustomization,
        friends: s.friends,
      }),
    },
  ),
);
