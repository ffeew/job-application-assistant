import { create } from "zustand";

interface DashboardState {
	// Sidebar state
	sidebarOpen: boolean;

	// User session state
	user: { name?: string; email?: string } | null;
	isLoading: boolean;

	// Actions
	toggleSidebar: () => void;
	setSidebarOpen: (open: boolean) => void;
	setUser: (user: { name?: string; email?: string } | null) => void;
	setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
	// Initial state
	sidebarOpen: false,
	user: null,
	isLoading: true,

	// Actions
	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	setUser: (user) => set({ user }),
	setLoading: (loading) => set({ isLoading: loading }),
}));
