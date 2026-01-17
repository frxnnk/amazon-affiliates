# PriceHawk - Plan de Producto Completo

## 🎯 Vision Statement

**"El tracker de precios inteligente para compradores internacionales"**

> Monitoreamos precios en Amazon, Mercado Libre y eBay. Te alertamos cuando baja Y te mostramos el costo TOTAL de traerlo a tu país - incluyendo envío, impuestos y opciones de casillero.

---

## 📋 Executive Summary

### El Problema
- Usuarios de LATAM quieren comprar en Amazon US pero no saben el costo real
- Precio del producto ≠ Costo total (envío + aduana + casillero)
- Las herramientas existentes (Keepa, CamelCamelCamel) son feas y no muestran landed cost
- Los casilleros son fragmentados y confusos

### La Solución
- Alertas de precio simples y modernas
- Cálculo automático de "landed cost" (costo total para tu país)
- Integración con casilleros para envío internacional
- Multi-marketplace (Amazon, MeLi, eBay)

### Diferenciación Clave
| Competidor | Limitación | Nuestra Ventaja |
|------------|-----------|-----------------|
| Keepa | UI horrible, técnico | UX moderna, mobile-first |
| CamelCamelCamel | Solo web, sin landed cost | Multi-canal, costo total |
| Honey | Extension only | App dedicada, alertas push |
| Tiendamia | Solo compra, no tracking | Solo tracking, agnóstico |

---

## 🏗️ Arquitectura del Producto

### Stack Técnico (heredado del proyecto actual)
- **Frontend:** Astro 5 + Tailwind CSS 4
- **Auth:** Clerk
- **Database:** Astro DB (Turso)
- **APIs:** RapidAPI (Amazon), PA-API, Dutify (landed cost)
- **Notifications:** Resend (email), Telegram Bot
- **Deploy:** Vercel

### Componentes Reutilizables
| Componente Actual | Reutilización |
|-------------------|---------------|
| Feed UI | → Dashboard de alertas |
| Amazon APIs | → Monitoreo de precios |
| Clerk Auth | → Sin cambios |
| Telegram Bot | → Envío de alertas |
| DB Schema | → Nueva tabla PriceAlerts |

---

## 🗂️ ÉPICAS Y USER STORIES

### EPIC 1: Core Price Alerts
**Objetivo:** Usuario puede crear y recibir alertas de precio básicas

#### US-1.1: Agregar alerta desde URL
```
Como usuario
Quiero pegar una URL de Amazon y definir un precio objetivo
Para recibir una notificación cuando baje
```
**Acceptance Criteria:**
- [ ] Input acepta URLs de Amazon US, ES, DE, etc.
- [ ] Sistema extrae ASIN automáticamente
- [ ] Sistema obtiene precio actual
- [ ] Usuario puede definir precio objetivo o "cualquier descuento"
- [ ] Alerta se guarda en DB

**Archivos a modificar:**
- `db/config.ts` - Nueva tabla PriceAlerts
- `src/pages/api/alerts/create.ts` - Nuevo endpoint
- `src/lib/amazon-paapi.ts` - Reutilizar
- `src/components/alerts/CreateAlertForm.astro` - Nuevo componente

---

#### US-1.2: Dashboard de mis alertas
```
Como usuario
Quiero ver todas mis alertas activas y completadas
Para gestionar qué productos estoy monitoreando
```
**Acceptance Criteria:**
- [ ] Lista de alertas con status (active, triggered, paused)
- [ ] Ver precio actual vs precio objetivo
- [ ] Historial de precios (sparkline últimos 30 días)
- [ ] Acciones: pausar, eliminar, editar precio objetivo

**Archivos a modificar:**
- `src/pages/[lang]/dashboard/alerts/index.astro` - Nueva página
- `src/components/alerts/AlertCard.astro` - Nuevo componente
- `src/components/alerts/PriceSparkline.astro` - Nuevo componente

---

#### US-1.3: Notificación por email
```
Como usuario
Quiero recibir un email cuando el precio baje a mi objetivo
Para poder comprar al precio deseado
```
**Acceptance Criteria:**
- [ ] Email enviado automáticamente cuando precio <= objetivo
- [ ] Email incluye: producto, precio actual, precio original, link de compra
- [ ] Unsubscribe link funcional
- [ ] Rate limiting (max 1 email por alerta por día)

**Archivos a crear:**
- `src/lib/notifications/email.ts` - Integración Resend
- `src/jobs/check-prices.ts` - Cron job
- `src/emails/price-alert.tsx` - Template de email

---

#### US-1.4: Notificación por Telegram
```
Como usuario Pro
Quiero recibir alertas por Telegram
Para enterarme más rápido que por email
```
**Acceptance Criteria:**
- [ ] Usuario puede conectar su cuenta de Telegram
- [ ] Bot envía mensaje cuando precio baja
- [ ] Mensaje incluye imagen del producto y botón de compra
- [ ] Feature solo para usuarios Pro

**Archivos a modificar:**
- `src/lib/telegram-bot.ts` - Ya existe, adaptar
- `src/pages/api/user/connect-telegram.ts` - Nuevo endpoint

---

### EPIC 2: Landed Cost Calculator
**Objetivo:** Usuario ve el costo TOTAL de traer un producto a su país

#### US-2.1: Guardar ubicación del usuario
```
Como usuario
Quiero guardar mi país y código postal
Para ver costos de envío relevantes a mi ubicación
```
**Acceptance Criteria:**
- [ ] Selector de país (dropdown)
- [ ] Campo de código postal (opcional)
- [ ] Se guarda en perfil de usuario
- [ ] Se usa para cálculos de landed cost

**Archivos a modificar:**
- `db/config.ts` - Agregar campos a Users
- `src/pages/[lang]/profile/index.astro` - Agregar formulario

---

#### US-2.2: Mostrar breakdown de costos
```
Como usuario
Quiero ver el desglose de costos (producto + envío + impuestos)
Para saber cuánto realmente me costará el producto
```
**Acceptance Criteria:**
- [ ] Precio del producto
- [ ] Costo de casillero (estimado)
- [ ] Impuestos de importación (API Dutify)
- [ ] Costo de envío internacional
- [ ] TOTAL LANDED COST
- [ ] Comparación con precio local si disponible

**Archivos a crear:**
- `src/lib/landed-cost/calculator.ts` - Lógica de cálculo
- `src/lib/landed-cost/dutify.ts` - Integración API
- `src/components/alerts/LandedCostBreakdown.astro` - Componente UI

---

#### US-2.3: Integración con casilleros
```
Como usuario
Quiero ver opciones de casilleros para enviar mi producto
Para elegir el más conveniente
```
**Acceptance Criteria:**
- [ ] Mostrar 2-3 opciones de casilleros (Aeropost, Tiendamia)
- [ ] Precio estimado de cada uno
- [ ] Link de afiliado para trackear conversiones
- [ ] Disclaimer legal

**Archivos a crear:**
- `src/lib/warehouses/index.ts` - Datos de casilleros
- `src/components/alerts/WarehouseOptions.astro` - Componente UI

---

### EPIC 3: Multi-Marketplace
**Objetivo:** Monitorear precios en múltiples marketplaces

#### US-3.1: Integración Mercado Libre
```
Como usuario de LATAM
Quiero monitorear precios en Mercado Libre
Para comparar con Amazon
```
**Acceptance Criteria:**
- [ ] Agregar alerta con URL de Mercado Libre
- [ ] Obtener precio actual via API
- [ ] Monitorear cambios de precio
- [ ] Mostrar en el mismo dashboard que alertas de Amazon

**Archivos a crear:**
- `src/lib/mercadolibre/api.ts` - Cliente de API
- `src/lib/mercadolibre/auth.ts` - OAuth flow

---

#### US-3.2: Integración eBay
```
Como usuario
Quiero monitorear precios en eBay
Para encontrar el mejor deal entre marketplaces
```
**Acceptance Criteria:**
- [ ] Agregar alerta con URL de eBay
- [ ] Soporte para Buy It Now y subastas
- [ ] Mostrar si es nuevo o usado

**Archivos a crear:**
- `src/lib/ebay/api.ts` - Cliente de API

---

#### US-3.3: Comparación cross-marketplace
```
Como usuario
Quiero ver si el mismo producto está más barato en otro marketplace
Para no perder mejores ofertas
```
**Acceptance Criteria:**
- [ ] Match de productos por título/EAN/UPC
- [ ] Mostrar "También disponible en X por $Y"
- [ ] Alerta opcional cuando hay mejor precio en otro marketplace

---

### EPIC 4: Monetización
**Objetivo:** Generar revenue sostenible

#### US-4.1: Plan Free con límites
```
Como usuario Free
Tengo acceso limitado a la plataforma
Para probar el producto antes de pagar
```
**Límites Free:**
- 3 alertas activas máximo
- Solo notificaciones por email
- Sin landed cost calculator
- Sin multi-marketplace

---

#### US-4.2: Plan Pro
```
Como usuario
Quiero upgrade a Pro
Para acceder a todas las funcionalidades
```
**Beneficios Pro ($4.99/mes):**
- Alertas ilimitadas
- Telegram + email
- Landed cost calculator
- Multi-marketplace
- Historial de precios extendido (90 días)
- Soporte prioritario

**Archivos a crear:**
- `src/lib/stripe/checkout.ts` - Integración Stripe
- `src/pages/api/billing/create-session.ts` - Endpoint
- `src/pages/[lang]/pricing/index.astro` - Página de pricing

---

#### US-4.3: Comisiones de afiliado
```
Como plataforma
Quiero ganar comisión por compras realizadas
Para generar revenue adicional
```
**Implementación:**
- Amazon Associates tag en todos los links
- Affiliate links a casilleros
- Tracking de conversiones

---

## 📅 ROADMAP

### Fase 1: MVP Core (Semanas 1-4)
**Objetivo:** Alertas de precio funcionales para Amazon

| Semana | Entregables |
|--------|-------------|
| 1 | Landing page + Waitlist + Branding |
| 2 | DB schema + API create alert + Cron job |
| 3 | Dashboard UI + Email notifications |
| 4 | Polish + Deploy + Invitar waitlist |

**Métricas de éxito:**
- 100+ usuarios en waitlist
- 50+ alertas creadas en primera semana
- 70%+ retention semana 2

---

### Fase 2: Landed Cost (Semanas 5-8)
**Objetivo:** Diferenciación con costo total

| Semana | Entregables |
|--------|-------------|
| 5 | Ubicación de usuario + Integración Dutify |
| 6 | Breakdown de costos UI |
| 7 | Datos de casilleros + Links de afiliado |
| 8 | Testing + Feedback loop |

**Métricas de éxito:**
- 60%+ usuarios configuran ubicación
- 10+ clicks a casilleros por semana

---

### Fase 3: Multi-Marketplace (Semanas 9-12)
**Objetivo:** Expandir a MeLi y eBay

| Semana | Entregables |
|--------|-------------|
| 9-10 | Integración Mercado Libre |
| 11 | Integración eBay |
| 12 | Comparación cross-marketplace |

---

### Fase 4: Monetización (Semanas 13-16)
**Objetivo:** Revenue sostenible

| Semana | Entregables |
|--------|-------------|
| 13 | Stripe integration + Paywalls |
| 14 | Plan Pro live |
| 15-16 | Optimización conversión |

---

## 📊 MÉTRICAS Y KPIs

### North Star Metric
**Alertas triggered que resultan en compra**

### Métricas de Adquisición
- Visitantes únicos
- Signups
- Alertas creadas primera sesión

### Métricas de Engagement
- DAU/MAU ratio
- Alertas activas por usuario
- Tiempo en dashboard

### Métricas de Monetización
- Conversión Free → Pro
- ARPU (Average Revenue Per User)
- Churn rate
- Comisiones de afiliado

### Targets Mes 3
| Métrica | Target |
|---------|--------|
| MAU | 2,000 |
| Alertas activas | 5,000 |
| Usuarios Pro | 100 |
| MRR | $500 |

---

## 💰 MODELO FINANCIERO

### Pricing
| Plan | Precio | Límites |
|------|--------|---------|
| Free | $0 | 3 alertas, email only |
| Pro Monthly | $4.99/mes | Ilimitado + Telegram + Landed Cost |
| Pro Annual | $39.99/año | 33% descuento |

### Proyección de Revenue
| Mes | MAU | Pro Users | MRR | ARR |
|-----|-----|-----------|-----|-----|
| 3 | 2,000 | 100 | $500 | $6,000 |
| 6 | 8,000 | 400 | $2,000 | $24,000 |
| 12 | 25,000 | 1,250 | $6,250 | $75,000 |

### Costos Operativos
| Concepto | Costo/mes |
|----------|-----------|
| RapidAPI | $15-50 |
| Vercel | $0-20 |
| Resend (email) | $0-20 |
| Dutify API | $0-100 |
| Dominio | $1.25 |
| **Total** | **$16-191** |

**Break-even:** ~30-40 usuarios Pro

---

## 🔧 DETALLES TÉCNICOS

### Nueva Tabla: PriceAlerts
```sql
CREATE TABLE PriceAlerts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,

  -- Producto
  marketplace TEXT NOT NULL, -- 'amazon', 'mercadolibre', 'ebay'
  productUrl TEXT NOT NULL,
  productId TEXT NOT NULL, -- ASIN, MLA-ID, etc.
  productTitle TEXT,
  productImage TEXT,

  -- Precios
  currentPrice INTEGER NOT NULL, -- en cents
  targetPrice INTEGER, -- null = "cualquier descuento"
  originalPrice INTEGER, -- precio al crear alerta
  currency TEXT DEFAULT 'USD',

  -- Status
  status TEXT DEFAULT 'active', -- active, triggered, paused, expired
  lastChecked TIMESTAMP,
  triggeredAt TIMESTAMP,

  -- Config
  notifyEmail BOOLEAN DEFAULT true,
  notifyTelegram BOOLEAN DEFAULT false,

  -- Meta
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### APIs Externas a Integrar
| API | Propósito | Costo |
|-----|-----------|-------|
| RapidAPI Amazon | Precios y datos | $0.003/req |
| Amazon PA-API | Backup/redundancia | Gratis |
| Mercado Libre | Precios LATAM | Gratis |
| eBay Browse | Precios US/EU | Gratis (5K/día) |
| Dutify | Landed cost | $0-0.10/calc |
| Resend | Emails | $0-20/mes |
| Stripe | Pagos | 2.9% + $0.30 |

### Cron Jobs
| Job | Frecuencia | Descripción |
|-----|------------|-------------|
| check-prices | 15 min | Verificar precios de alertas activas |
| cleanup-expired | 24h | Limpiar alertas expiradas |
| send-summary | 24h | Email resumen diario (opcional) |

---

## ✅ CHECKLIST DE LANZAMIENTO

### Pre-Launch
- [ ] Dominio registrado
- [ ] Branding definido (nombre, logo, colores)
- [ ] Landing page con waitlist
- [ ] Cuentas de redes sociales creadas
- [ ] Terms of Service y Privacy Policy
- [ ] Amazon Associates aprobado

### MVP Launch
- [ ] DB migrada
- [ ] APIs funcionando
- [ ] Dashboard completo
- [ ] Notificaciones funcionando
- [ ] Deploy a producción
- [ ] Monitoring configurado (Sentry/similar)
- [ ] Analytics configurado

### Post-Launch
- [ ] Post en Product Hunt
- [ ] Post en IndieHackers
- [ ] Compartir en comunidades relevantes
- [ ] Recopilar feedback
- [ ] Iterar basado en uso real

---

## 🔗 RECURSOS Y REFERENCIAS

### APIs
- [RapidAPI Amazon](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data)
- [Amazon PA-API 5.0](https://webservices.amazon.com/paapi5/documentation/)
- [Mercado Libre API](https://developers.mercadolibre.com/)
- [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html)
- [Dutify Landed Cost](https://dutify.com/landed-cost-ecommerce-api)
- [Resend Email](https://resend.com/docs)

### Casilleros
- [Aeropost](https://aeropost.com) - LATAM líder
- [Tiendamia](https://tiendamia.com) - Uruguay/Paraguay
- [Grabr](https://grabr.io) - P2P shipping

### Competencia
- [Keepa](https://keepa.com)
- [CamelCamelCamel](https://camelcamelcamel.com)
- [Honey](https://joinhoney.com)

---

## 📝 NOTAS PARA LINEAR

### Labels sugeridos
- `epic:core-alerts`
- `epic:landed-cost`
- `epic:multi-marketplace`
- `epic:monetization`
- `priority:high/medium/low`
- `type:feature/bug/chore`

### Milestones
1. MVP Launch (Semana 4)
2. Landed Cost Release (Semana 8)
3. Multi-Marketplace (Semana 12)
4. Pro Launch (Semana 16)

### Workflow
`Backlog → Todo → In Progress → Review → Done`
