const body = document.body;
const loader = document.querySelector(".loader");
const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const scrollTopButton = document.querySelector(".scroll-top");
const year = document.querySelector("#year");
const params = new URLSearchParams(window.location.search);
const plotId = params.get("id");
let plot = null;
const leadModal = document.querySelector("[data-lead-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadMessage = document.querySelector("[data-lead-message]");
const leadSummary = document.querySelector("[data-lead-plot-summary]");
let pendingLeadAction = "whatsapp";

const getFallbackProperties = () =>
  Array.isArray(window.ESTATE4MISSION_FALLBACK_PROPERTIES)
    ? window.ESTATE4MISSION_FALLBACK_PROPERTIES.map((property) => ({ ...property }))
    : [];

body.classList.add("loading");

window.addEventListener("load", () => {
  setTimeout(() => {
    loader.classList.add("hidden");
    body.classList.remove("loading");
  }, 350);
});

if (year) {
  year.textContent = new Date().getFullYear();
}

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

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const setText = (selector, text) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text || "";
  }
};

const isSafeGoogleMapUrl = (value = "") => {
  try {
    const url = new URL(String(value || "").trim());
    return (
      url.protocol === "https:" &&
      ["www.google.com", "google.com", "maps.google.com", "www.google.nl", "maps.app.goo.gl"].includes(url.hostname)
    );
  } catch {
    return false;
  }
};

const getAutomaticMapUrl = (plot) => {
  const query = [plot.title, plot.location, "The Gambia"].filter(Boolean).join(", ");
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
};

const getValidPolygonCoordinates = (coordinates = []) =>
  (Array.isArray(coordinates) ? coordinates : [])
    .map((point) => [Number(point?.[0]), Number(point?.[1])])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);

const renderPolygonMap = (mapFrame, coordinates) => {
  if (!window.L) {
    mapFrame.innerHTML = `
      <div>
        <span>Boundary map unavailable</span>
        <strong>The map library could not be loaded.</strong>
      </div>
    `;
    return;
  }

  const mapId = `plot-boundary-map-${plot.id || "detail"}`;
  mapFrame.innerHTML = `<div class="plot-boundary-map" id="${escapeHtml(mapId)}" aria-label="${escapeHtml(plot.title)} boundary map"></div>`;

  const mapElement = document.getElementById(mapId);
  if (!mapElement) {
    return;
  }

  const map = window.L.map(mapElement, {
    scrollWheelZoom: false,
    tap: true,
  });

  map.attributionControl.setPrefix("");

  window.L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
    maxZoom: 19,
      attribution:
        "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    }
  ).addTo(map);

  const polygon = window.L.polygon(coordinates, {
    color: "#ffffff",
    fillColor: "#c9a14a",
    fillOpacity: 0.32,
    lineJoin: "round",
    opacity: 1,
    weight: 6,
  })
    .addTo(map)
    .bindPopup(escapeHtml(plot.title));

  window.L.polygon(coordinates, {
    color: "#4b176d",
    fill: false,
    lineJoin: "round",
    opacity: 1,
    weight: 3,
  }).addTo(map);

  map.fitBounds(polygon.getBounds(), {
    animate: false,
    padding: [28, 28],
  });

  setTimeout(() => map.invalidateSize(), 50);
};

const renderPlotMiniMap = () => {
  const totalPlots = Number(plot.totalPlots) || 0;
  const soldPlotNumbers = parseSoldPlotNumbers(plot.soldPlotNumbers, totalPlots);
  const soldPlots = soldPlotNumbers.length || clampNumber(plot.soldPlots || 0, 0, totalPlots);
  const visiblePlots = Math.min(totalPlots, 80);
  const hasExactSoldNumbers = soldPlotNumbers.length > 0;
  const soldSet = hasExactSoldNumbers
    ? new Set(soldPlotNumbers)
    : getIndicativeSoldSet(totalPlots, soldPlots, visiblePlots, plot.id || plot.title);
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
    <div class="plot-availability-map detail-map" aria-label="${escapeHtml(plot.title)} plot availability">
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

const renderMissingPlot = () => {
  setText("[data-plot-kicker]", "Plot unavailable");
  setText("[data-plot-title]", "This plot is not currently published.");
  setText("[data-plot-location]", "Please return to current properties.");
  setText("[data-availability-heading]", "No availability shown");
  setText("[data-availability-label]", "Unavailable");
  setText("[data-availability-remaining]", "This listing may have been removed by the admin.");

  const image = document.querySelector("[data-plot-image]");
  if (image) {
    image.src = "images/logo.png";
    image.alt = "Estate4Mission";
  }

  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = "https://wa.me/2207735574";
  });
};

const renderPlot = () => {
  document.title = `${plot.title} | Estate4Mission`;
  setText("[data-plot-kicker]", plot.kicker);
  setText("[data-plot-title]", plot.title);
  setText("[data-plot-location]", plot.location);
  setText("[data-plot-price]", plot.price);
  setText("[data-plot-investment-title]", plot.investmentTitle);
  setText("[data-plot-description]", plot.description);

  const image = document.querySelector("[data-plot-image]");
  if (image) {
    image.src = plot.image;
    image.alt = plot.imageAlt || `${plot.title} advert`;
  }

  const statusBadge = document.querySelector(".plot-hero-card .badge");
  if (statusBadge) {
    statusBadge.textContent = getStatusLabel(plot.status);
    statusBadge.className = `badge ${plot.status || "available"}`;
  }

  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = "#lead";
    link.dataset.leadAction = "whatsapp";
  });

  document.querySelectorAll("[data-buy-link]").forEach((link) => {
    link.href = "#lead";
    link.dataset.leadAction = "buy";
  });

  renderLocationMap();

  const detailList = document.querySelector("[data-plot-details]");
  if (detailList) {
    detailList.innerHTML = (plot.details || [])
      .map(
        ([label, value]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `
      )
      .join("");
  }

  const highlights = document.querySelector("[data-plot-highlights]");
  if (highlights) {
    highlights.innerHTML = (plot.highlights || [])
      .map(
        (highlight) => `
          <div>
            <span></span>
            <strong>${escapeHtml(highlight)}</strong>
          </div>
        `
      )
      .join("");
  }

  const map = document.querySelector("[data-detail-plot-map]");
  if (map) {
    map.innerHTML = renderPlotMiniMap();
  }

  updateAvailability();
};

const renderLocationMap = () => {
  const mapFrame = document.querySelector("[data-plot-map-frame]");
  const mapLink = document.querySelector("[data-plot-map-link]");
  const mapNote = document.querySelector("[data-plot-map-note]");
  const embedUrl = plot.mapEmbedUrl || getAutomaticMapUrl(plot);
  const linkUrl = plot.mapLinkUrl || embedUrl.replace("&output=embed", "");
  const polygonCoordinates = getValidPolygonCoordinates(plot.polygonCoordinates);

  if (mapNote) {
    mapNote.textContent =
      plot.mapNote || "Map boundaries are indicative. Exact plot coordinates and title details are confirmed during due diligence.";
  }

  if (mapLink) {
    if (isSafeGoogleMapUrl(linkUrl)) {
      mapLink.href = linkUrl;
      mapLink.hidden = false;
    } else {
      mapLink.hidden = true;
    }
  }

  if (!mapFrame) {
    return;
  }

  if (polygonCoordinates.length >= 3) {
    renderPolygonMap(mapFrame, polygonCoordinates);
    return;
  }

  if (!isSafeGoogleMapUrl(embedUrl)) {
    mapFrame.innerHTML = `
      <div>
        <span>Map not added yet</span>
        <strong>Add a Google Maps embed URL in Admin.</strong>
      </div>
    `;
    return;
  }

  mapFrame.innerHTML = `
    <iframe
      src="${escapeHtml(embedUrl)}"
      title="${escapeHtml(plot.title)} location map"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen
    ></iframe>
  `;
};

const getStatusLabel = (status) => {
  if (status === "reserved") {
    return "Reserved";
  }

  if (status === "sold") {
    return "Sold";
  }

  return "Available";
};

const closeLeadModal = () => {
  leadModal?.classList.remove("open");
  leadModal?.setAttribute("aria-hidden", "true");
};

const openLeadModal = (action) => {
  if (!plot || !leadModal || !leadForm) return;
  pendingLeadAction = action;
  leadForm.reset();
  leadForm.elements.action.value = action;
  leadForm.elements.propertyId.value = plot.id;
  leadSummary.textContent = `${plot.title} - ${action === "buy" ? "buy or reserve" : "request current availability"}`;
  leadMessage.textContent = "";
  leadModal.classList.add("open");
  leadModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => leadForm.elements.name.focus(), 50);
};

document.querySelectorAll("[data-whatsapp-link], [data-buy-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openLeadModal(link.dataset.leadAction || (link.hasAttribute("data-buy-link") ? "buy" : "whatsapp"));
  });
});

document.querySelectorAll("[data-lead-close]").forEach((element) => element.addEventListener("click", closeLeadModal));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && leadModal?.classList.contains("open")) closeLeadModal();
});

const createWhatsAppUrl = (data) => {
  const intent = pendingLeadAction === "buy" ? "buy or reserve a plot" : "request current availability";
  const details = [
    `Hello Estate4Mission, I would like to ${intent} in ${plot.title}.`,
    `My name is ${data.name}.`,
    data.phone ? `Phone: ${data.phone}.` : "",
    data.email ? `Email: ${data.email}.` : "",
    data.message ? `Message: ${data.message}` : "",
  ].filter(Boolean).join(" ");
  return `https://wa.me/2207735574?text=${encodeURIComponent(details)}`;
};

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(leadForm).entries());
  data.consent = leadForm.elements.consent.checked;
  leadMessage.textContent = "Saving your request...";
  try {
    await requestJson("/api/leads", { method: "POST", body: JSON.stringify(data) });
    window.location.href = createWhatsAppUrl(data);
  } catch {
    leadMessage.textContent = "Could not save your request. Please try again.";
  }
});

const updateAvailability = () => {
  const soldPlotNumbers = parseSoldPlotNumbers(plot.soldPlotNumbers, plot.totalPlots);
  const soldPlots = soldPlotNumbers.length || clampNumber(plot.soldPlots || 0, 0, plot.totalPlots);
  const availablePlots = plot.totalPlots - soldPlots;
  const soldPercentage = plot.totalPlots > 0 ? Math.round((soldPlots / plot.totalPlots) * 100) : 0;

  setText("[data-availability-heading]", `${formatPlotLabel(availablePlots)} available`);
  setText("[data-availability-label]", `${soldPlots} of ${plot.totalPlots} plots sold`);
  setText("[data-availability-remaining]", `${formatPlotLabel(availablePlots)} available now`);

  const bar = document.querySelector("[data-availability-bar]");
  if (bar) {
    bar.style.width = `${soldPercentage}%`;
  }
};

const loadPlot = async () => {
  const fallbackPlots = getFallbackProperties();
  const fallbackPlot = fallbackPlots.find((item) => item.id === plotId);

  if (fallbackPlot) {
    plot = fallbackPlot;
    renderPlot();
  }

  try {
    const payload = await requestJson(`/api/properties?id=${encodeURIComponent(plotId || "")}`);
    plot = payload.property;
    renderPlot();
  } catch {
    if (fallbackPlot) {
      return;
    }

    renderMissingPlot();
  }
};

const setHeaderState = () => {
  header.classList.toggle("scrolled", true);
  scrollTopButton.classList.toggle("visible", window.scrollY > 520);
};

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

loadPlot();
setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});
