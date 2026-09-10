import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const GREEN = '#1a7a3c'
const TEXT = '#1f2933'
const MUTED = '#8a9299'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: MUTED,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 3,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarStyle: {
          height: 64,
          paddingTop: 4,
          paddingBottom: 7,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e8ece9',
          elevation: 8,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: focused ? 'home' : 'home-outline',
            learn: focused ? 'book' : 'book-outline',
            clubs: focused ? 'people' : 'people-outline',
            market: focused ? 'storefront' : 'storefront-outline',
            profile: focused ? 'person' : 'person-outline',
          }

          return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home tab' }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarAccessibilityLabel: 'Learn tab' }} />
      <Tabs.Screen name="clubs" options={{ title: 'Clubs', tabBarAccessibilityLabel: 'Clubs tab' }} />
      <Tabs.Screen name="market" options={{ title: 'Market', tabBarAccessibilityLabel: 'Marketplace tab' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile tab' }} />
    </Tabs>
  )
}
