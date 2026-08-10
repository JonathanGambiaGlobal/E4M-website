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

const requestJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
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

  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = `https://wa.me/2207735574?text=${encodeURIComponent(plot.whatsappText)}`;
  });

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

  updateAvailability();
};

const updateAvailability = () => {
  const soldPlots = clampNumber(plot.soldPlots || 0, 0, plot.totalPlots);
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
  try {
    const payload = await requestJson(`/api/properties?id=${encodeURIComponent(plotId || "")}`);
    plot = payload.property;
    renderPlot();
  } catch {
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
