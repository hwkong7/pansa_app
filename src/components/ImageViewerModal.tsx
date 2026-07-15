import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './icons';
import { colors, font, spacing } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// 게시된 사진을 눌러서 전체화면으로 보기 (여러 장이면 좌우로 스와이프)
export function ImageViewerModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
        >
          <Icon name="close" size={26} color={colors.white} />
        </Pressable>

        {images.length > 1 && (
          <Text style={[styles.counter, { top: insets.top + spacing.md }]}>
            {index + 1} / {images.length}
          </Text>
        )}

        <FlatList
          data={images}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onMomentumScrollEnd={(e) => {
            setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
          }}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  closeBtn: { position: 'absolute', right: spacing.lg, zIndex: 10, padding: spacing.sm },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    color: colors.white,
    fontSize: font.body,
    fontWeight: '700',
  },
  page: { width: SCREEN_W, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: '100%' },
});
