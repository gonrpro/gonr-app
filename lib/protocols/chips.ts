export interface StainChip {
  emoji: string
  name: string
  subs: string[]
}

export const STAIN_CHIPS: StainChip[] = [
  { emoji: '☕', name: 'Coffee/Drink', subs: ['Black Coffee', 'Coffee with Cream', 'Tea', 'Juice', 'Milk'] },
  { emoji: '🍷', name: 'Wine', subs: ['Red Wine', 'White Wine', 'Beer'] },
  { emoji: '🩸', name: 'Blood', subs: [] },
  { emoji: '🫧', name: 'Grease/Oil', subs: ['Cooking Oil', 'Butter', 'Motor Oil'] },
  { emoji: '🖊️', name: 'Ink/Marker', subs: ['Ballpoint Pen', 'Permanent Marker'] },
  { emoji: '💄', name: 'Makeup', subs: ['Lipstick', 'Foundation', 'Mascara', 'Nail Polish'] },
  { emoji: '🐾', name: 'Pet', subs: ['Urine', 'Vomit'] },
  { emoji: '🍅', name: 'Food/Sauce', subs: ['Chocolate', 'Tomato Sauce', 'Mustard', 'Curry', 'Berries'] },
  { emoji: '🌿', name: 'Grass/Mud', subs: ['Grass', 'Mud'] },
  { emoji: '🎨', name: 'Paint/Glue', subs: ['Glue', 'Candle Wax'] },
  { emoji: '💦', name: 'Sweat/Deodorant', subs: ['Yellow Pit Stain', 'Deodorant', 'Collar Ring'] },
  { emoji: '🍄', name: 'Mildew/Rust', subs: ['Mildew', 'Rust'] },
]

export const SURFACE_CHIPS = [
  'Cotton', 'Polyester', 'Silk', 'Wool', 'Cashmere', 'Linen',
  'Rayon', 'Nylon', 'Leather', 'Denim', 'Suede', 'Upholstery',
]
