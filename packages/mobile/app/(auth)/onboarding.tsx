import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { ONBOARDING_SEEN_KEY } from '../index'
import { colors, spacing } from '@/theme'

interface Slide {
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    title: 'Quantum Dagestan',
    body: 'Закрытое бизнес-сообщество предпринимателей Дагестана.',
  },
  {
    title: 'События и нетворкинг',
    body: 'Регулярные встречи, мастермайнды и совместные проекты с членами клуба.',
  },
  {
    title: 'База знаний',
    body: 'Доступ к материалам, записям выступлений и контактам участников.',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const listRef = useRef<FlatList<Slide>>(null)
  const [index, setIndex] = useState(0)

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1').catch(() => {})
    router.replace('/(auth)/login')
  }

  const next = () => {
    if (index < SLIDES.length - 1) {
      const nextIndex = index + 1
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true })
      setIndex(nextIndex)
    } else {
      finish()
    }
  }

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    setIndex(i)
  }

  const isLast = index === SLIDES.length - 1

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.lg }}>
        {!isLast && (
          <TouchableOpacity onPress={finish}>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>Пропустить</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: spacing.xl,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: colors.text,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}
            >
              {item.title}
            </Text>
            <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24 }}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: spacing.lg }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              marginHorizontal: 4,
              backgroundColor: i === index ? colors.brand : colors.border,
            }}
          />
        ))}
      </View>

      <View style={{ padding: spacing.xl }}>
        <TouchableOpacity
          onPress={next}
          style={{
            backgroundColor: colors.brand,
            padding: spacing.lg,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {isLast ? 'Начать' : 'Далее'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
