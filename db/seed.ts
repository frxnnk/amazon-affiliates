import { db, Products } from 'astro:db';

export default async function seed() {
  const now = new Date();

  // Check if products already exist
  const existing = await db.select().from(Products).all();
  if (existing.length > 0) {
    console.log('Products already seeded, skipping...');
    return;
  }

  console.log('Seeding test products...');

  // Product 1 - English
  await db.insert(Products).values({
    productId: 'apple-airpods-pro-2',
    asin: 'B0D1XD1ZV3',
    lang: 'en',
    title: 'Apple AirPods Pro 2 - Wireless Earbuds with Active Noise Cancellation',
    brand: 'Apple',
    model: 'AirPods Pro 2nd Gen',
    description: 'The Apple AirPods Pro 2 feature next-level Active Noise Cancellation, Adaptive Transparency, and Personalized Spatial Audio with dynamic head tracking for an immersive listening experience.',
    shortDescription: 'Premium wireless earbuds with industry-leading noise cancellation and seamless Apple ecosystem integration.',
    category: 'audio',
    tags: ['earbuds', 'wireless', 'noise-cancelling', 'apple', 'bluetooth'],
    price: 249.00,
    originalPrice: 279.00,
    currency: 'USD',
    affiliateUrl: 'https://www.amazon.com/dp/B0D1XD1ZV3',
    rating: 4.7,
    totalReviews: 45230,
    ourRating: 9.5,
    pros: [
      'Best-in-class noise cancellation',
      'Excellent sound quality',
      'Seamless Apple device switching',
      'USB-C charging case',
      '6 hours battery life'
    ],
    cons: [
      'Premium price',
      'Best features limited to Apple devices'
    ],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
    featuredImageAlt: 'Apple AirPods Pro 2 with charging case',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 2 - Spanish
  await db.insert(Products).values({
    productId: 'sony-wh1000xm5',
    asin: 'B09XS7JWHH',
    lang: 'es',
    title: 'Sony WH-1000XM5 - Auriculares Inalámbricos con Cancelación de Ruido',
    brand: 'Sony',
    model: 'WH-1000XM5',
    description: 'Los auriculares Sony WH-1000XM5 ofrecen la mejor cancelación de ruido del mercado, 30 horas de batería y un sonido excepcional con drivers de 30mm.',
    shortDescription: 'Auriculares premium con la mejor cancelación de ruido y 30 horas de batería.',
    category: 'audio',
    tags: ['auriculares', 'bluetooth', 'cancelacion-ruido', 'sony'],
    price: 329.00,
    originalPrice: 419.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B09XS7JWHH',
    rating: 4.6,
    totalReviews: 12453,
    ourRating: 9.2,
    pros: [
      'Cancelación de ruido líder',
      '30 horas de batería',
      'Diseño cómodo y ligero',
      'Multipoint Bluetooth'
    ],
    cons: [
      'Precio elevado',
      'No plegables'
    ],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61vJtKbAssL._AC_SL1500_.jpg',
    featuredImageAlt: 'Sony WH-1000XM5 auriculares negros',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 3 - English (another one)
  await db.insert(Products).values({
    productId: 'samsung-galaxy-s24-ultra',
    asin: 'B0CMDRCZBJ',
    lang: 'en',
    title: 'Samsung Galaxy S24 Ultra - 256GB Titanium Black',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    description: 'The Samsung Galaxy S24 Ultra features a stunning 6.8" Dynamic AMOLED display, S Pen, 200MP camera, and Galaxy AI for the ultimate smartphone experience.',
    shortDescription: 'Flagship smartphone with S Pen, 200MP camera, and Galaxy AI features.',
    category: 'smartphones',
    tags: ['smartphone', 'samsung', 'android', '5g', 'camera'],
    price: 1199.99,
    originalPrice: 1299.99,
    currency: 'USD',
    affiliateUrl: 'https://www.amazon.com/dp/B0CMDRCZBJ',
    rating: 4.5,
    totalReviews: 8920,
    ourRating: 9.0,
    pros: [
      '200MP camera system',
      'S Pen included',
      'Galaxy AI features',
      'Titanium frame',
      '5000mAh battery'
    ],
    cons: [
      'Expensive',
      'Large and heavy'
    ],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/71lSECaAN4L._AC_SL1500_.jpg',
    featuredImageAlt: 'Samsung Galaxy S24 Ultra Titanium Black',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  console.log('✅ Test products seeded successfully!');
}
