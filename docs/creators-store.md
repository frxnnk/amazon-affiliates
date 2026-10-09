# Public storefront with Creators API

Discovery, text search and pasted product links use the official Creators client.
They do not read a demo/Markdown/database catalog or call a paid fallback.
Spanish and English interfaces both initially shop on Amazon.com.

Set these **service runtime variables** in OpenShip:

```dotenv
AMAZON_DATA_PROVIDER=creators
AMAZON_CREATORS_CREDENTIAL_VERSION=3.1
AMAZON_CREATORS_DAILY_LIMIT=1000
AMAZON_PA_API_PARTNER_TAG=rewardhive-20
```

Store `AMAZON_CREATORS_CREDENTIAL_ID` and `AMAZON_CREATORS_CREDENTIAL_SECRET`
as service secrets, never project build arguments. Version 3.1 selects the US
LWA authentication endpoint. Other credential versions require their corresponding
endpoint; interface language does not choose it. Other marketplaces also require
a valid `AMAZON_PA_API_PARTNER_TAG_<country>` for that program.

The client shares a one-hour cache of at most 100 responses, a 20-request queue,
one catalog request per second and an adjustable budget capped at 1000 requests
per UTC day. These controls are **per process** and reset on restart; they are not
a persistent or distributed account quota. Failed authentication enters a five-minute
cooldown. Search returns five products per page and at most ten pages.

Missing prices, images and ratings stay unknown. Official product URLs remain
unchanged. A failed provider produces HTTP 503 and an unavailable message;
successful searches with zero matches produce an empty result. No product data is
written to permanent server storage by these routes.

Validate with `npm run test:unit`, `npm run db:schema:check`, an OpenShip Node build
and `npm run test:runtime`. Runtime tests use a disposable database and mocked
official responses; they do not establish real account access. Activation requires
a successful request with the actual account credentials.

Contract: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
