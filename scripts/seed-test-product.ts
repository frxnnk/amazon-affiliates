/**
 * Script para crear un producto de prueba
 * Ejecutar con: npx astro db execute scripts/seed-test-product.ts
 */

import { db, Products } from 'astro:db';

export default async function () {
  console.log('Creating test product...');

  const now = new Date();

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

  // Producto 2 - en español
  await db.insert(Products).values({
    productId: 'sony-wh1000xm5-es',
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

  console.log('✅ Test products created successfully!');
  console.log('- Apple AirPods Pro 2 (EN): /en/products/apple-airpods-pro-2');
  console.log('- Sony WH-1000XM5 (ES): /es/products/sony-wh1000xm5-es');
}
