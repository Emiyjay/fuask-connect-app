/**
 * Single source of truth for student-facing navigation.
 *
 * To replace or reposition a feature, edit this registry. Keep routes pointed
 * at real Expo Router screens and keep campus data API-driven.
 */
export const CAMPUS_FEATURES = [
  { key: 'learn', label: 'Learn', icon: 'book-outline', route: '/(tabs)/learn', tone: 'mint', showOnHome: true, showInMenu: false },
  { key: 'clubs', label: 'Clubs', icon: 'people-outline', route: '/(tabs)/clubs', tone: 'blue', showOnHome: true, showInMenu: false },
  { key: 'market', label: 'Marketplace', icon: 'storefront-outline', route: '/(tabs)/market', tone: 'gold', showOnHome: true, showInMenu: false },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', route: '/timetable', tone: 'mint', showOnHome: true, showInMenu: true },
  { key: 'lostfound', label: 'Lost & Found', icon: 'search-outline', route: '/lostfound', tone: 'blue', showOnHome: true, showInMenu: true },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', route: '/messages', tone: 'gold', showOnHome: true, showInMenu: true },
  { key: 'about', label: 'About FUASK Connect', icon: 'information-circle-outline', route: '/about', tone: 'mint', showOnHome: false, showInMenu: true },
] as const

export const CAMPUS_SHORTCUTS = CAMPUS_FEATURES.filter((feature) => feature.showOnHome)
export const MORE_FEATURES = CAMPUS_FEATURES.filter((feature) => feature.showInMenu)
