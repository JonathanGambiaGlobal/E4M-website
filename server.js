const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 4174);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Estate4Mission2026";
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "assets", "plot-sales.json");
const PROPERTIES_FILE = path.join(ROOT, "assets", "properties.json");

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

const toPlotNumbers = (value, totalPlots) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\n,]/)
        .map((item) => item.trim());

  return [
    ...new Set(
      source
        .map((item) => Number(item))
        .filter((number) => Number.isInteger(number) && number >= 1 && number <= totalPlots)
    ),
  ].sort((a, b) => a - b);
};

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
    const soldPlotNumbers = toPlotNumbers(property.soldPlotNumbers, totalPlots);
    const soldPlots = soldPlotNumbers.length || Math.min(toInteger(property.soldPlots, 0), totalPlots);
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
      soldPlotNumbers,
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
