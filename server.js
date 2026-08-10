const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 4174);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Estate4Mission2026";
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "assets", "plot-sales.json");
const PROPERTIES_FILE = path.join(ROOT, "assets", "properties.json");
const NEWS_CACHE_MS = 30 * 60 * 1000;
let newsCache = {
  fetchedAt: 0,
  articles: [],
};

const newsFeeds = [
  {
    topic: "The Gambia",
    url: "https://news.google.com/rss/search?q=%22The%20Gambia%22%20%28real%20estate%20OR%20property%20OR%20housing%20OR%20infrastructure%20OR%20tourism%20investment%20OR%20land%20development%29&hl=en-US&gl=US&ceid=US:en",
  },
  {
    topic: "The Gambia",
    url: "https://news.google.com/rss/search?q=%22Gambia%22%20%28property%20market%20OR%20real%20estate%20investment%20OR%20construction%20OR%20tourism%20development%29&hl=en-US&gl=US&ceid=US:en",
  },
];

const gambiaTerms = [
  "gambia",
  "gambian",
  "banjul",
  "brufut",
  "kololi",
  "sanyang",
  "bijilo",
  "kunkajang",
  "jabanjelly",
  "pacholing",
  "taf tulip",
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const defaultSales = {
  "pacholing-3": 0,
  "pacholing-2": 0,
  kunkajang: 0,
};

const defaultProperties = [
  {
    id: "pacholing-3",
    active: true,
    order: 1,
    status: "available",
    category: "plots",
    kicker: "New plot release",
    title: "Pacholing 3 Residential Plots",
    location: "North East of Sanyang, close to Tulip Gardens",
    price: "From D380,000 GMD",
    image: "images/properties/pacholing-3-plot-plan.jpg",
    imageAlt: "Pacholing plots for sale plan",
    advertButtonLabel: "View Plan",
    totalPlots: 28,
    soldPlots: 0,
    meta: ["400-621 m2", "Road access", "Multiple plot sizes"],
    details: [
      ["Location", "North East of Sanyang"],
      ["Nearby", "Close to Tulip Gardens"],
      ["Plot sizes", "400 m2, 460 m2, 540 m2 and 621 m2"],
      ["Pricing", "D380,000, D440,000, D510,000 and D590,000 GMD"],
      ["Access", "Internal road network"],
    ],
    investmentTitle: "A flexible land release near Sanyang's growth corridor.",
    description:
      "Pacholing 3 offers multiple plot sizes for buyers seeking residential land in a developing area close to Sanyang and Tulip Gardens. The release is suitable for private homes, staged investment and buyers who want a clear entry point into The Gambia's coastal property market.",
    highlights: ["Multiple price points", "Residential potential", "Close to Sanyang", "Road access"],
    whatsappText: "Hello Estate4Mission, I would like more information about the Pacholing 3 Residential Plots.",
  },
  {
    id: "pacholing-2",
    active: true,
    order: 2,
    status: "available",
    category: "plots",
    kicker: "Title verified",
    title: "Pacholing 2 Residential Plots",
    location: "Between Sanyang and Jabanjelly, near TAF Tulip Gardens",
    price: "D440,000 GMD",
    image: "images/properties/pacholing-2-plots-sale.jpg",
    imageAlt: "Pacholing 2 plots for sale advert",
    advertButtonLabel: "View Advert",
    totalPlots: 18,
    soldPlots: 0,
    meta: ["22 x 21.3 m", "468.6 m2", "Residential use"],
    details: [
      ["Location", "Between Sanyang and Jabanjelly"],
      ["Nearby", "Near TAF Tulip Gardens"],
      ["Plot size", "22 x 21.3 m"],
      ["Area", "468.6 m2"],
      ["Use", "Residential"],
      ["Title", "Verified"],
    ],
    investmentTitle: "Verified residential plots in an accessible location.",
    description:
      "Pacholing 2 is positioned between Sanyang and Jabanjelly, close to TAF Tulip Gardens. The offer is clear and easy to understand: residential plots of 468.6 m2 with verified title information and direct local support from the Estate4Mission network.",
    highlights: ["Verified title", "Residential use", "468.6 m2 plots", "Near TAF Tulip Gardens"],
    whatsappText: "Hello Estate4Mission, I would like more information about the Pacholing 2 Residential Plots.",
  },
  {
    id: "kunkajang",
    active: true,
    order: 3,
    status: "available",
    category: "plots",
    kicker: "Strategic location",
    title: "Kunkajang Residential Plots",
    location: "Kunkajang, peaceful and accessible community",
    price: "From D275,000 GMD",
    image: "images/properties/kunkajang-plots-sale.jpg",
    imageAlt: "Kunkajang plots for sale advert",
    advertButtonLabel: "View Advert",
    totalPlots: 50,
    soldPlots: 0,
    meta: ["400-496 m2", "8 m roads", "Title verified"],
    details: [
      ["Location", "Kunkajang"],
      ["Plot types", "20 x 20 m, 16 x 31 m and 15 x 31 m"],
      ["Areas", "400 m2, 496 m2 and 465 m2"],
      ["Pricing", "D275,000, D340,000 and D320,000 GMD"],
      ["Roads", "8 meter internal road network"],
      ["Title", "Verified"],
    ],
    investmentTitle: "A larger residential land opportunity with strong access roads.",
    description:
      "Kunkajang offers a broad release of residential plots in a peaceful and accessible community. With multiple plot types, 8 meter internal roads and verified title positioning, it is designed for buyers who want room for future growth and long-term value.",
    highlights: ["8 meter roads", "Multiple plot types", "Verified title", "Future growth potential"],
    whatsappText: "Hello Estate4Mission, I would like more information about the Kunkajang Residential Plots.",
  },
];

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const toText = (value, fallback = "") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const toInteger = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};

const toList = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .length
    ? String(value || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;
};

const toPairs = (value, fallback = []) => {
  if (Array.isArray(value)) {
    const pairs = value
      .map((item) => {
        if (Array.isArray(item)) {
          return [toText(item[0]), toText(item[1])];
        }

        const [label, ...rest] = String(item || "").split(":");
        return [toText(label), toText(rest.join(":"))];
      })
      .filter(([label, detail]) => label && detail);

    return pairs.length ? pairs : fallback;
  }

  const pairs = String(value || "")
    .split("\n")
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return [toText(label), toText(rest.join(":"))];
    })
    .filter(([label, detail]) => label && detail);

  return pairs.length ? pairs : fallback;
};

const isSafeImage = (value = "") =>
  /^images\/properties\/[\w./-]+\.(avif|jpg|jpeg|png|webp)$/i.test(value) ||
  /^data:image\/(avif|jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i.test(value);

const sortProperties = (properties) =>
  [...properties].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const sanitizeProperties = (properties) => {
  const source = Array.isArray(properties) ? properties : defaultProperties;
  const seen = new Set();

  return sortProperties(source).map((property, index) => {
    const title = toText(property.title, `Plot Opportunity ${index + 1}`);
    const baseId = slugify(property.id || title) || `plot-${Date.now()}-${index + 1}`;
    let id = baseId;
    let suffix = 2;

    while (seen.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    seen.add(id);

    const totalPlots = toInteger(property.totalPlots, 0);
    const soldPlots = Math.min(toInteger(property.soldPlots, 0), totalPlots);
    const status = ["available", "reserved", "sold"].includes(property.status) ? property.status : "available";
    const image = isSafeImage(property.image) ? property.image : "images/properties/pacholing-3-plot-plan.jpg";

    return {
      id,
      active: property.active !== false,
      order: toInteger(property.order, index + 1),
      status,
      category: "plots",
      kicker: toText(property.kicker, "Current plot release"),
      title,
      location: toText(property.location, "The Gambia"),
      price: toText(property.price, "Price on request"),
      image,
      imageAlt: toText(property.imageAlt, `${title} advert`),
      advertButtonLabel: toText(property.advertButtonLabel, "View Advert"),
      totalPlots,
      soldPlots,
      meta: toList(property.meta, ["Residential plots"]),
      details: toPairs(property.details, [["Location", toText(property.location, "The Gambia")]]),
      investmentTitle: toText(property.investmentTitle, `${title} investment opportunity.`),
      description: toText(
        property.description,
        "A verified plot opportunity managed by Estate4Mission with local support and a focus on long-term impact."
      ),
      highlights: toList(property.highlights, ["Verified opportunity", "Local support"]),
      whatsappText: toText(property.whatsappText, `Hello Estate4Mission, I would like more information about ${title}.`),
    };
  });
};

const ensurePropertiesFile = async () => {
  await fs.mkdir(path.dirname(PROPERTIES_FILE), { recursive: true });

  try {
    await fs.access(PROPERTIES_FILE);
  } catch {
    await fs.writeFile(PROPERTIES_FILE, `${JSON.stringify(defaultProperties, null, 2)}\n`);
  }
};

const readProperties = async () => {
  await ensurePropertiesFile();
  const raw = await fs.readFile(PROPERTIES_FILE, "utf8");
  return sanitizeProperties(JSON.parse(raw));
};

const writeProperties = async (properties) => {
  await ensurePropertiesFile();
  const sanitized = sanitizeProperties(properties);
  await fs.writeFile(PROPERTIES_FILE, `${JSON.stringify(sanitized, null, 2)}\n`);
  return sanitized;
};

const ensureDataFile = async () => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultSales, null, 2));
  }
};

const readSales = async () => {
  const properties = await readProperties();
  return Object.fromEntries(properties.map((property) => [property.id, property.soldPlots]));
};

const writeSales = async (sales) => {
  const properties = await readProperties();
  const updatedProperties = properties.map((property) => ({
    ...property,
    soldPlots: Math.min(toInteger(sales[property.id], property.soldPlots), property.totalPlots),
  }));

  await writeProperties(updatedProperties);
};

const sanitizeSales = (sales) => {
  return Object.fromEntries(
    Object.entries(sales || {}).map(([key, value]) => [slugify(key), toInteger(value, 0)])
  );
};

const decodeEntities = (value = "") =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value = "") =>
  decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getTagValue = (item, tagName) => {
  const match = item.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
};

const getSourceName = (item, fallback) => {
  const sourceMatch = item.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i);
  return sourceMatch ? stripHtml(sourceMatch[1]) : fallback;
};

const cleanArticleTitle = (title, source) => {
  const cleanTitle = stripHtml(title);

  if (!source) {
    return cleanTitle;
  }

  return cleanTitle.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "").trim();
};

const createSummary = (description, title, source, topic) => {
  const cleanDescription = stripHtml(description);
  const cleanTitle = stripHtml(title);
  const normalizedDescription = cleanDescription
    .replace(source, "")
    .replace(/\s+/g, " ")
    .replace(/\s+-\s*$/, "")
    .trim();
  const normalizedTitle = cleanArticleTitle(cleanTitle, source).replace(/\s+/g, " ").trim();
  const duplicateDescription = normalizedDescription === normalizedTitle;
  const summarySource = cleanDescription && cleanDescription !== cleanTitle && !duplicateDescription ? cleanDescription : "";
  const summary = summarySource.replace(/\s+-\s+[^-]+$/, "").trim();

  if (!summary) {
    const headline = cleanArticleTitle(cleanTitle, source).replace(/[.?!]+$/, "");
    return `A recent external market update covering ${topic}: ${headline}.`;
  }

  if (summary.length <= 190) {
    return summary;
  }

  return `${summary.slice(0, 187).replace(/\s+\S*$/, "")}...`;
};

const parseRssFeed = (xml, feed) => {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return items.map((item) => {
    const rawTitle = stripHtml(getTagValue(item, "title"));
    const link = stripHtml(getTagValue(item, "link"));
    const publishedAt = stripHtml(getTagValue(item, "pubDate"));
    const description = getTagValue(item, "description");
    const source = getSourceName(item, feed.topic);
    const title = cleanArticleTitle(rawTitle, source);
    const timestamp = Number.isNaN(Date.parse(publishedAt)) ? 0 : Date.parse(publishedAt);

    return {
      title,
      source,
      topic: feed.topic,
      publishedAt,
      timestamp,
      summary: createSummary(description, rawTitle, source, feed.topic),
      url: link,
      searchText: `${rawTitle} ${description} ${source}`,
    };
  });
};

const isGambiaArticle = (article) => {
  const haystack = `${article.searchText || ""}`.toLowerCase();
  return gambiaTerms.some((term) => haystack.includes(term));
};

const fetchNews = async () => {
  if (Date.now() - newsCache.fetchedAt < NEWS_CACHE_MS && newsCache.articles.length) {
    return newsCache.articles;
  }

  const feedResponses = await Promise.allSettled(
    newsFeeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        headers: {
          "User-Agent": "Estate4Mission market updates reader",
        },
      });

      if (!response.ok) {
        throw new Error(`Could not load feed: ${feed.topic}`);
      }

      return parseRssFeed(await response.text(), feed);
    })
  );

  const seenUrls = new Set();
  const articles = feedResponses
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((article) => article.title && article.url)
    .filter(isGambiaArticle)
    .filter((article) => {
      if (seenUrls.has(article.url)) {
        return false;
      }

      seenUrls.add(article.url);
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 9)
    .map(({ searchText, ...article }) => article);

  newsCache = {
    fetchedAt: Date.now(),
    articles,
  };

  return articles;
};

const serveStatic = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestedPath === "/" ? "index.html" : requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, { ok: true, service: "Estate4Mission" });
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/properties")) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const properties = await readProperties();
      const id = url.searchParams.get("id");

      if (id) {
        const property = properties.find((item) => item.id === id && item.active);

        if (!property) {
          sendJson(res, 404, { ok: false, message: "Property not found" });
          return;
        }

        sendJson(res, 200, { property });
        return;
      }

      sendJson(res, 200, {
        properties: sortProperties(properties).filter((property) => property.active),
      });
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/plot-sales")) {
      sendJson(res, 200, { sales: await readSales() });
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/api/news")) {
      sendJson(res, 200, {
        articles: await fetchNews(),
        updatedAt: new Date(newsCache.fetchedAt).toISOString(),
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/login") {
      const body = await readBody(req);
      sendJson(res, body.password === ADMIN_PASSWORD ? 200 : 401, {
        ok: body.password === ADMIN_PASSWORD,
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/properties") {
      const body = await readBody(req);

      if (body.password !== ADMIN_PASSWORD) {
        sendJson(res, 401, { ok: false, message: "Unauthorized" });
        return;
      }

      const properties = await writeProperties(body.properties || []);
      sendJson(res, 200, { ok: true, properties });
      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/plot-sales") {
      const body = await readBody(req);

      if (body.password !== ADMIN_PASSWORD) {
        sendJson(res, 401, { ok: false, message: "Unauthorized" });
        return;
      }

      const sales = sanitizeSales(body.sales || {});
      await writeSales(sales);
      sendJson(res, 200, { ok: true, sales });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Estate4Mission server running at http://localhost:${PORT}`);
});
