/**
 * Student-facing navigation registry.
 *
 * Add, remove, or reorder shortcuts here without rebuilding the Home screen.
 * Routes must point to existing Expo Router screens.
 */
export const CAMPUS_SHORTCUTS = [
  { key: 'learn', label: 'Learn', icon: 'book-outline', route: '/(tabs)/learn', tone: 'mint' },
  { key: 'clubs', label: 'Clubs', icon: 'people-outline', route: '/(tabs)/clubs', tone: 'blue' },
  { key: 'market', label: 'Marketplace', icon: 'storefront-outline', route: '/(tabs)/market', tone: 'gold' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', route: '/timetable', tone: 'mint' },
  { key: 'lostfound', label: 'Lost & Found', icon: 'search-outline', route: '/lostfound', tone: 'blue' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', route: '/messages', tone: 'gold' },
] as const

export const MORE_FEATURES = [
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', route: '/timetable' },
  { key: 'lostfound', label: 'Lost & Found', icon: 'search-outline', route: '/lostfound' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', route: '/messages' },
  { key: 'about', label: 'About FUASK Connect', icon: 'information-circle-outline', route: '/about' },
] as const
