import { XMLParser } from "fast-xml-parser";
import YahooFinance from "yahoo-finance2";

export type MarketNewsItem = {
  title: string;
  source: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  provider: "yahoo" | "rss";
  matchedTerms: string[];
};

type RssSource = {
  name: string;
  url: string;
};

type CachedFeedItem = {
  title: string;
  source: string;
  url: string;
  summary?: string;
  contentText?: string;
  publishedAt?: string;
  categories: string[];
};

type AssetNewsProfile = {
  searchQuery: string;
  aliases: string[];
};

type FetchAssetNewsOptions = {
  symbol: string;
  yahooFinance: InstanceType<typeof YahooFinance>;
  shortName?: string | null;
  longName?: string | null;
  maxItems?: number;
};

const RSS_SOURCES: RssSource[] = [
  { name: "InfoMoney", url: "https://www.infomoney.com.br/feed/" },
  { name: "Money Times", url: "https://www.moneytimes.com.br/feed/" },
  { name: "Seu Dinheiro", url: "https://www.seudinheiro.com/feed/" },
  { name: "E-Investidor", url: "https://einvestidor.estadao.com.br/feed/" },
  { name: "Exame Invest", url: "https://exame.com/invest/feed/" },
  { name: "Brazil Journal", url: "https://braziljournal.com/feed/" },
  { name: "Suno Notícias", url: "https://www.suno.com.br/noticias/feed/" },
];

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_FEED_ITEMS_PER_SOURCE = 200;

const STATIC_ASSET_PROFILES: Record<string, AssetNewsProfile> = {
  "^BVSP": {
    searchQuery: "Ibovespa",
    aliases: ["Ibovespa", "B3", "bolsa brasileira", "bolsa de valores"],
  },
  "USDBRL=X": {
    searchQuery: "USD BRL",
    aliases: ["USD/BRL", "dolar", "cambio", "real brasileiro"],
  },
  "BTC-USD": {
    searchQuery: "Bitcoin",
    aliases: ["Bitcoin", "BTC", "cripto"],
  },
  "PETR4.SA": {
    searchQuery: "Petrobras",
    aliases: ["Petrobras", "PETR4", "PETR3", "petroleira estatal"],
  },
  "VALE3.SA": {
    searchQuery: "Vale",
    aliases: ["VALE3", "Vale SA", "mineradora Vale"],
  },
  "ITUB4.SA": {
    searchQuery: "Itau Unibanco",
    aliases: ["ITUB4", "Itau", "Itau Unibanco"],
  },
  "BBDC4.SA": {
    searchQuery: "Bradesco",
    aliases: ["BBDC4", "Bradesco"],
  },
  "MGLU3.SA": {
    searchQuery: "Magazine Luiza",
    aliases: ["MGLU3", "Magazine Luiza", "Magalu"],
  },
  "WEGE3.SA": {
    searchQuery: "WEG",
    aliases: ["WEGE3", "WEG"],
  },
  "ABEV3.SA": {
    searchQuery: "Ambev",
    aliases: ["ABEV3", "Ambev"],
  },
  "B3SA3.SA": {
    searchQuery: "B3SA3",
    aliases: ["B3SA3", "B3", "Brasil Bolsa Balcao"],
  },
  "ELET3.SA": {
    searchQuery: "Eletrobras",
    aliases: ["ELET3", "Eletrobras"],
  },
  "RENT3.SA": {
    searchQuery: "Localiza",
    aliases: ["RENT3", "Localiza"],
  },
  "BBAS3.SA": {
    searchQuery: "Banco do Brasil",
    aliases: ["BBAS3", "Banco do Brasil"],
  },
  "SUZB3.SA": {
    searchQuery: "Suzano",
    aliases: ["SUZB3", "Suzano"],
  },
  "RADL3.SA": {
    searchQuery: "Raia Drogasil",
    aliases: ["RADL3", "Raia Drogasil", "RD Saude"],
  },
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
  cdataPropName: "__cdata",
});

let cachedFeedItems: { expiresAt: number; items: CachedFeedItem[] } | null = null;
let inFlightFeedItems: Promise<CachedFeedItem[]> | null = null;

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function readXmlText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const cdata = (value as Record<string, unknown>).__cdata;
    if (typeof cdata === "string") {
      return cdata;
    }
  }

  return "";
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match: string, name: string) => namedEntities[name.toLowerCase()] ?? match);
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAliasWeights(normalizedAlias: string): { title: number; categories: number; url: number; summary: number; content: number } {
  const isLowPrecisionAlias = !/\d/.test(normalizedAlias) && !normalizedAlias.includes(" ") && normalizedAlias.length <= 5;

  if (isLowPrecisionAlias) {
    return {
      title: 2,
      categories: 2,
      url: 2,
      summary: 1,
      content: 0,
    };
  }

  return {
    title: 6,
    categories: 4,
    url: 3,
    summary: 3,
    content: 4,
  };
}

function isLowPrecisionAlias(normalizedAlias: string): boolean {
  return !/\d/.test(normalizedAlias) && !normalizedAlias.includes(" ") && normalizedAlias.length <= 5;
}

function containsTerm(text: string, term: string): boolean {
  if (!text || !term) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`, "i");
  return pattern.test(text);
}

function compactSummary(value?: string, maxLength = 280): string | undefined {
  if (!value) {
    return undefined;
  }

  const clean = stripHtml(value);
  if (!clean) {
    return undefined;
  }

  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1).trim()}...`;
}

function cleanName(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const clean = value
    .replace(/\b(ON|PN|N1|NM|ADR|SA|S\.A\.)\b/gi, " ")
    .replace(/[()_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clean || undefined;
}

function stripExchangeSuffix(symbol: string): string {
  return symbol.replace(/\.SA$/i, "");
}

function buildAssetNewsProfile(symbol: string, shortName?: string | null, longName?: string | null): AssetNewsProfile {
  const staticProfile = STATIC_ASSET_PROFILES[symbol];
  const dynamicAliases = [cleanName(shortName), cleanName(longName), stripExchangeSuffix(symbol)]
    .filter((value): value is string => Boolean(value));

  const searchQuery = staticProfile?.searchQuery || cleanName(shortName) || cleanName(longName) || stripExchangeSuffix(symbol);
  const aliases = Array.from(
    new Set(
      [
        searchQuery,
        ...(staticProfile?.aliases ?? []),
        ...dynamicAliases,
      ].map((value) => value.trim()).filter(Boolean)
    )
  );

  return {
    searchQuery,
    aliases,
  };
}

function scoreNewsItem(
  item: Pick<CachedFeedItem, "title" | "summary" | "contentText" | "categories" | "url">,
  aliases: string[],
): { score: number; matchedTerms: string[]; hasTextualMatch: boolean } {
  const normalizedTitle = normalizeText(item.title);
  const normalizedSummary = normalizeText(item.summary || "");
  const normalizedContent = normalizeText(item.contentText || "");
  const normalizedCategories = normalizeText(item.categories.join(" "));
  const normalizedUrl = normalizeText(item.url);

  let score = 0;
  let hasTextualMatch = false;
  const matchedTerms = new Set<string>();

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) {
      continue;
    }

    const weights = getAliasWeights(normalizedAlias);
    const titleMatched = containsTerm(normalizedTitle, normalizedAlias);
    const categoriesMatched = containsTerm(normalizedCategories, normalizedAlias);
    const urlMatched = containsTerm(normalizedUrl, normalizedAlias);
    const summaryMatched = containsTerm(normalizedSummary, normalizedAlias);
    const contentMatched = !summaryMatched && containsTerm(normalizedContent, normalizedAlias);
    const lowPrecisionSupported = categoriesMatched || summaryMatched || contentMatched;
    const canUseTitleOrUrl = !isLowPrecisionAlias(normalizedAlias) || lowPrecisionSupported;

    if (titleMatched && canUseTitleOrUrl) {
      score += weights.title;
      hasTextualMatch = true;
      matchedTerms.add(alias);
    }

    if (categoriesMatched) {
      score += weights.categories;
      matchedTerms.add(alias);
    }

    if (urlMatched && canUseTitleOrUrl) {
      score += weights.url;
      hasTextualMatch = true;
      matchedTerms.add(alias);
    }

    if (summaryMatched) {
      score += weights.summary;
      hasTextualMatch = true;
      matchedTerms.add(alias);
    }

    if (contentMatched && weights.content > 0) {
      score += weights.content;
      hasTextualMatch = true;
      matchedTerms.add(alias);
    }
  }

  return {
    score,
    matchedTerms: Array.from(matchedTerms),
    hasTextualMatch,
  };
}

function isDescriptiveQuery(query: string): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return false;
  }

  return normalizedQuery.includes(" ") || (!/\d/.test(normalizedQuery) && normalizedQuery.length >= 6);
}

function getPublishedTimeScore(publishedAt?: string): number {
  if (!publishedAt) {
    return 0;
  }

  const publishedMs = Date.parse(publishedAt);
  if (Number.isNaN(publishedMs)) {
    return 0;
  }

  return publishedMs;
}

async function fetchRssSource(source: RssSource): Promise<CachedFeedItem[]> {
  const response = await fetch(source.url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "GastoClaro/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar feed ${source.name}: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml);
  const items = toArray<any>(parsed?.rss?.channel?.item).slice(0, MAX_FEED_ITEMS_PER_SOURCE);

  return items
    .map((item) => {
      const description = readXmlText(item?.description);
      const content = readXmlText(item?.["content:encoded"]) || readXmlText(item?.content?.encoded) || readXmlText(item?.content);
      const combinedText = [description, content].filter(Boolean).join(" ");

      return {
        title: stripHtml(String(item?.title || "")).trim(),
        source: source.name,
        url: typeof item?.link === "string" ? item.link.trim() : "",
        summary: compactSummary(description || content),
        contentText: compactSummary(combinedText, 1200),
        publishedAt: typeof item?.pubDate === "string" ? new Date(item.pubDate).toISOString() : undefined,
        categories: toArray<any>(item?.category).map((category) => stripHtml(readXmlText(category) || String(category || ""))).filter(Boolean),
      };
    })
    .filter((item) => item.title && item.url);
}

async function getCachedFeedItems(): Promise<CachedFeedItem[]> {
  const now = Date.now();
  if (cachedFeedItems && cachedFeedItems.expiresAt > now) {
    return cachedFeedItems.items;
  }

  if (inFlightFeedItems) {
    return inFlightFeedItems;
  }

  inFlightFeedItems = (async () => {
    const results = await Promise.allSettled(RSS_SOURCES.map(fetchRssSource));
    const items = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);

    cachedFeedItems = {
      expiresAt: now + FEED_CACHE_TTL_MS,
      items,
    };

    return items;
  })();

  try {
    return await inFlightFeedItems;
  } finally {
    inFlightFeedItems = null;
  }
}

async function fetchYahooNews(options: FetchAssetNewsOptions, profile: AssetNewsProfile): Promise<MarketNewsItem[]> {
  try {
    const searchResult = await options.yahooFinance.search(profile.searchQuery);
    const items = toArray<any>(searchResult?.news);
    const minimumScore = isDescriptiveQuery(profile.searchQuery) ? 2 : 4;

    return items
      .map((item) => {
        const newsItem = {
          title: String(item?.title || "").trim(),
          source: String(item?.publisher || "Yahoo Finance").trim(),
          url: String(item?.link || "").trim(),
          summary: compactSummary(typeof item?.summary === "string" ? item.summary : undefined),
          publishedAt: typeof item?.providerPublishTime === "string"
            ? item.providerPublishTime
            : item?.providerPublishTime
              ? new Date(item.providerPublishTime).toISOString()
              : undefined,
          provider: "yahoo" as const,
          matchedTerms: [] as string[],
        };

        const { score, matchedTerms, hasTextualMatch } = scoreNewsItem(
          {
            title: newsItem.title,
            summary: newsItem.summary,
            contentText: typeof item?.summary === "string" ? item.summary : undefined,
            categories: toArray<string>(item?.relatedTickers).filter(Boolean),
            url: newsItem.url,
          },
          profile.aliases,
        );

        return {
          item: {
            ...newsItem,
            matchedTerms,
          },
          score,
          hasTextualMatch,
        };
      })
      .filter(({ item, score, hasTextualMatch }) => item.title && item.url && score >= minimumScore && (hasTextualMatch || score >= 6))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return getPublishedTimeScore(right.item.publishedAt) - getPublishedTimeScore(left.item.publishedAt);
      })
      .map(({ item }) => item);
  } catch (error) {
    console.warn(`Could not fetch Yahoo news for ${options.symbol}:`, error);
    return [];
  }
}

async function fetchRssNews(profile: AssetNewsProfile): Promise<MarketNewsItem[]> {
  const feedItems = await getCachedFeedItems();

  return feedItems
    .map((item) => {
      const { score, matchedTerms } = scoreNewsItem(item, profile.aliases);

      return {
        item: {
          title: item.title,
          source: item.source,
          url: item.url,
          summary: item.summary,
          publishedAt: item.publishedAt,
          provider: "rss" as const,
          matchedTerms,
        },
        score,
      };
    })
    .filter(({ score }) => score >= 4)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return getPublishedTimeScore(right.item.publishedAt) - getPublishedTimeScore(left.item.publishedAt);
    })
    .map(({ item }) => item);
}

function dedupeNewsItems(items: MarketNewsItem[]): MarketNewsItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${normalizeText(item.title)}|${item.source}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function fetchAssetNews(options: FetchAssetNewsOptions): Promise<MarketNewsItem[]> {
  const profile = buildAssetNewsProfile(options.symbol, options.shortName, options.longName);
  const [rssNews, yahooNews] = await Promise.all([
    fetchRssNews(profile),
    fetchYahooNews(options, profile),
  ]);

  return dedupeNewsItems([...rssNews, ...yahooNews])
    .sort((left, right) => getPublishedTimeScore(right.publishedAt) - getPublishedTimeScore(left.publishedAt))
    .slice(0, options.maxItems ?? 8);
}

export function summarizeNewsCoverage(news: MarketNewsItem[]): Record<string, unknown> {
  const sourceCounts = news.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.source] = (accumulator[item.source] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalItems: news.length,
    sources: Object.keys(sourceCounts),
    sourceCounts,
    latestPublishedAt: news[0]?.publishedAt || null,
  };
}