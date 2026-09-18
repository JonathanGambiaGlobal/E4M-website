const body = document.body;
const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const scrollTopButton = document.querySelector(".scroll-top");
const loader = document.querySelector(".loader");
const filterButtons = document.querySelectorAll(".filter-btn");
let propertyCards = [];
const propertyGrid = document.querySelector("[data-property-grid]");
const year = document.querySelector("#year");
const advertModal = document.querySelector(".advert-modal");
const advertModalImage = document.querySelector(".advert-modal-image");
const advertModalTitle = document.querySelector(".advert-modal-title");
const advertModalClose = document.querySelector(".advert-modal-close");
const advertModalBackdrop = document.querySelector(".advert-modal-backdrop");
const adminOpen = document.querySelector(".admin-open");
const adminModal = document.querySelector(".admin-modal");
const adminClose = document.querySelector(".admin-close");
const adminModalBackdrop = document.querySelector(".admin-modal-backdrop");
const adminLogin = document.querySelector(".admin-login");
const adminEditor = document.querySelector(".admin-editor");
const adminRows = document.querySelector("[data-admin-rows]");
const adminLoginMessage = document.querySelector("[data-admin-login-message]");
const adminEditorMessage = document.querySelector("[data-admin-editor-message]");
const adminLeads = document.querySelector("[data-admin-leads]");
const adminLeadsRefresh = document.querySelector(".admin-leads-refresh");
const adminAdd = document.querySelector(".admin-add");
const impressionSlider = document.querySelector("[data-impression-slider]");
const plotSpotlightCard = document.querySelector("[data-plot-spotlight-card]");
const plotSpotlightImage = document.querySelector("[data-plot-spotlight-image]");
const plotSpotlightStatus = document.querySelector("[data-plot-spotlight-status]");
const plotSpotlightKicker = document.querySelector("[data-plot-spotlight-kicker]");
const plotSpotlightTitle = document.querySelector("[data-plot-spotlight-title]");
const plotSpotlightLocation = document.querySelector("[data-plot-spotlight-location]");
const plotSpotlightPrice = document.querySelector("[data-plot-spotlight-price]");
const STORAGE_KEY = "estate4mission-admin-password";
const IMPRESSION_REFRESH_MS = 5200;
let properties = [];
let activeFilter = "all";

const getFallbackProperties = () =>
  Array.isArray(window.ESTATE4MISSION_FALLBACK_PROPERTIES)
    ? window.ESTATE4MISSION_FALLBACK_PROPERTIES.map((property) => ({ ...property }))
    : [];

body.classList.add("loading");

window.addEventListener("load", () => {
  setTimeout(() => {
    loader.classList.add("hidden");
    body.classList.remove("loading");
  }, 450);
});

if (year) {
  year.textContent = new Date().getFullYear();
}

const setHeaderState = () => {
  const shouldCompact = window.scrollY > 40;
  header.classList.toggle("scrolled", shouldCompact);
  scrollTopButton.classList.toggle("visible", window.scrollY > 720);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  navToggle.classList.toggle("active", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    navToggle.classList.remove("active");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

scrollTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const initialiseImpressionSlider = () => {
  if (!impressionSlider) {
    return;
  }

  const slides = [...impressionSlider.querySelectorAll(".impression-slide")];
  const dotsContainer = impressionSlider.querySelector("[data-impression-dots]");
  const previousButton = impressionSlider.querySelector("[data-impression-prev]");
  const nextButton = impressionSlider.querySelector("[data-impression-next]");
  let activeIndex = 0;
  let timer = null;

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === activeIndex);
    });

    dotsContainer.querySelectorAll("button").forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === activeIndex);
      dot.setAttribute("aria-current", dotIndex === activeIndex ? "true" : "false");
    });
  };

  const startTimer = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => showSlide(activeIndex + 1), IMPRESSION_REFRESH_MS);
  };

  dotsContainer.innerHTML = slides
    .map((_, index) => `<button type="button" aria-label="Show impression ${index + 1}"></button>`)
    .join("");

  dotsContainer.querySelectorAll("button").forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
      startTimer();
    });
  });

  previousButton.addEventListener("click", () => {
    showSlide(activeIndex - 1);
    startTimer();
  });

  nextButton.addEventListener("click", () => {
    showSlide(activeIndex + 1);
    startTimer();
  });

  impressionSlider.addEventListener("mouseenter", () => window.clearInterval(timer));
  impressionSlider.addEventListener("mouseleave", startTimer);
  showSlide(0);
  startTimer();
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
};

const loadProperties = async () => {
  try {
    const payload = await requestJson("/api/properties");
    properties = payload.properties || [];
  } catch {
    try {
      const payload = await requestJson("assets/properties.json");
      properties = Array.isArray(payload) ? payload : payload.properties || [];
    } catch {
      properties = getFallbackProperties();
    }
  }
};

const saveProperties = async (propertyData) => {
  const password = sessionStorage.getItem(STORAGE_KEY);
  const payload = await requestJson("/api/admin/properties", {
    method: "POST",
    body: JSON.stringify({ password, properties: propertyData }),
  });

  properties = payload.properties || [];
};

const getPlotCards = () => [...document.querySelectorAll(".plot-card[data-property-id]")];

const clampNumber = (value, min, max) => {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
};

const formatPlotLabel = (count) => `${count} ${count === 1 ? "plot" : "plots"}`;

const parseSoldPlotNumbers = (value, totalPlots) => {
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

const getIndicativeSoldSet = (totalPlots, soldPlots, visiblePlots, seed = "") => {
  const soldVisiblePlots = Math.min(soldPlots, visiblePlots);
  const rankedPlots = Array.from({ length: visiblePlots }, (_, index) => index + 1)
    .map((plotNumber) => {
      const score = [...`${seed}-${plotNumber}`].reduce(
        (total, character) => (total * 31 + character.charCodeAt(0)) % 9973,
        17
      );

      return { plotNumber, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, soldVisiblePlots);

  return new Set(rankedPlots.map((item) => item.plotNumber));
};

const renderPlotMiniMap = (property) => {
  const totalPlots = Number(property.totalPlots) || 0;
  const soldPlotNumbers = parseSoldPlotNumbers(property.soldPlotNumbers, totalPlots);
  const soldPlots = soldPlotNumbers.length || clampNumber(property.soldPlots || 0, 0, totalPlots);
  const visiblePlots = Math.min(totalPlots, 60);
  const hasExactSoldNumbers = soldPlotNumbers.length > 0;
  const soldSet = hasExactSoldNumbers
    ? new Set(soldPlotNumbers)
    : getIndicativeSoldSet(totalPlots, soldPlots, visiblePlots, property.id || property.title);
  const cells = [];

  for (let index = 1; index <= visiblePlots; index += 1) {
    const isSold = soldSet.has(index);
    const label = hasExactSoldNumbers
      ? `Plot ${index}: ${isSold ? "Sold" : "Available"}`
      : `${isSold ? "Sold/reserved" : "Available"} indication`;
    const cellText = hasExactSoldNumbers ? index : "";
    cells.push(`<span class="${isSold ? "sold" : "available"}" title="${label}">${cellText}</span>`);
  }

  if (totalPlots > visiblePlots) {
    cells.push(`<span class="more">+${totalPlots - visiblePlots}</span>`);
  }

  return `
    <div class="plot-availability-map" aria-label="${escapeHtml(property.title)} plot availability">
      <div class="plot-map-head">
        <span>${hasExactSoldNumbers ? "Plot overview" : "Availability indication"}</span>
        <strong>${formatPlotLabel(totalPlots - soldPlots)} available</strong>
      </div>
      <div class="plot-map-grid">${cells.join("")}</div>
      <div class="plot-map-legend">
        <span><i class="available"></i>Available</span>
        <span><i class="sold"></i>${hasExactSoldNumbers ? "Sold" : "Sold/reserved"}</span>
      </div>
      ${hasExactSoldNumbers ? "" : '<p class="plot-map-note">Indicative mix only. Exact plot numbers are confirmed by the sales team.</p>'}
    </div>
  `;
};

const updateAvailabilityDisplays = () => {
  getPlotCards().forEach((card) => {
    const totalPlots = Number(card.dataset.totalPlots);
    const soldPlots = clampNumber(card.dataset.soldPlots ?? 0, 0, totalPlots);
    const availablePlots = totalPlots - soldPlots;
    const soldPercentage = totalPlots > 0 ? Math.round((soldPlots / totalPlots) * 100) : 0;

    card.dataset.soldPlots = String(soldPlots);
    card.querySelector("[data-availability-label]").textContent = `${soldPlots} of ${totalPlots} plots sold`;
    card.querySelector("[data-availability-bar]").style.width = `${soldPercentage}%`;
    card.querySelector("[data-availability-remaining]").textContent = `${formatPlotLabel(availablePlots)} available`;
  });
};

const renderPropertiesError = () => {
  propertyGrid.innerHTML = `
    <article class="property-card plot-card reveal visible">
      <div class="property-content">
        <p class="listing-kicker">Unavailable</p>
        <h3>Current plots could not be loaded.</h3>
        <p class="location">Please refresh the page or contact Estate4Mission directly.</p>
      </div>
    </article>
  `;
};

const formatArticleDate = (value) => {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getStatusLabel = (status) => {
  if (status === "reserved") {
    return "Reserved";
  }

  if (status === "sold") {
    return "Sold";
  }

  return "Available";
};

const renderPropertyCards = () => {
  if (!properties.length) {
    propertyGrid.innerHTML = `
      <article class="property-card plot-card reveal visible">
        <div class="property-content">
          <p class="listing-kicker">No plots listed</p>
          <h3>No current plots are published.</h3>
          <p class="location">Please contact Estate4Mission directly for current availability.</p>
        </div>
      </article>
    `;
    propertyCards = [];
    return;
  }

  propertyGrid.innerHTML = properties
    .map((property) => {
      const soldPlotNumbers = parseSoldPlotNumbers(property.soldPlotNumbers, property.totalPlots);
      const soldPlots = soldPlotNumbers.length || clampNumber(property.soldPlots, 0, property.totalPlots);
      const meta = (property.meta || [])
        .map((item) => `<span>${escapeHtml(item)}</span>`)
        .join("");

      return `
        <article
          class="property-card plot-card reveal visible"
          data-status="${escapeHtml(property.status)}"
          data-category="${escapeHtml(property.category || "plots")}"
          data-property-id="${escapeHtml(property.id)}"
          data-total-plots="${Number(property.totalPlots) || 0}"
          data-sold-plots="${soldPlots}"
          data-detail-url="plot.html?id=${encodeURIComponent(property.id)}"
          tabindex="0"
        >
          <div class="property-image advert-image">
            <img src="${escapeHtml(property.image)}" alt="${escapeHtml(property.imageAlt || `${property.title} advert`)}" />
            <span class="badge ${escapeHtml(property.status)}">${escapeHtml(getStatusLabel(property.status))}</span>
          </div>
          <div class="property-content">
            <p class="listing-kicker">${escapeHtml(property.kicker)}</p>
            <h3>${escapeHtml(property.title)}</h3>
            <p class="location">${escapeHtml(property.location)}</p>
            <div class="property-meta">${meta}</div>
            <strong class="price">${escapeHtml(property.price)}</strong>
            <div class="availability" data-availability>
              <div class="availability-top">
                <span>Availability</span>
                <strong data-availability-label>${soldPlots} of ${Number(property.totalPlots) || 0} plots sold</strong>
              </div>
              <div class="availability-track" aria-hidden="true">
                <span data-availability-bar></span>
              </div>
              <p data-availability-remaining></p>
            </div>
            ${renderPlotMiniMap({ ...property, soldPlots })}
            <div class="card-actions">
              <a href="plot.html?id=${encodeURIComponent(property.id)}" class="btn btn-small btn-primary">View Details</a>
              <a href="https://wa.me/2207735574?text=${encodeURIComponent(`Hello Estate4Mission, I would like to buy or reserve a plot in ${property.title}.`)}" class="btn btn-small btn-gold" target="_blank" rel="noopener noreferrer">Buy It Now</a>
              <button
                class="btn btn-small btn-outline advert-trigger"
                type="button"
                data-image="${escapeHtml(property.image)}"
                data-title="${escapeHtml(property.title)}"
              >
                ${escapeHtml(property.advertButtonLabel || "View Advert")}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  propertyCards = [...document.querySelectorAll(".property-card")];
  updatePlotSpotlight();
  updateAvailabilityDisplays();
  bindPropertyInteractions();
  applyPropertyFilter(activeFilter);
};

const updatePlotSpotlight = () => {
  if (!plotSpotlightCard || !properties.length) {
    return;
  }

  const featuredProperty =
    properties.find((property) => property.status === "available") || properties[0];

  const detailUrl = `plot.html?id=${encodeURIComponent(featuredProperty.id)}`;

  plotSpotlightCard.href = detailUrl;
  plotSpotlightImage.src = featuredProperty.image;
  plotSpotlightImage.alt = featuredProperty.imageAlt || `${featuredProperty.title} advert`;
  plotSpotlightStatus.textContent = getStatusLabel(featuredProperty.status);
  plotSpotlightStatus.className = featuredProperty.status || "available";
  plotSpotlightKicker.textContent = featuredProperty.kicker || "Featured plot release";
  plotSpotlightTitle.textContent = featuredProperty.title || "Current Estate4Mission plots";
  plotSpotlightLocation.textContent = featuredProperty.location || "The Gambia";
  plotSpotlightPrice.textContent = featuredProperty.price || "View opportunity";
};

const applyPropertyFilter = (selectedFilter) => {
  activeFilter = selectedFilter;

  propertyCards.forEach((card) => {
    const isVisible =
      selectedFilter === "all" ||
      card.dataset.status === selectedFilter ||
      card.dataset.category === selectedFilter;
    card.classList.toggle("hide", !isVisible);
  });

  propertyGrid.classList.toggle("filtered", selectedFilter !== "all");
};

function bindPropertyInteractions() {
  document.querySelectorAll(".advert-trigger").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const image = button.dataset.image;
      const title = button.dataset.title;

      advertModalImage.src = image;
      advertModalImage.alt = `${title} advert`;
      advertModalTitle.textContent = title;
      advertModal.classList.add("open");
      advertModal.setAttribute("aria-hidden", "false");
      advertModalClose.focus();
    });
  });

  getPlotCards().forEach((card) => {
    const detailUrl = card.dataset.detailUrl;

    if (!detailUrl) {
      return;
    }

    card.setAttribute("role", "link");
    card.setAttribute("aria-label", `View details for ${card.querySelector("h3")?.textContent || "plot"}`);

    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) {
        return;
      }

      window.location.href = detailUrl;
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        window.location.href = detailUrl;
      }
    });
  });
}

const initialiseProperties = async () => {
  await loadProperties();

  if (!properties.length) {
    renderPropertiesError();
    return;
  }

  renderPropertyCards();
};

const createNewProperty = () => {
  const nextNumber = properties.length + 1;

  return {
    id: `new-plot-${Date.now()}`,
    active: true,
    order: nextNumber,
    status: "available",
    category: "plots",
    kicker: "New plot release",
    title: `New Plot ${nextNumber}`,
    location: "The Gambia",
    price: "Price on request",
    image: "images/properties/pacholing-3-plot-plan.jpg",
    imageAlt: `New Plot ${nextNumber} advert`,
    advertButtonLabel: "View Advert",
    totalPlots: 1,
    soldPlots: 0,
    meta: ["Residential plots"],
    details: [["Location", "The Gambia"]],
    investmentTitle: `New Plot ${nextNumber} investment opportunity.`,
    description: "A verified plot opportunity managed by Estate4Mission.",
    highlights: ["Verified opportunity", "Local support"],
    whatsappText: `Hello Estate4Mission, I would like more information about New Plot ${nextNumber}.`,
  };
};

const listToTextarea = (items = []) => items.join("\n");
const pairsToTextarea = (items = []) => items.map(([label, value]) => `${label}: ${value}`).join("\n");
const textareaToList = (value = "") =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const textareaToPairs = (value = "") =>
  value
    .split("\n")
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return [label?.trim(), rest.join(":").trim()];
    })
    .filter(([label, detail]) => label && detail);

const isValidLatLng = ([lat, lng]) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const normaliseCoordinate = (value, decimals = 8) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(decimals)) : "";
};

const getDefaultUtmZone = (lng = -16) => Math.min(Math.max(Math.floor((Number(lng) + 180) / 6) + 1, 1), 60);

const utmToLatLng = ({ easting, northing, zone, hemisphere = "N" }) => {
  const a = 6378137;
  const e = 0.08181919084262149;
  const e1sq = 0.006739496742276434;
  const k0 = 0.9996;
  const x = Number(easting) - 500000;
  let y = Number(northing);
  const zoneNumber = Number(zone);

  if (![x, y, zoneNumber].every(Number.isFinite) || zoneNumber < 1 || zoneNumber > 60) {
    return null;
  }

  if (hemisphere === "S") {
    y -= 10000000;
  }

  const longOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const m = y / k0;
  const mu = m / (a * (1 - e ** 2 / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256));
  const e1 = (1 - Math.sqrt(1 - e ** 2)) / (1 + Math.sqrt(1 - e ** 2));
  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
  const sinfp = Math.sin(fp);
  const cosfp = Math.cos(fp);
  const tanfp = Math.tan(fp);
  const c1 = e1sq * cosfp ** 2;
  const t1 = tanfp ** 2;
  const r1 = (a * (1 - e ** 2)) / (1 - e ** 2 * sinfp ** 2) ** 1.5;
  const n1 = a / Math.sqrt(1 - e ** 2 * sinfp ** 2);
  const d = x / (n1 * k0);

  const lat =
    fp -
    ((n1 * tanfp) / r1) *
      (d ** 2 / 2 - ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e1sq) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * e1sq - 3 * c1 ** 2) * d ** 6) / 720);
  const lng =
    (d - ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e1sq + 24 * t1 ** 2) * d ** 5) / 120) /
      cosfp +
    (longOrigin * Math.PI) / 180;

  const point = [(lat * 180) / Math.PI, (lng * 180) / Math.PI];
  return isValidLatLng(point) ? point : null;
};

const renderCoordinateRows = (coordinates = [], minimumRows = 3) => {
  const rows =
    coordinates.length >= minimumRows ? coordinates : [...coordinates, ...Array.from({ length: minimumRows - coordinates.length }, () => ["", ""])];

  return rows
    .map(([lat, lng], pointIndex) => {
      const zone = Number.isFinite(Number(lng)) ? getDefaultUtmZone(lng) : 28;

      return `
        <div class="admin-coordinate-row" data-coordinate-row>
          <span class="admin-coordinate-number">${pointIndex + 1}</span>
          <label>
            Latitude
            <input type="number" step="any" name="polygonLat" value="${escapeHtml(normaliseCoordinate(lat))}" placeholder="13.281234" />
          </label>
          <label>
            Longitude
            <input type="number" step="any" name="polygonLng" value="${escapeHtml(normaliseCoordinate(lng))}" placeholder="-16.728456" />
          </label>
          <label>
            UTM zone
            <input type="number" min="1" max="60" name="utmZone" value="${zone}" />
          </label>
          <label>
            Easting
            <input type="number" step="any" name="utmEasting" placeholder="527000" />
          </label>
          <label>
            Northing
            <input type="number" step="any" name="utmNorthing" placeholder="1469000" />
          </label>
          <label>
            Hem.
            <select name="utmHemisphere">
              <option value="N" selected>N</option>
              <option value="S">S</option>
            </select>
          </label>
          <button class="admin-coordinate-convert" type="button">Use UTM</button>
          <button class="admin-coordinate-remove" type="button" aria-label="Remove coordinate point">Remove</button>
        </div>
      `;
    })
    .join("");
};

const collectCoordinateRows = (row) =>
  [...row.querySelectorAll("[data-coordinate-row]")]
    .map((coordinateRow) => {
      const lat = Number(coordinateRow.querySelector('[name="polygonLat"]').value);
      const lng = Number(coordinateRow.querySelector('[name="polygonLng"]').value);

      if (isValidLatLng([lat, lng])) {
        return [normaliseCoordinate(lat), normaliseCoordinate(lng)];
      }

      const converted = utmToLatLng({
        easting: coordinateRow.querySelector('[name="utmEasting"]').value,
        northing: coordinateRow.querySelector('[name="utmNorthing"]').value,
        zone: coordinateRow.querySelector('[name="utmZone"]').value,
        hemisphere: coordinateRow.querySelector('[name="utmHemisphere"]').value,
      });

      return converted ? converted.map((value) => normaliseCoordinate(value)) : null;
    })
    .filter(Boolean);

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const renderAdminRows = () => {
  adminRows.innerHTML = "";

  properties.forEach((property, index) => {
    const totalPlots = Number(property.totalPlots) || 0;
    const soldPlotNumbers = parseSoldPlotNumbers(property.soldPlotNumbers, totalPlots);
    const soldSet = new Set(soldPlotNumbers);
    const plotButtons = Array.from({ length: totalPlots }, (_, plotIndex) => {
      const plotNumber = plotIndex + 1;
      const isSold = soldSet.has(plotNumber);

      return `
        <label class="admin-plot-toggle ${isSold ? "checked" : ""}">
          <input type="checkbox" value="${plotNumber}" ${isSold ? "checked" : ""} />
          <span>${plotNumber}</span>
        </label>
      `;
    }).join("");

    const row = document.createElement("div");
    row.className = "admin-property-row";
    row.dataset.index = String(index);
    row.innerHTML = `
      <div class="admin-property-head">
        <div class="admin-row-title">
          <strong>${escapeHtml(property.title)}</strong>
          <span>${escapeHtml(property.location)}</span>
        </div>
        <button class="admin-remove" type="button">Remove</button>
      </div>
      <div class="admin-map-summary">
        <strong>Location map</strong>
        <span>Automatic Google Maps preview is active for this plot.</span>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location}, The Gambia`)}" target="_blank" rel="noopener">Open automatic map</a>
      </div>
      <div class="admin-field-grid">
        <label>
          Published
          <select name="active">
            <option value="true"${property.active ? " selected" : ""}>Show on website</option>
            <option value="false"${!property.active ? " selected" : ""}>Hide from website</option>
          </select>
        </label>
        <label>
          Order
          <input type="number" name="order" value="${Number(property.order) || index + 1}" min="1" />
        </label>
        <label>
          Status
          <select name="status">
            <option value="available"${property.status === "available" ? " selected" : ""}>Available</option>
            <option value="reserved"${property.status === "reserved" ? " selected" : ""}>Reserved</option>
            <option value="sold"${property.status === "sold" ? " selected" : ""}>Sold</option>
          </select>
        </label>
        <label>
          Title
          <input type="text" name="title" value="${escapeHtml(property.title)}" />
        </label>
        <label>
          Kicker
          <input type="text" name="kicker" value="${escapeHtml(property.kicker)}" />
        </label>
        <label>
          Location
          <input type="text" name="location" value="${escapeHtml(property.location)}" />
        </label>
        <label>
          Price
          <input type="text" name="price" value="${escapeHtml(property.price)}" />
        </label>
        <label>
          Total plots
          <input type="number" name="totalPlots" value="${Number(property.totalPlots) || 0}" min="0" />
        </label>
        <label>
          Sold plots
          <input type="number" name="soldPlots" value="${Number(property.soldPlots) || 0}" min="0" />
        </label>
      </div>
      <label class="admin-full-field">
        Sold plot numbers, separated by commas
        <input type="text" name="soldPlotNumbers" value="${escapeHtml((property.soldPlotNumbers || []).join(", "))}" placeholder="Example: 1, 4, 12" />
      </label>
      <div class="admin-plot-selector" data-plot-selector>
        <div class="admin-plot-selector-head">
          <strong>Tick sold/reserved plot numbers</strong>
          <span data-plot-selector-count>${soldPlotNumbers.length} selected</span>
        </div>
        <div class="admin-plot-toggle-grid">
          ${plotButtons || '<p class="admin-plot-empty">Set total plots first, then save and reopen admin.</p>'}
        </div>
      </div>
      <label class="admin-full-field">
        Card chips, one per line
        <textarea name="meta" rows="3">${escapeHtml(listToTextarea(property.meta))}</textarea>
      </label>
      <label class="admin-full-field">
        Detail information, use Label: Value
        <textarea name="details" rows="5">${escapeHtml(pairsToTextarea(property.details))}</textarea>
      </label>
      <label class="admin-full-field">
        Investment heading
        <input type="text" name="investmentTitle" value="${escapeHtml(property.investmentTitle)}" />
      </label>
      <label class="admin-full-field">
        Description
        <textarea name="description" rows="4">${escapeHtml(property.description)}</textarea>
      </label>
      <label class="admin-full-field">
        Highlights, one per line
        <textarea name="highlights" rows="4">${escapeHtml(listToTextarea(property.highlights))}</textarea>
      </label>
      <label class="admin-full-field">
        WhatsApp message
        <textarea name="whatsappText" rows="3">${escapeHtml(property.whatsappText)}</textarea>
      </label>
      <label class="admin-full-field">
        Google Maps embed URL
        <input type="url" name="mapEmbedUrl" value="${escapeHtml(property.mapEmbedUrl || "")}" placeholder="Paste Google My Maps or Maps embed URL" />
      </label>
      <label class="admin-full-field">
        Google Maps link
        <input type="url" name="mapLinkUrl" value="${escapeHtml(property.mapLinkUrl || "")}" placeholder="Paste public Google Maps link" />
      </label>
      <label class="admin-full-field">
        Map note
        <textarea name="mapNote" rows="2" placeholder="Example: Approximate project boundary. Exact plot coordinates available on request.">${escapeHtml(property.mapNote || "")}</textarea>
      </label>
      <div class="admin-coordinate-editor" data-coordinate-editor>
        <div class="admin-coordinate-head">
          <div>
            <strong>Polygon coordinates</strong>
            <span>Fill GPS latitude/longitude or enter UTM and convert per point.</span>
          </div>
          <button class="admin-coordinate-add" type="button">Add point</button>
        </div>
        <div class="admin-coordinate-rows" data-coordinate-rows>
          ${renderCoordinateRows(property.polygonCoordinates || [])}
        </div>
        <small class="admin-field-help">Use at least 3 points in order; the last point connects automatically to the first. For The Gambia, UTM zone 28N is usually correct.</small>
      </div>
      <div class="admin-image-tools">
        <img src="${escapeHtml(property.image)}" alt="" />
        <label>
          Advert photo
          <input type="file" name="imageFile" accept="image/png,image/jpeg,image/webp,image/avif" />
          <input type="hidden" name="image" value="${escapeHtml(property.image)}" />
        </label>
      </div>
    `;

    adminRows.appendChild(row);
  });

  adminRows.querySelectorAll(".admin-property-row").forEach((row) => {
    const soldInput = row.querySelector('[name="soldPlotNumbers"]');
    const soldCountInput = row.querySelector('[name="soldPlots"]');
    const totalInput = row.querySelector('[name="totalPlots"]');
    const countLabel = row.querySelector("[data-plot-selector-count]");
    const checkboxes = [...row.querySelectorAll(".admin-plot-toggle input")];

    const syncFromCheckboxes = () => {
      const selectedNumbers = checkboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => Number(checkbox.value))
        .sort((a, b) => a - b);

      soldInput.value = selectedNumbers.join(", ");
      soldCountInput.value = selectedNumbers.length;
      countLabel.textContent = `${selectedNumbers.length} selected`;

      checkboxes.forEach((checkbox) => {
        checkbox.closest(".admin-plot-toggle").classList.toggle("checked", checkbox.checked);
      });
    };

    const syncFromTextInput = () => {
      const selectedSet = new Set(parseSoldPlotNumbers(soldInput.value, Number(totalInput.value) || 0));

      checkboxes.forEach((checkbox) => {
        checkbox.checked = selectedSet.has(Number(checkbox.value));
      });

      syncFromCheckboxes();
    };

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", syncFromCheckboxes);
    });

    soldInput.addEventListener("input", syncFromTextInput);
  });

  adminRows.querySelectorAll("[data-coordinate-editor]").forEach((editor) => {
    const coordinateRows = editor.querySelector("[data-coordinate-rows]");

    const reindexRows = () => {
      [...coordinateRows.querySelectorAll("[data-coordinate-row]")].forEach((coordinateRow, pointIndex) => {
        coordinateRow.querySelector(".admin-coordinate-number").textContent = pointIndex + 1;
      });
    };

    const wireCoordinateRow = (coordinateRow) => {
      const latInput = coordinateRow.querySelector('[name="polygonLat"]');
      const lngInput = coordinateRow.querySelector('[name="polygonLng"]');
      const zoneInput = coordinateRow.querySelector('[name="utmZone"]');
      const eastingInput = coordinateRow.querySelector('[name="utmEasting"]');
      const northingInput = coordinateRow.querySelector('[name="utmNorthing"]');
      const hemisphereInput = coordinateRow.querySelector('[name="utmHemisphere"]');

      coordinateRow.querySelector(".admin-coordinate-convert").addEventListener("click", () => {
        const converted = utmToLatLng({
          easting: eastingInput.value,
          northing: northingInput.value,
          zone: zoneInput.value,
          hemisphere: hemisphereInput.value,
        });

        if (!converted) {
          coordinateRow.classList.add("invalid");
          return;
        }

        coordinateRow.classList.remove("invalid");
        latInput.value = normaliseCoordinate(converted[0]);
        lngInput.value = normaliseCoordinate(converted[1]);
      });

      coordinateRow.querySelector(".admin-coordinate-remove").addEventListener("click", () => {
        coordinateRow.remove();
        reindexRows();
      });
    };

    coordinateRows.querySelectorAll("[data-coordinate-row]").forEach(wireCoordinateRow);

    editor.querySelector(".admin-coordinate-add").addEventListener("click", () => {
      coordinateRows.insertAdjacentHTML("beforeend", renderCoordinateRows([["", ""]], 1));
      wireCoordinateRow(coordinateRows.lastElementChild);
      reindexRows();
    });
  });

  adminRows.querySelectorAll(".admin-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".admin-property-row");
      const index = Number(row.dataset.index);
      properties.splice(index, 1);
      renderAdminRows();
    });
  });
};

const collectAdminProperties = async () => {
  const rows = [...adminRows.querySelectorAll(".admin-property-row")];

  return Promise.all(
    rows.map(async (row, index) => {
      const getField = (name) => row.querySelector(`[name="${name}"]`);
      const totalPlots = clampNumber(getField("totalPlots").value, 0, 9999);
      const soldPlotNumbers = parseSoldPlotNumbers(getField("soldPlotNumbers").value, totalPlots);
      const soldPlots = soldPlotNumbers.length || clampNumber(getField("soldPlots").value, 0, totalPlots);
      const imageFile = getField("imageFile").files[0];
      const title = getField("title").value.trim() || `Plot ${index + 1}`;
      const image = imageFile ? await readFileAsDataUrl(imageFile) : getField("image").value;

      return {
        id: properties[index]?.id || title,
        active: getField("active").value === "true",
        order: clampNumber(getField("order").value, 1, 9999),
        status: getField("status").value,
        category: "plots",
        kicker: getField("kicker").value.trim(),
        title,
        location: getField("location").value.trim(),
        price: getField("price").value.trim(),
        image,
        imageAlt: `${title} advert`,
        advertButtonLabel: properties[index]?.advertButtonLabel || "View Advert",
        totalPlots,
        soldPlots,
        soldPlotNumbers,
        meta: textareaToList(getField("meta").value),
        details: textareaToPairs(getField("details").value),
        investmentTitle: getField("investmentTitle").value.trim(),
        description: getField("description").value.trim(),
        highlights: textareaToList(getField("highlights").value),
        whatsappText: getField("whatsappText").value.trim(),
        mapEmbedUrl: getField("mapEmbedUrl").value.trim(),
        mapLinkUrl: getField("mapLinkUrl").value.trim(),
        mapNote: getField("mapNote").value.trim(),
        polygonCoordinates: collectCoordinateRows(row),
      };
    })
  );
};

initialiseImpressionSlider();
initialiseProperties();

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });

    applyPropertyFilter(selectedFilter);
  });
});

const closeAdvertModal = () => {
  advertModal.classList.remove("open");
  advertModal.setAttribute("aria-hidden", "true");
  advertModalImage.src = "";
  advertModalImage.alt = "";
};

advertModalClose.addEventListener("click", closeAdvertModal);
advertModalBackdrop.addEventListener("click", closeAdvertModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && advertModal.classList.contains("open")) {
    closeAdvertModal();
  }

  if (event.key === "Escape" && adminModal.classList.contains("open")) {
    closeAdminModal();
  }
});

const openAdminModal = () => {
  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden", "false");
  adminLoginMessage.textContent = "";
  adminEditorMessage.textContent = "";

  if (sessionStorage.getItem(STORAGE_KEY)) {
    adminLogin.hidden = true;
    adminEditor.hidden = false;
    renderAdminRows();
    loadAdminLeads();
  } else {
    adminLogin.hidden = false;
    adminEditor.hidden = true;
    adminLogin.querySelector("input").focus();
  }
};

const leadStatusLabels = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  won: "Won",
  closed: "Closed",
};

const renderAdminLeads = (leads) => {
  if (!adminLeads) return;
  adminLeads.innerHTML = leads.length ? leads.map((lead) => `
    <article class="admin-lead-card">
      <div>
        <strong>${escapeHtml(lead.name)} · ${escapeHtml(lead.propertyTitle)}</strong>
        <span>${escapeHtml(lead.action)} · ${escapeHtml(new Date(lead.createdAt).toLocaleString())}</span>
        <span>${escapeHtml(lead.phone || lead.email)}${lead.message ? ` · ${escapeHtml(lead.message)}` : ""}</span>
      </div>
      <select data-lead-status data-lead-id="${escapeHtml(lead.id)}" aria-label="Lead status">
        ${Object.entries(leadStatusLabels).map(([value, label]) => `<option value="${value}"${lead.status === value ? " selected" : ""}>${label}</option>`).join("")}
      </select>
    </article>
  `).join("") : "<p>No website enquiries yet.</p>";

  adminLeads.querySelectorAll("[data-lead-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      try {
        await requestJson("/api/admin/leads/update", {
          method: "POST",
          body: JSON.stringify({
            password: sessionStorage.getItem(STORAGE_KEY),
            id: select.dataset.leadId,
            status: select.value,
          }),
        });
      } catch {
        adminEditorMessage.textContent = "Could not update lead status.";
      }
    });
  });
};

const loadAdminLeads = async () => {
  if (!adminLeads) return;
  adminLeads.innerHTML = "<p>Loading enquiries...</p>";
  try {
    const payload = await requestJson("/api/admin/leads", {
      method: "POST",
      body: JSON.stringify({ password: sessionStorage.getItem(STORAGE_KEY) }),
    });
    renderAdminLeads(payload.leads || []);
  } catch {
    adminLeads.innerHTML = "<p>Could not load enquiries.</p>";
  }
};

adminLeadsRefresh?.addEventListener("click", loadAdminLeads);

function closeAdminModal() {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
}

adminOpen.addEventListener("click", openAdminModal);
adminClose.addEventListener("click", closeAdminModal);
adminModalBackdrop.addEventListener("click", closeAdminModal);

if (window.location.hash === "#admin") {
  window.setTimeout(openAdminModal, 250);
}

adminLogin.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = new FormData(adminLogin).get("password");

  adminLoginMessage.textContent = "";

  requestJson("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  })
    .then(() => {
      sessionStorage.setItem(STORAGE_KEY, password);
      adminLogin.reset();
      adminLogin.hidden = true;
      adminEditor.hidden = false;
      renderAdminRows();
      loadAdminLeads();
    })
    .catch(() => {
      adminLoginMessage.textContent = "Incorrect password.";
    });
});

adminEditor.addEventListener("submit", async (event) => {
  event.preventDefault();

  adminEditorMessage.textContent = "Saving...";

  try {
    const propertyData = await collectAdminProperties();
    await saveProperties(propertyData);
    renderPropertyCards();
    renderAdminRows();
    adminEditorMessage.textContent = "Plots saved for all visitors.";
  } catch {
    adminEditorMessage.textContent = "Could not save. Please check the fields or log in again.";
    sessionStorage.removeItem(STORAGE_KEY);
    adminLogin.hidden = false;
    adminEditor.hidden = true;
  }
});

adminAdd.addEventListener("click", () => {
  properties.push(createNewProperty());
  renderAdminRows();
  adminEditorMessage.textContent = "New plot added. Fill in the details and save changes.";
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -60px 0px",
  }
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});
