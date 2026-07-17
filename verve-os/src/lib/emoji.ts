// VerveOS - Mapas de emojis e iconos para la vista kiosk
// Asigna un emoji visual a cada categoría y producto para una experiencia
// táctil más atractiva en tablet.

export const CATEGORY_EMOJI: Record<string, string> = {
  Todos: '🍴',
  Entradas: '🍤',
  Principales: '🍽️',
  Bebidas: '🥤',
  Barra: '🍸',
  Postres: '🍰',
  General: '🍽️',
}

// Emoji específico por nombre de producto (búsqueda por palabras clave)
const PRODUCT_EMOJI_RULES: Array<{ keywords: string[]; emoji: string }> = [
  { keywords: ['ceviche'], emoji: '🐟' },
  { keywords: ['guacamole', 'nachos'], emoji: '🥑' },
  { keywords: ['taco'], emoji: '🌮' },
  { keywords: ['bandeja', 'paisa'], emoji: '🍱' },
  { keywords: ['lomo', 'saltado'], emoji: '🥩' },
  { keywords: ['pollo'], emoji: '🍗' },
  { keywords: ['pizza'], emoji: '🍕' },
  { keywords: ['limonada'], emoji: '🍋' },
  { keywords: ['jugo', 'mora'], emoji: '🫐' },
  { keywords: ['agua'], emoji: '💧' },
  { keywords: ['café', 'cafe'], emoji: '☕' },
  { keywords: ['mojito'], emoji: '🍃' },
  { keywords: ['margarita'], emoji: '🍹' },
  { keywords: ['piña', 'pina', 'colada'], emoji: '🍍' },
  { keywords: ['aperol', 'spritz'], emoji: '🍊' },
  { keywords: ['tiramisú', 'tiramisu'], emoji: '🍮' },
  { keywords: ['flan'], emoji: '🍮' },
  { keywords: ['brownie'], emoji: '🍫' },
  { keywords: ['empanada'], emoji: '🥟' },
]

export function productEmoji(name: string, category: string): string {
  const lower = name.toLowerCase()
  for (const rule of PRODUCT_EMOJI_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.emoji
  }
  return CATEGORY_EMOJI[category] ?? '🍽️'
}
