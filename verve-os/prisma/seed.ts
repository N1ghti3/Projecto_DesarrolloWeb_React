// VerveOS - Seed: usuarios, mesas, productos con estación, settings (IVA)
import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Sembrando base de datos VerveOS...')

  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.table.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.waiterCall.deleteMany()
  await db.deviceSession.deleteMany()
  await db.user.deleteMany()
  await db.setting.deleteMany()

  // Settings: IVA 19% (Colombia)
  await db.setting.create({ data: { key: 'tax_rate', value: '19' } })
  await db.setting.create({ data: { key: 'tax_name', value: 'IVA' } })
  await db.setting.create({ data: { key: 'venue_name', value: 'VerveOS Gastro-Bar' } } )

  // Usuarios con PIN de 4 dígitos para acceso rápido en kiosk
  const users = [
    { name: 'Administrador', email: 'admin@verveos.com', password: 'admin123', pin: '1234', role: 'admin' },
    { name: 'Mesero Demo', email: 'mesero@verveos.com', password: 'mesero123', pin: '1111', role: 'mesero' },
    { name: 'Mesero Ana', email: 'ana@verveos.com', password: 'ana12345', pin: '2222', role: 'mesero' },
    { name: 'Bartender Demo', email: 'barra@verveos.com', password: 'barra123', pin: '3333', role: 'barra' },
    { name: 'Cocina Demo', email: 'cocina@verveos.com', password: 'cocina123', pin: '4444', role: 'cocina' },
    { name: 'Cajero Demo', email: 'cajero@verveos.com', password: 'cajero123', pin: '5555', role: 'cajero' },
    { name: 'Supervisor Demo', email: 'visor@verveos.com', password: 'visor123', pin: '6666', role: 'visor' },
  ]
  for (const u of users) {
    await db.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 12),
        pin: await bcrypt.hash(u.pin, 12),
        role: u.role,
      },
    })
  }

  // Usuarios MESA para testing del kiosko
  for (let i = 1; i <= 12; i++) {
    const tableNumber = `M${i}`
    await db.user.create({
      data: {
        name: `Mesa ${i}`,
        email: `mesa-${tableNumber.toLowerCase()}@verveos.com`,
        passwordHash: await bcrypt.hash('mesa123', 12),
        role: 'mesa',
      },
    })
  }

  console.log('✅ Usuarios creados (con PIN de staff):')
  console.log('   admin@verveos.com / admin123 (PIN 1234)')
  console.log('   mesero@verveos.com / mesero123 (PIN 1111)')
  console.log('   barra@verveos.com / barra123 (PIN 3333)')
  console.log('   cocina@verveos.com / cocina123 (PIN 4444)')
  console.log('   cajero@verveos.com / cajero123 (PIN 5555)')
  console.log('   visor@verveos.com / visor123 (PIN 6666) — solo lectura')
  console.log('   mesa-m1@verveos.com … mesa-m12@verveos.com / mesa123 — testing de kiosko')

  // Mesas M1-M12
  const tables = Array.from({ length: 12 }, (_, i) => ({
    number: `M${i + 1}`,
    name: `Mesa ${i + 1}`,
    status: 'libre' as const,
    capacity: i < 8 ? 4 : 6,
  }))
  await db.table.createMany({ data: tables })
  console.log('✅ 12 mesas creadas (M1-M12)')

  // Productos con estación de preparación
  // Barra: Bebidas y cocteles. Cocina: Entradas, Principales, Postres.
  const products = [
    { name: 'Ceviche del Día', description: 'Pescado fresco marinado en limón con cebolla y cilantro', price: 28000, category: 'Entradas', station: 'cocina', stock: 50 },
    { name: 'Guacamole con Totopos', description: 'Aguacate fresco, tomate, cebolla y cilantro con totopos crujientes', price: 18000, category: 'Entradas', station: 'cocina', stock: 80 },
    { name: 'Nachos Supremos', description: 'Totopos con queso fundido, jalapeños, guacamole y pico de gallo', price: 22000, category: 'Entradas', station: 'cocina', stock: 60 },
    { name: 'Tacos al Pastor', description: 'Tres tacos de cerdo al pastor con piña, cebolla y cilantro', price: 24000, category: 'Principales', station: 'cocina', stock: 100 },
    { name: 'Bandeja Paisa', description: 'Arroz, frijoles, chicharrón, carne molida, huevo, plátano y arepa', price: 32000, category: 'Principales', station: 'cocina', stock: 40 },
    { name: 'Lomo Saltado', description: 'Lomo de res salteado con cebolla, tomate y papas fritas', price: 30000, category: 'Principales', station: 'cocina', stock: 35 },
    { name: 'Pollo a la Parrilla', description: 'Pechuga de pollo a la parrilla con guarnición de ensalada y papas', price: 26000, category: 'Principales', station: 'cocina', stock: 45 },
    { name: 'Pizza Margarita', description: 'Pizza con salsa de tomate, mozzarella y albahaca fresca', price: 28000, category: 'Principales', station: 'cocina', stock: 30 },
    // Barra
    { name: 'Limonada de Coco', description: 'Limonada fresca con crema de coco y hielo', price: 12000, category: 'Bebidas', station: 'barra', stock: 200 },
    { name: 'Jugo Natural de Mora', description: 'Jugo de mora fresco sin azúcar añadida', price: 10000, category: 'Bebidas', station: 'barra', stock: 150 },
    { name: 'Agua Mineral', description: 'Botella de agua mineral con gas 500ml', price: 6000, category: 'Bebidas', station: 'barra', stock: 300 },
    { name: 'Café Americano', description: 'Café americano recién preparado', price: 8000, category: 'Bebidas', station: 'barra', stock: 120 },
    { name: 'Mojito Cubano', description: 'Ron blanco, menta, limón, azúcar y soda', price: 22000, category: 'Barra', station: 'barra', stock: 90 },
    { name: 'Margarita Clásica', description: 'Tequila, triple sec, jugo de limón y sal', price: 24000, category: 'Barra', station: 'barra', stock: 80 },
    { name: 'Pina Colada', description: 'Ron, crema de coco y jugo de piña', price: 23000, category: 'Barra', station: 'barra', stock: 75 },
    { name: 'Aperol Spritz', description: 'Aperol, prosecco y soda con naranja', price: 26000, category: 'Barra', station: 'barra', stock: 60 },
    // Postres (cocina)
    { name: 'Tiramisú', description: 'Postre italiano con café, mascarpone y cacao', price: 15000, category: 'Postres', station: 'cocina', stock: 25 },
    { name: 'Flan de Caramelo', description: 'Flan casero con caramelo líquido', price: 12000, category: 'Postres', station: 'cocina', stock: 30 },
    { name: 'Brownie con Helado', description: 'Brownie de chocolate tibio con helado de vainilla', price: 16000, category: 'Postres', station: 'cocina', stock: 20 },
  ]
  await db.product.createMany({
    data: products.map((p) => ({ ...p, available: p.stock > 0 })),
  })
  console.log(`✅ ${products.length} productos creados (con estación cocina/barra)`)

  // Categorías
  const categories = [
    { name: 'Entradas', emoji: '🥗', station: 'cocina', sortOrder: 1 },
    { name: 'Principales', emoji: '🍖', station: 'cocina', sortOrder: 2 },
    { name: 'Postres', emoji: '🍰', station: 'cocina', sortOrder: 3 },
    { name: 'Bebidas', emoji: '🥤', station: 'barra', sortOrder: 4 },
    { name: 'Barra', emoji: '🍸', station: 'barra', sortOrder: 5 },
  ]
  await db.category.createMany({ data: categories })
  console.log(`✅ ${categories.length} categorías creadas`)

  console.log('🎉 Seed completado')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
