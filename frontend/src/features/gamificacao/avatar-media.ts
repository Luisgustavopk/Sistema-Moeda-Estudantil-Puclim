export const isAnimatedAvatar = (source: string) =>
  source.startsWith('data:image/gif;') || /\.gif(?:$|\?)/i.test(source)
