// Quiz illustration registry. Each question gets one of these picked
// at random on quiz mount (see Quiz.tsx → randomImageIndex). Images are
// imported via `require` so Metro bundles them at build time and the
// `Image` source can be a number rather than a URL.

export const QUIZ_IMAGES: { [key: string]: number } = {
  Bilingual: require('@/assets/images/quiz-images/Bilingual.png'),
  Camel: require('@/assets/images/quiz-images/Camel.png'),
  Map: require('@/assets/images/quiz-images/Map.png'),
  Reader: require('@/assets/images/quiz-images/Reader.png'),
  books: require('@/assets/images/quiz-images/books.png'),
  engineers: require('@/assets/images/quiz-images/engineers.png'),
  explorer: require('@/assets/images/quiz-images/explorer.png'),
  navigation: require('@/assets/images/quiz-images/navigation.png'),
  scroll: require('@/assets/images/quiz-images/scroll.png'),
  ship: require('@/assets/images/quiz-images/ship.png'),
  token: require('@/assets/images/quiz-images/token.png'),
  writer: require('@/assets/images/quiz-images/writer.png'),
  mosque: require('@/assets/images/quiz-images/mosque.png'),
};

export const QUIZ_IMAGE_KEYS = Object.keys(QUIZ_IMAGES);
