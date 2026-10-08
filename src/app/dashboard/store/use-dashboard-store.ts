import { create } from "zustand";

interface DashboardState {
	sidebarOpen: boolean;

	user: { name?: string; email?: string } | null;
	isLoading: boolean;

	toggleSidebar: () => void;
	setSidebarOpen: (open: boolean) => void;
	setUser: (user: { name?: string; email?: string } | null) => void;
	setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
	sidebarOpen: false,
	user: null,
	isLoading: true,

	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	setUser: (user) => set({ user }),
	setLoading: (loading) => set({ isLoading: loading }),
}));
