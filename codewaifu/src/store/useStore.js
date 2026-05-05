import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  fetchAuthenticatedGitHubUser,
  fetchGitHubStats,
} from "../utils/github";
export const useStore = create()(
  persist(
    (set, get) => ({
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
        accentColor: "#e8a0b4",
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
      logout: () =>
        set({
          username: null,
          token: null,
          stats: null,
          error: null,
          mood: "idle",
          unlockedAchievements: [],
          lastSeenLevel: 1,
        }),
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
