export interface StainChip {
  emoji: string
  name: string
  subs: string[]
}

type Lang = 'en' | 'es'

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
  'Cotton', 'Polyester', 'Acrylic', 'Silk', 'Wool', 'Cashmere', 'Linen',
  'Rayon', 'Nylon', 'Leather', 'Denim', 'Suede', 'Upholstery',
]

const STAIN_LABELS: Record<string, Record<Lang, string>> = {
  'Coffee/Drink': { en: 'Coffee/Drink', es: 'Café/Bebida' },
  'Black Coffee': { en: 'Black Coffee', es: 'Café Negro' },
  'Coffee with Cream': { en: 'Coffee with Cream', es: 'Café con Crema' },
  Tea: { en: 'Tea', es: 'Té' },
  Juice: { en: 'Juice', es: 'Jugo' },
  Milk: { en: 'Milk', es: 'Leche' },
  Wine: { en: 'Wine', es: 'Vino' },
  'Red Wine': { en: 'Red Wine', es: 'Vino Tinto' },
  'White Wine': { en: 'White Wine', es: 'Vino Blanco' },
  Beer: { en: 'Beer', es: 'Cerveza' },
  Blood: { en: 'Blood', es: 'Sangre' },
  'Grease/Oil': { en: 'Grease/Oil', es: 'Grasa/Aceite' },
  'Cooking Oil': { en: 'Cooking Oil', es: 'Aceite de Cocina' },
  Butter: { en: 'Butter', es: 'Mantequilla' },
  'Motor Oil': { en: 'Motor Oil', es: 'Aceite de Motor' },
  'Ink/Marker': { en: 'Ink/Marker', es: 'Tinta/Marcador' },
  'Ballpoint Pen': { en: 'Ballpoint Pen', es: 'Bolígrafo' },
  'Permanent Marker': { en: 'Permanent Marker', es: 'Marcador Permanente' },
  Makeup: { en: 'Makeup', es: 'Maquillaje' },
  Lipstick: { en: 'Lipstick', es: 'Labial' },
  Foundation: { en: 'Foundation', es: 'Base' },
  Mascara: { en: 'Mascara', es: 'Rímel' },
  'Nail Polish': { en: 'Nail Polish', es: 'Esmalte de Uñas' },
  Pet: { en: 'Pet', es: 'Mascota' },
  Urine: { en: 'Urine', es: 'Orina' },
  Vomit: { en: 'Vomit', es: 'Vómito' },
  'Food/Sauce': { en: 'Food/Sauce', es: 'Comida/Salsa' },
  Chocolate: { en: 'Chocolate', es: 'Chocolate' },
  'Tomato Sauce': { en: 'Tomato Sauce', es: 'Salsa de Tomate' },
  Mustard: { en: 'Mustard', es: 'Mostaza' },
  Curry: { en: 'Curry', es: 'Curry' },
  Berries: { en: 'Berries', es: 'Bayas' },
  'Grass/Mud': { en: 'Grass/Mud', es: 'Pasto/Barro' },
  Grass: { en: 'Grass', es: 'Pasto' },
  Mud: { en: 'Mud', es: 'Barro' },
  'Paint/Glue': { en: 'Paint/Glue', es: 'Pintura/Pegamento' },
  Glue: { en: 'Glue', es: 'Pegamento' },
  'Candle Wax': { en: 'Candle Wax', es: 'Cera de Vela' },
  'Sweat/Deodorant': { en: 'Sweat/Deodorant', es: 'Sudor/Desodorante' },
  'Yellow Pit Stain': { en: 'Yellow Pit Stain', es: 'Mancha Amarilla de Axila' },
  Deodorant: { en: 'Deodorant', es: 'Desodorante' },
  'Collar Ring': { en: 'Collar Ring', es: 'Marca de Cuello' },
  'Mildew/Rust': { en: 'Mildew/Rust', es: 'Moho/Óxido' },
  Mildew: { en: 'Mildew', es: 'Moho' },
  Rust: { en: 'Rust', es: 'Óxido' },
}

const SURFACE_LABELS: Record<string, Record<Lang, string>> = {
  cotton: { en: 'Cotton', es: 'Algodón' },
  'cotton-white': { en: 'Cotton · White/Light', es: 'Algodón · Blanco/Claro' },
  'cotton-color': { en: 'Cotton · Color/Dark', es: 'Algodón · Color/Oscuro' },
  polyester: { en: 'Polyester', es: 'Poliéster' },
  acrylic: { en: 'Acrylic', es: 'Acrílico' },
  silk: { en: 'Silk', es: 'Seda' },
  wool: { en: 'Wool', es: 'Lana' },
  cashmere: { en: 'Cashmere', es: 'Cachemira' },
  linen: { en: 'Linen', es: 'Lino' },
  rayon: { en: 'Rayon', es: 'Rayón' },
  nylon: { en: 'Nylon', es: 'Nylon' },
  leather: { en: 'Leather', es: 'Cuero' },
  denim: { en: 'Denim', es: 'Mezclilla' },
  suede: { en: 'Suede', es: 'Gamuza' },
  upholstery: { en: 'Upholstery', es: 'Tapicería' },
}

export function getStainLabel(value: string, lang: Lang = 'en'): string {
  return STAIN_LABELS[value]?.[lang] || value
}

export function getSurfaceLabel(value: string, lang: Lang = 'en'): string {
  const key = value.toLowerCase()
  return SURFACE_LABELS[key]?.[lang] || value
}
