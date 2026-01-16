import { db, Products, DealAgentKeywords, AgentConfig, eq } from 'astro:db';

export default async function seed() {
  // Seed Agent Keywords for Deal Hunter
  await seedDealAgentKeywords();

  // Seed Agent Configurations
  await seedAgentConfigs();
  const now = new Date();

  // Check if we need to add more products (updated to 16)
  const existing = await db.select().from(Products).all();
  if (existing.length >= 16) {
    console.log('Products already seeded, skipping...');
    return;
  }
  
  // Clear existing products if less than expected
  if (existing.length > 0 && existing.length < 16) {
    console.log('Updating seed with more products...');
    // Delete all and reseed
    for (const product of existing) {
      await db.delete(Products).where(eq(Products.id, product.id));
    }
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

  // Product 4 - Spanish
  await db.insert(Products).values({
    productId: 'iphone-15-pro-max-es',
    asin: 'B0CHXQH6V4',
    lang: 'es',
    title: 'Apple iPhone 15 Pro Max - 256GB Titanio Natural',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    description: 'El iPhone 15 Pro Max con chip A17 Pro, cámara de 48MP con zoom óptico 5x y el diseño de titanio más ligero.',
    shortDescription: 'El iPhone más avanzado con titanio y cámara profesional.',
    category: 'smartphones',
    tags: ['iphone', 'apple', 'smartphone', '5g'],
    price: 1449.00,
    originalPrice: 1499.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0CHXQH6V4',
    rating: 4.8,
    totalReviews: 23456,
    ourRating: 9.5,
    pros: ['Chip A17 Pro', 'Titanio ultraligero', 'Cámara 5x', 'USB-C'],
    cons: ['Precio alto', 'Batería podría mejorar'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/81dT7CUY6GL._AC_SL1500_.jpg',
    featuredImageAlt: 'iPhone 15 Pro Max Titanio Natural',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 5 - Spanish
  await db.insert(Products).values({
    productId: 'samsung-galaxy-buds-es',
    asin: 'B0C33XXS56',
    lang: 'es',
    title: 'Samsung Galaxy Buds2 Pro - Auriculares Inalámbricos',
    brand: 'Samsung',
    model: 'Galaxy Buds2 Pro',
    description: 'Auriculares premium con cancelación de ruido activa, audio de alta resolución y hasta 5 horas de batería.',
    shortDescription: 'Auriculares premium Samsung con ANC y audio Hi-Fi.',
    category: 'audio',
    tags: ['auriculares', 'samsung', 'bluetooth', 'anc'],
    price: 159.00,
    originalPrice: 229.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0C33XXS56',
    rating: 4.4,
    totalReviews: 8765,
    ourRating: 8.5,
    pros: ['Audio Hi-Fi', 'ANC efectivo', 'Diseño compacto'],
    cons: ['Batería limitada'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/51v30D5zzGL._AC_SL1200_.jpg',
    featuredImageAlt: 'Samsung Galaxy Buds2 Pro',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 6 - Spanish
  await db.insert(Products).values({
    productId: 'kindle-paperwhite-es',
    asin: 'B09TMN58KL',
    lang: 'es',
    title: 'Kindle Paperwhite 11ª Generación - 16GB',
    brand: 'Amazon',
    model: 'Kindle Paperwhite 2023',
    description: 'E-reader con pantalla de 6.8 pulgadas, luz cálida ajustable y 10 semanas de batería.',
    shortDescription: 'El mejor e-reader con pantalla antirreflejos.',
    category: 'electronics',
    tags: ['kindle', 'ebook', 'reader', 'amazon'],
    price: 149.99,
    originalPrice: 169.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B09TMN58KL',
    rating: 4.7,
    totalReviews: 34567,
    ourRating: 9.0,
    pros: ['Pantalla E-Ink', '10 semanas batería', 'Resistente al agua'],
    cons: ['Solo B&N', 'Sin audio'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/71QYgVIYNZL._AC_SL1500_.jpg',
    featuredImageAlt: 'Kindle Paperwhite negro',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 7 - Spanish
  await db.insert(Products).values({
    productId: 'logitech-mx-master-es',
    asin: 'B09HM94VDS',
    lang: 'es',
    title: 'Logitech MX Master 3S - Ratón Inalámbrico Profesional',
    brand: 'Logitech',
    model: 'MX Master 3S',
    description: 'Ratón ergonómico de alta precisión con scroll MagSpeed y conexión multi-dispositivo.',
    shortDescription: 'El mejor ratón para productividad.',
    category: 'electronics',
    tags: ['raton', 'logitech', 'ergonomico', 'oficina'],
    price: 99.99,
    originalPrice: 129.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B09HM94VDS',
    rating: 4.8,
    totalReviews: 12890,
    ourRating: 9.2,
    pros: ['Ergonómico', 'Multi-dispositivo', 'Batería larga'],
    cons: ['Caro para un ratón'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg',
    featuredImageAlt: 'Logitech MX Master 3S gris',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 8 - Spanish
  await db.insert(Products).values({
    productId: 'ps5-dualsense-es',
    asin: 'B08FC6MR62',
    lang: 'es',
    title: 'Sony DualSense - Mando Inalámbrico PS5',
    brand: 'Sony',
    model: 'DualSense',
    description: 'El mando de PS5 con retroalimentación háptica y gatillos adaptativos para una experiencia inmersiva.',
    shortDescription: 'Mando oficial PlayStation 5 con hápticos avanzados.',
    category: 'gaming',
    tags: ['ps5', 'mando', 'sony', 'gaming'],
    price: 59.99,
    originalPrice: 69.99,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B08FC6MR62',
    rating: 4.7,
    totalReviews: 56789,
    ourRating: 9.3,
    pros: ['Hápticos increíbles', 'Gatillos adaptativos', 'Diseño premium'],
    cons: ['Batería mejorable'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61cb8OS+4WL._SL1500_.jpg',
    featuredImageAlt: 'Sony DualSense blanco',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 9 - Spanish
  await db.insert(Products).values({
    productId: 'apple-watch-ultra-es',
    asin: 'B0BDJ9P9GK',
    lang: 'es',
    title: 'Apple Watch Ultra 2 - GPS + Cellular 49mm Titanio',
    brand: 'Apple',
    model: 'Watch Ultra 2',
    description: 'El reloj más resistente de Apple con GPS de doble frecuencia, 36 horas de batería y pantalla Always-On.',
    shortDescription: 'El Apple Watch más extremo para aventuras.',
    category: 'wearables',
    tags: ['apple', 'smartwatch', 'gps', 'titanio'],
    price: 899.00,
    originalPrice: 949.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0BDJ9P9GK',
    rating: 4.8,
    totalReviews: 18234,
    ourRating: 9.4,
    pros: ['36h batería', 'Titanio', 'GPS dual', 'Sumergible 100m'],
    cons: ['Muy caro', 'Grande para muñecas pequeñas'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/81wnfPPVJsL._AC_SL1500_.jpg',
    featuredImageAlt: 'Apple Watch Ultra 2 Titanio',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 10 - Spanish
  await db.insert(Products).values({
    productId: 'bose-qc-ultra-es',
    asin: 'B0CCZ1L489',
    lang: 'es',
    title: 'Bose QuietComfort Ultra - Auriculares con ANC',
    brand: 'Bose',
    model: 'QuietComfort Ultra',
    description: 'Auriculares premium con cancelación de ruido líder, audio espacial inmersivo y 24h de batería.',
    shortDescription: 'Lo mejor de Bose en cancelación de ruido.',
    category: 'audio',
    tags: ['bose', 'auriculares', 'anc', 'bluetooth'],
    price: 379.00,
    originalPrice: 449.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0CCZ1L489',
    rating: 4.5,
    totalReviews: 9876,
    ourRating: 9.1,
    pros: ['ANC excepcional', 'Audio espacial', 'Muy cómodos'],
    cons: ['Precio alto', 'Estuche grande'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/51QnOmRWvEL._AC_SL1500_.jpg',
    featuredImageAlt: 'Bose QuietComfort Ultra negro',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 11 - Spanish
  await db.insert(Products).values({
    productId: 'nintendo-switch-oled-es',
    asin: 'B098RKWHHZ',
    lang: 'es',
    title: 'Nintendo Switch OLED - Consola Blanca',
    brand: 'Nintendo',
    model: 'Switch OLED',
    description: 'La consola híbrida con pantalla OLED de 7 pulgadas, soporte ajustable y 64GB de almacenamiento.',
    shortDescription: 'La Switch definitiva con pantalla OLED.',
    category: 'gaming',
    tags: ['nintendo', 'switch', 'consola', 'gaming'],
    price: 319.00,
    originalPrice: 349.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B098RKWHHZ',
    rating: 4.8,
    totalReviews: 45678,
    ourRating: 9.3,
    pros: ['Pantalla OLED brillante', 'Portátil y dock', 'Gran catálogo'],
    cons: ['Sin 4K en dock', 'Joy-Con mejorables'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61nqNujSF1L._SL1500_.jpg',
    featuredImageAlt: 'Nintendo Switch OLED blanca',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 12 - Spanish
  await db.insert(Products).values({
    productId: 'dyson-v15-es',
    asin: 'B09B9GR7PY',
    lang: 'es',
    title: 'Dyson V15 Detect - Aspiradora Inalámbrica',
    brand: 'Dyson',
    model: 'V15 Detect Absolute',
    description: 'Aspiradora inteligente con láser detector de polvo y pantalla LCD con estadísticas en tiempo real.',
    shortDescription: 'La aspiradora más inteligente del mercado.',
    category: 'home',
    tags: ['dyson', 'aspiradora', 'hogar', 'limpieza'],
    price: 649.00,
    originalPrice: 749.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B09B9GR7PY',
    rating: 4.6,
    totalReviews: 8765,
    ourRating: 9.0,
    pros: ['Láser detector', 'Potencia excepcional', 'Pantalla LCD'],
    cons: ['Muy cara', 'Batería limitada'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61Z4Q9amtgL._AC_SL1500_.jpg',
    featuredImageAlt: 'Dyson V15 Detect oro',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 13 - Spanish
  await db.insert(Products).values({
    productId: 'macbook-air-m3-es',
    asin: 'B0CX23GFMJ',
    lang: 'es',
    title: 'Apple MacBook Air M3 - 15" 256GB Medianoche',
    brand: 'Apple',
    model: 'MacBook Air M3 15"',
    description: 'El portátil más fino del mundo con chip M3, 18h de batería y pantalla Liquid Retina de 15.3".',
    shortDescription: 'Potencia M3 en el portátil más ligero.',
    category: 'computers',
    tags: ['apple', 'macbook', 'laptop', 'm3'],
    price: 1529.00,
    originalPrice: 1599.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0CX23GFMJ',
    rating: 4.9,
    totalReviews: 12345,
    ourRating: 9.6,
    pros: ['Chip M3 potente', '18h batería', 'Silencioso', 'Pantalla 15"'],
    cons: ['Solo 8GB RAM base', 'Precio alto'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/81UFHe-rH5L._AC_SL1500_.jpg',
    featuredImageAlt: 'MacBook Air M3 15 Medianoche',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 14 - Spanish
  await db.insert(Products).values({
    productId: 'meta-quest-3-es',
    asin: 'B0C8VKH1ZD',
    lang: 'es',
    title: 'Meta Quest 3 - Gafas VR 128GB',
    brand: 'Meta',
    model: 'Quest 3',
    description: 'Gafas de realidad mixta con passthrough a color, Snapdragon XR2 Gen 2 y resolución 2064x2208 por ojo.',
    shortDescription: 'La VR más accesible y potente.',
    category: 'gaming',
    tags: ['meta', 'vr', 'quest', 'realidad-virtual'],
    price: 549.00,
    originalPrice: 599.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0C8VKH1ZD',
    rating: 4.4,
    totalReviews: 6543,
    ourRating: 8.8,
    pros: ['VR sin cables', 'Realidad mixta', 'Buen catálogo'],
    cons: ['Batería corta', 'Necesita Meta cuenta'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61nzPMNY8zL._AC_SL1500_.jpg',
    featuredImageAlt: 'Meta Quest 3 blanco',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 15 - Spanish
  await db.insert(Products).values({
    productId: 'garmin-fenix-8-es',
    asin: 'B0DGT7KCDW',
    lang: 'es',
    title: 'Garmin Fenix 8 AMOLED - 47mm Titanio',
    brand: 'Garmin',
    model: 'Fenix 8 AMOLED',
    description: 'El reloj multideporte definitivo con pantalla AMOLED, mapas TopoActive y hasta 29 días de batería.',
    shortDescription: 'El smartwatch deportivo más completo.',
    category: 'wearables',
    tags: ['garmin', 'smartwatch', 'deportivo', 'gps'],
    price: 1099.00,
    originalPrice: 1199.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B0DGT7KCDW',
    rating: 4.7,
    totalReviews: 3456,
    ourRating: 9.2,
    pros: ['29 días batería', 'AMOLED', 'Mapas integrados', 'Titanio'],
    cons: ['Muy caro', 'Complejo de usar'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/61x3EbqIseL._AC_SL1500_.jpg',
    featuredImageAlt: 'Garmin Fenix 8 AMOLED Titanio',
    status: 'published',
    isFeatured: true,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  // Product 16 - Spanish
  await db.insert(Products).values({
    productId: 'jbl-flip-6-es',
    asin: 'B09GYWSGQ9',
    lang: 'es',
    title: 'JBL Flip 6 - Altavoz Bluetooth Portátil',
    brand: 'JBL',
    model: 'Flip 6',
    description: 'Altavoz portátil resistente al agua IP67 con graves potentes y 12 horas de reproducción.',
    shortDescription: 'Sonido potente y resistente al agua.',
    category: 'audio',
    tags: ['jbl', 'altavoz', 'bluetooth', 'portatil'],
    price: 109.00,
    originalPrice: 149.00,
    currency: 'EUR',
    affiliateUrl: 'https://www.amazon.es/dp/B09GYWSGQ9',
    rating: 4.7,
    totalReviews: 34567,
    ourRating: 8.7,
    pros: ['IP67', '12h batería', 'Graves potentes', 'Compacto'],
    cons: ['Sin TWS stereo', 'Sin micrófono'],
    featuredImageUrl: 'https://m.media-amazon.com/images/I/71UefwL5rxL._AC_SL1500_.jpg',
    featuredImageAlt: 'JBL Flip 6 azul',
    status: 'published',
    isFeatured: false,
    isOnSale: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  console.log('✅ Test products seeded successfully!');
}

/**
 * Seed Deal Agent Keywords
 * Mix of popular categories + rare/unusual niches for discovery
 */
async function seedDealAgentKeywords() {
  const existing = await db.select().from(DealAgentKeywords);
  if (existing.length >= 20) {
    console.log('Keywords already seeded, skipping...');
    return;
  }

  console.log('Seeding deal agent keywords...');
  const now = new Date();

  // Keywords with mix of general + rare niches
  const keywords = [
    // === POPULAR TECH (high volume, reliable) ===
    { keyword: 'bluetooth earbuds deal', marketplace: 'com', category: 'electronics' },
    { keyword: 'wireless charger discount', marketplace: 'com', category: 'electronics' },
    { keyword: 'gaming mouse sale', marketplace: 'com', category: 'electronics' },
    { keyword: 'mechanical keyboard deal', marketplace: 'com', category: 'electronics' },
    { keyword: 'portable power bank', marketplace: 'com', category: 'electronics' },

    // === SPANISH MARKET ===
    { keyword: 'auriculares inalambricos oferta', marketplace: 'es', category: 'electronics' },
    { keyword: 'cargador rapido movil', marketplace: 'es', category: 'electronics' },
    { keyword: 'altavoz bluetooth portatil', marketplace: 'es', category: 'electronics' },

    // === RARE/UNUSUAL NICHES (buscador de nichos raros) ===
    { keyword: 'vintage mechanical watch under 100', marketplace: 'com', category: 'fashion' },
    { keyword: 'japanese stationery set', marketplace: 'com', category: 'office' },
    { keyword: 'ergonomic vertical mouse', marketplace: 'com', category: 'electronics' },
    { keyword: 'korean skincare deal', marketplace: 'com', category: 'beauty' },
    { keyword: 'standing desk converter', marketplace: 'com', category: 'home' },
    { keyword: 'retro pixel art lamp', marketplace: 'com', category: 'home' },
    { keyword: 'bonsai starter kit', marketplace: 'com', category: 'garden' },
    { keyword: 'portable espresso maker', marketplace: 'com', category: 'kitchen' },
    { keyword: 'noise cancelling earplugs sleep', marketplace: 'com', category: 'health' },
    { keyword: 'mini projector portable', marketplace: 'com', category: 'electronics' },
    { keyword: 'smart water bottle', marketplace: 'com', category: 'sports' },
    { keyword: 'led strip lights room', marketplace: 'com', category: 'home' },

    // === HIGH VALUE NICHES ===
    { keyword: 'robot vacuum deal', marketplace: 'com', category: 'home' },
    { keyword: 'air purifier hepa sale', marketplace: 'com', category: 'home' },
    { keyword: 'electric toothbrush deal', marketplace: 'com', category: 'health' },

    // === SEASONAL/TRENDING ===
    { keyword: 'camping gear sale', marketplace: 'com', category: 'sports' },
    { keyword: 'home office setup deal', marketplace: 'com', category: 'office' },
  ];

  for (const kw of keywords) {
    await db.insert(DealAgentKeywords).values({
      keyword: kw.keyword,
      marketplace: kw.marketplace,
      category: kw.category,
      isActive: true,
      resultsCount: 0,
      createdAt: now,
    });
  }

  console.log(`✅ Seeded ${keywords.length} deal agent keywords`);
}

/**
 * Seed Agent Configurations
 * Initialize all 4 agents with default settings
 */
async function seedAgentConfigs() {
  const existing = await db.select().from(AgentConfig);
  if (existing.length >= 4) {
    console.log('Agent configs already seeded, skipping...');
    return;
  }

  console.log('Seeding agent configurations...');
  const now = new Date();

  const agents = [
    {
      agentType: 'deal_hunter',
      isEnabled: true,
      intervalHours: 6,
      config: {
        maxKeywordsPerRun: 5,
        minScore: 6, // Quick score range is ~5-10, so 6 is a reasonable minimum
        minDiscount: 15,
        autoImport: true,
        autoQueueContent: true,
      },
      quotaLimit: 50,
    },
    {
      agentType: 'content_creator',
      isEnabled: true,
      intervalHours: 4,
      config: {
        maxItemsPerRun: 5,
        contentTypes: ['full'],
        autoPublish: true,
        model: 'gpt-4o-mini',
      },
      quotaLimit: 100,
    },
    {
      agentType: 'price_monitor',
      isEnabled: true,
      intervalHours: 8,
      config: {
        maxProductsPerRun: 20,
        dropThresholdPercent: 15,
        checkCuratedDeals: true,
        checkProducts: true,
        createAlerts: true,
      },
      quotaLimit: 50,
    },
    {
      agentType: 'channel_manager',
      isEnabled: true,
      intervalHours: 2,
      config: {
        enabledChannels: ['telegram'],
        maxPostsPerRun: 10,
        delayBetweenPosts: 2000,
        language: 'es',
      },
      quotaLimit: 100,
    },
  ];

  for (const agent of agents) {
    await db.insert(AgentConfig).values({
      agentType: agent.agentType,
      isEnabled: agent.isEnabled,
      intervalHours: agent.intervalHours,
      config: agent.config,
      quotaUsedToday: 0,
      quotaLimit: agent.quotaLimit,
      quotaResetAt: now,
      lastRunAt: null,
      nextRunAt: null,
      updatedAt: now,
    });
  }

  console.log('✅ Seeded 4 agent configurations');
}
