const site = { "name": "BestDeals Hub", "tagline": { "es": "Las mejores ofertas y reviews de productos", "en": "Best deals and product reviews" }, "url": "https://amazon-affiliates.vercel.app" };
const amazon = { "associates": { "es": { "tag": "tutienda-21", "marketplace": "amazon.es" }, "en": { "tag": "bestdeal0ee40-20", "marketplace": "amazon.com" } } };
const seo = { "defaultImage": "/images/og/default.jpg" };
const social = { "twitter": "@bestdealshub", "facebook": "bestdealshub" };
const siteConfig = {
  site,
  amazon,
  seo,
  social
};
export {
  siteConfig as s
};
