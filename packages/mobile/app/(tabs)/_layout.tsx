import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B3A6B',
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="members" options={{ title: 'Участники' }} />
      <Tabs.Screen name="events" options={{ title: 'События' }} />
      <Tabs.Screen name="library" options={{ title: 'База знаний' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  )
}
