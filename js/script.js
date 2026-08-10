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
const adminAdd = document.querySelector(".admin-add");
const newsList = document.querySelector("[data-news-list]");
const impressionSlider = document.querySelector("[data-impression-slider]");
const STORAGE_KEY = "estate4mission-admin-password";
const NEWS_REFRESH_MS = 30 * 60 * 1000;
const IMPRESSION_REFRESH_MS = 5200;
let properties = [];
let activeFilter = "all";

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
    properties = [];
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
      const soldPlots = clampNumber(property.soldPlots, 0, property.totalPlots);
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
            <div class="card-actions">
              <a href="plot.html?id=${encodeURIComponent(property.id)}" class="btn btn-small btn-primary">View Details</a>
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
  updateAvailabilityDisplays();
  bindPropertyInteractions();
  applyPropertyFilter(activeFilter);
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
      const soldPlots = clampNumber(getField("soldPlots").value, 0, totalPlots);
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
        meta: textareaToList(getField("meta").value),
        details: textareaToPairs(getField("details").value),
        investmentTitle: getField("investmentTitle").value.trim(),
        description: getField("description").value.trim(),
        highlights: textareaToList(getField("highlights").value),
        whatsappText: getField("whatsappText").value.trim(),
      };
    })
  );
};

const renderNewsError = () => {
  newsList.innerHTML = `
    <article class="news-card">
      <span>Unavailable</span>
      <h3>Market updates are temporarily unavailable.</h3>
      <p>The external news feeds could not be loaded right now. Please try again later.</p>
    </article>
  `;
};

const renderNews = (articles) => {
  if (!articles.length) {
    renderNewsError();
    return;
  }

  newsList.innerHTML = articles
    .map(
      (article) => `
        <article class="news-card reveal visible">
          <span>${escapeHtml(article.topic || "Market")}</span>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary || "Read the original article for more context.")}</p>
          <div class="news-meta">${escapeHtml(article.source || "External source")} · ${escapeHtml(formatArticleDate(article.publishedAt))}</div>
          <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">Read full article</a>
        </article>
      `
    )
    .join("");
};

const loadNews = async ({ preserveExisting = false } = {}) => {
  if (!newsList) {
    return;
  }

  try {
    const payload = await requestJson("/api/news");
    renderNews(payload.articles || []);
  } catch {
    if (!preserveExisting || newsList.querySelector(".news-card-loading")) {
      renderNewsError();
    }
  }
};

initialiseImpressionSlider();
initialiseProperties();
loadNews();
setInterval(() => {
  loadNews({ preserveExisting: true });
}, NEWS_REFRESH_MS);

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
  } else {
    adminLogin.hidden = false;
    adminEditor.hidden = true;
    adminLogin.querySelector("input").focus();
  }
};

function closeAdminModal() {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
}

adminOpen.addEventListener("click", openAdminModal);
adminClose.addEventListener("click", closeAdminModal);
adminModalBackdrop.addEventListener("click", closeAdminModal);

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
