// Runtime smoke tests must never contact production providers or databases.
globalThis.fetch = async () => { throw new Error('Outbound HTTP disabled during runtime smoke test'); };
