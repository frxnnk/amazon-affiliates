// Isolated runtime fixture: reject every outbound request except the exact mocked API.
const product = (asin, withPrice = true) => ({
  asin, detailPageURL: `https://www.amazon.com/dp/${asin}?tag=rewardhive-20&linkCode=ogi`,
  itemInfo: { title: { displayValue: 'Runtime Creators Fixture' } },
  ...(withPrice ? { offersV2: { listings: [{ price: { money: { amount: 25, currency: 'USD' } } }] } } : {}),
});
function reject(message) {
  console.error('FixtureUnexpectedOutbound');
  throw new Error(message);
}

globalThis.fetch = async (url, options = {}) => {
  const target = new URL(url);
  const body = JSON.parse(options.body || '{}');
  if (target.href === 'https://api.amazon.com/auth/o2/token') {
    if (body.scope !== 'creatorsapi::default' || body.grant_type !== 'client_credentials') return reject('Unexpected OAuth contract');
    console.log('FixtureCreatorsCall:oauth');
    return Response.json({ access_token: 'runtime-fixture-token', expires_in: 3600 });
  }
  if (target.origin !== 'https://creatorsapi.amazon' || !['/catalog/v1/searchItems', '/catalog/v1/getItems'].includes(target.pathname)) {
    return reject('Outbound HTTP disabled outside Creators fixture');
  }
  if (options.headers.Authorization !== 'Bearer runtime-fixture-token' || body.marketplace !== 'www.amazon.com'
    || body.partnerTag !== 'rewardhive-20' || !Array.isArray(body.resources)) return reject('Unexpected catalog contract');
  console.log('FixtureCreatorsCall:' + target.pathname.split('/').at(-1));
  if (body.keywords === 'fixture denied') return new Response('{}', { status: 403 });
  if (target.pathname.endsWith('/getItems')) {
    return Response.json({ itemsResult: { items: [product(body.itemIds[0], false)] } });
  }
  return Response.json({ searchResult: { totalResultCount: 8,
    items: body.keywords === 'fixture empty' ? []
      : Array.from({ length: 5 }, (_, index) => product('B00000000' + index, index !== 1)) } });
};
