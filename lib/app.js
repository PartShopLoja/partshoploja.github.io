// ==========================================================================
// PARTSHOP APP ENGINE - CONTROLE DE ESTADO, FILTROS E PAGINAÇÃO
// ==========================================================================

// Versão de sincronização do catálogo padrão
const CATALOG_VERSION = "2026.11.08.2";

// Configurações de Paginação
const ITENS_POR_PAGINA = 8;
let itensExibidosCount = ITENS_POR_PAGINA;

// Estado da Aplicação
let products = [];
let currentCategory = "Todos";
let searchQuery = "";
let currentSort = "featured";
let currentViewMode = localStorage.getItem("partshop_view_mode") || "grid-2";

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  renderCategoryChips();
  applyFilters();
  updateViewModeButtons();
  initBackToTop();
  initKeyboardShortcuts();
  lucide.createIcons();
});

// Leitura com Sincronização Inteligente de Versão
function loadProducts() {
  const savedVersion = localStorage.getItem("partshop_catalog_version");
  const savedData = localStorage.getItem("partshop_custom_catalog");

  // Se o catálogo base foi atualizado no código (versão diferente) ou ainda não há dados salvos
  if (savedVersion !== CATALOG_VERSION || !savedData) {
    products = [...DEFAULT_PRODUCTS];
    localStorage.setItem("partshop_catalog_version", CATALOG_VERSION);
    localStorage.setItem("partshop_custom_catalog", JSON.stringify(DEFAULT_PRODUCTS));
    return;
  }

  try {
    const parsed = JSON.parse(savedData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      products = parsed;
    } else {
      products = [...DEFAULT_PRODUCTS];
    }
  } catch (e) {
    console.error("Erro no JSON local. Restaurando catálogo padrão.", e);
    products = [...DEFAULT_PRODUCTS];
  }
}

function persistProducts(newProducts) {
  products = newProducts;
  localStorage.setItem("partshop_custom_catalog", JSON.stringify(products));
  localStorage.setItem("partshop_catalog_version", CATALOG_VERSION);
  renderCategoryChips();
  applyFilters();
}

// Utilitário de escape para prevenir quebras de atributos HTML e injeção XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Conversor de texto de vendas para número (ex.: "1 milhão+" -> 1000000, "100mil+" -> 100000)
function parseSalesCount(sales) {
  if (!sales) return 0;
  const s = String(sales).toLowerCase().replace(/\s+/g, "");
  if (s.includes("milhão") || s.includes("milhao")) {
    const match = s.match(/([0-9]+(?:[\.,][0-9]+)?)/);
    const val = match ? parseFloat(match[1].replace(",", ".")) : 1;
    return val * 1000000;
  }
  if (s.includes("mil")) {
    const match = s.match(/([0-9]+(?:[\.,][0-9]+)?)/);
    const val = match ? parseFloat(match[1].replace(",", ".")) : 1;
    return val * 1000;
  }
  const digits = s.replace(/\D/g, "");
  return parseInt(digits, 10) || 0;
}

// Renderizar Categorias Dinâmicas (Apenas de produtos ativos)
function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  if (!container) return;

  const ativos = products.filter(p => p.ativo !== false);
  const categories = ["Todos", ...new Set(ativos.map(p => p.category))];

  container.innerHTML = categories.map(cat => {
    const isActive = cat === currentCategory;
    const activeClass = isActive 
      ? "bg-purple-600 text-white font-bold border-purple-500 shadow-md shadow-purple-900/30" 
      : "bg-brand-dark text-gray-400 hover:text-white border-brand-border hover:border-gray-600";

    const safeCat = escapeHtml(cat);

    return `
      <button 
        onclick="setCategory('${safeCat}')" 
        class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs whitespace-nowrap transition-all border ${activeClass} flex items-center gap-1 sm:gap-1.5 cursor-pointer"
      >
        ${cat === 'Todos' ? '<i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>' : ''}
        ${safeCat}
      </button>
    `;
  }).join("");

  lucide.createIcons();
}

function setCategory(cat) {
  currentCategory = cat;
  itensExibidosCount = ITENS_POR_PAGINA; // Reseta a paginação ao mudar categoria
  renderCategoryChips();
  applyFilters();
}

function handleSearch() {
  searchQuery = document.getElementById("searchInput").value.toLowerCase().trim();
  itensExibidosCount = ITENS_POR_PAGINA;
  applyFilters();
}

function handleSort() {
  currentSort = document.getElementById("sortSelect").value;
  applyFilters();
}

function resetFilters() {
  currentCategory = "Todos";
  searchQuery = "";
  currentSort = "featured";
  const sort = document.getElementById("sortSelect");
  if (sort) sort.value = "featured";
  const input = document.getElementById("searchInput");
  if (input) input.value = "";
  itensExibidosCount = ITENS_POR_PAGINA;
  renderCategoryChips();
  applyFilters();
}

// Filtro Central com Checagem Obrigatória de p.ativo !== false
function applyFilters() {
  let filtered = products.filter(p => {
    const isAtivo = p.ativo !== false;
    const matchesCategory = currentCategory === "Todos" || p.category === currentCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery) || 
                          p.category.toLowerCase().includes(searchQuery);
    return isAtivo && matchesCategory && matchesSearch;
  });

  // Ordenação
  if (currentSort === "sales" || currentSort === "relevance") {
    // Mais Vendidos: ordena pelo volume numérico real de vendas decrescente
    filtered.sort((a, b) => parseSalesCount(b.salesCount) - parseSalesCount(a.salesCount));
  } else if (currentSort === "price-asc") {
    filtered.sort((a, b) => a.referencePrice - b.referencePrice);
  } else if (currentSort === "price-desc") {
    filtered.sort((a, b) => b.referencePrice - a.referencePrice);
  } else if (currentSort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }
  // Se for "featured" (Destaques PartShop), mantém a ordem curada original (Natal no topo)

  renderProducts(filtered);
}

// Controle do Modo de Visualização (2 colunas padrão, 1 coluna feed, lista)
function setViewMode(mode) {
  currentViewMode = mode;
  localStorage.setItem("partshop_view_mode", mode);
  updateViewModeButtons();
  applyFilters();
}

function updateViewModeButtons() {
  const modes = ["grid-2", "grid-1", "list"];
  modes.forEach(m => {
    const btn = document.getElementById(`viewBtn-${m}`);
    if (!btn) return;
    if (m === currentViewMode) {
      btn.className = "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 bg-purple-600 text-white shadow-md shadow-purple-950/40";
    } else {
      btn.className = "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 text-gray-400 hover:text-white hover:bg-brand-hover";
    }
  });
}

// Renderização dos Cards e Controle do Botão "Carregar Mais"
function renderProducts(items) {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const title = document.getElementById("productsCountTitle");
  const badge = document.getElementById("activeFilterBadge");
  const loadMoreBox = document.getElementById("loadMoreContainer");
  const pageCounterText = document.getElementById("pageCounterText");

  if (!grid) return;

  // Aplica classe de layout no container de acordo com o modo ativo
  if (currentViewMode === "grid-1") {
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-xl sm:max-w-none mx-auto";
  } else if (currentViewMode === "list") {
    grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4";
  } else {
    // Padrão: 2 colunas no celular, 2 em tablet, 3 em desktop médio, 4 em telas grandes
    grid.className = "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5";
  }

  title.innerText = `${items.length} Oferta${items.length === 1 ? '' : 's'} Encontrada${items.length === 1 ? '' : 's'}`;

  if (currentCategory !== "Todos") {
    badge.innerText = currentCategory;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }

  if (items.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    loadMoreBox.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");

  // Fatiamento dos itens sob demanda (Paginação)
  const visiveis = items.slice(0, itensExibidosCount);

  grid.innerHTML = visiveis.map(p => {
    const badgeBg = p.badgeColor === 'gold' 
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

    const formattedPrice = Number(p.referencePrice || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });

    const safeTitle = escapeHtml(p.title);
    const safeCategory = escapeHtml(p.category);
    const safeBadge = escapeHtml(p.badge);
    const safeDiscount = escapeHtml(p.discountText);
    const safeSales = escapeHtml(p.salesCount);
    const safeImage = escapeHtml(p.image);
    const safeUrl = encodeURI(p.affiliateUrl || "#");

    // LAYOUT 1: LISTA HORIZONTAL COMPACTA
    if (currentViewMode === "list") {
      return `
        <article class="bg-brand-card rounded-xl sm:rounded-2xl border border-brand-border overflow-hidden hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 flex flex-row group p-2.5 sm:p-3.5 gap-3 sm:gap-4 items-stretch">
          <div class="relative w-28 h-28 sm:w-36 sm:h-36 rounded-lg sm:rounded-xl bg-brand-dark overflow-hidden flex-shrink-0">
            <img 
              src="${safeImage}" 
              alt="${safeTitle}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://placehold.co/400x400/1e1828/a855f7?text=PartShop';"
            >
            <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black tracking-wide bg-brand-shopee text-white shadow">
              ${safeDiscount}
            </span>
            <div class="absolute bottom-1 left-1.5 text-[9px] sm:text-[10px] font-medium text-gray-300 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1">
              <i data-lucide="flame" class="w-2.5 h-2.5 text-orange-400"></i>
              ${safeSales}
            </div>
          </div>

          <div class="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div class="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-400 mb-1">
                <span class="text-purple-400 font-medium truncate">${safeCategory}</span>
                <span class="flex items-center gap-0.5 text-amber-400 font-semibold flex-shrink-0">
                  <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i>
                  ${p.rating}
                </span>
              </div>

              <h4 class="font-semibold text-white text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
                ${safeTitle}
              </h4>
            </div>

            <div class="mt-2 pt-2 border-t border-brand-border/60">
              <div class="flex items-baseline justify-between gap-1 mb-2">
                <div>
                  <span class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block">A partir de</span>
                  <div class="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    R$ ${formattedPrice}
                  </div>
                </div>
                <span class="text-[9px] text-gray-400 hidden xs:inline sm:inline">Com cupom</span>
              </div>

              <div class="grid grid-cols-5 gap-1.5">
                <a 
                  href="${safeUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="col-span-4 bg-gradient-to-r from-brand-shopee to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-[11px] sm:text-xs py-2 px-2 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 shadow-md shadow-orange-950/40 transition active:scale-95"
                >
                  <span>Ver na Shopee</span>
                  <i data-lucide="external-link" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                </a>

                <button 
                  onclick="copyProductLinkById('${escapeHtml(p.id)}')" 
                  title="Copiar Link"
                  aria-label="Copiar link do produto"
                  class="col-span-1 bg-brand-dark hover:bg-brand-hover border border-brand-border text-gray-300 hover:text-white rounded-lg sm:rounded-xl flex items-center justify-center transition cursor-pointer p-1.5"
                >
                  <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

          </div>
        </article>
      `;
    }

    // LAYOUT 2: 1 COLUNA (FEED EXPANDIDO)
    if (currentViewMode === "grid-1") {
      return `
        <article class="bg-brand-card rounded-2xl border border-brand-border overflow-hidden hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 flex flex-col group">
          <div class="relative w-full aspect-square bg-brand-dark overflow-hidden">
            <img 
              src="${safeImage}" 
              alt="${safeTitle}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://placehold.co/400x400/1e1828/a855f7?text=PartShop';"
            >
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide bg-brand-shopee text-white shadow-lg">
              ${safeDiscount}
            </span>
            <span class="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeBg} backdrop-blur-md">
              ${safeBadge}
            </span>
            <div class="absolute bottom-3 left-3 text-xs font-medium text-gray-300 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <i data-lucide="flame" class="w-3.5 h-3.5 text-orange-400"></i>
              ${safeSales}
            </div>
          </div>

          <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span class="text-purple-400 font-semibold">${safeCategory}</span>
                <span class="flex items-center gap-1 text-amber-400 font-bold">
                  <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                  ${p.rating}
                </span>
              </div>

              <h4 class="font-bold text-white text-base leading-snug group-hover:text-purple-300 transition-colors">
                ${safeTitle}
              </h4>
            </div>

            <div class="mt-4 pt-3 border-t border-brand-border/60">
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-gray-400 uppercase tracking-wider font-semibold">A partir de</span>
                <div class="text-2xl font-black text-emerald-400 tracking-tight">
                  R$ ${formattedPrice}
                </div>
              </div>

              <div class="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-gold"></i>
                <span>Com cupom aplicado no app</span>
              </div>

              <div class="grid grid-cols-5 gap-2 mt-4">
                <a 
                  href="${safeUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="col-span-4 bg-gradient-to-r from-brand-shopee to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition active:scale-95"
                >
                  <span>Ver na Shopee</span>
                  <i data-lucide="external-link" class="w-4 h-4"></i>
                </a>

                <button 
                  onclick="copyProductLinkById('${escapeHtml(p.id)}')" 
                  title="Copiar Link"
                  aria-label="Copiar link do produto"
                  class="col-span-1 bg-brand-dark hover:bg-brand-hover border border-brand-border text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition cursor-pointer"
                >
                  <i data-lucide="share-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    // LAYOUT 3: 2 COLUNAS (PADRÃO - COMPACTO E ELEGANTE)
    return `
      <article class="bg-brand-card rounded-xl sm:rounded-2xl border border-brand-border overflow-hidden hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 flex flex-col group">
        
        <div class="relative w-full aspect-square bg-brand-dark overflow-hidden">
          <img 
            src="${safeImage}" 
            alt="${safeTitle}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onerror="this.onerror=null; this.src='https://placehold.co/400x400/1e1828/a855f7?text=PartShop';"
          >
          
          <span class="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-black tracking-wide bg-brand-shopee text-white shadow-lg">
            ${safeDiscount}
          </span>

          <span class="absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold border ${badgeBg} backdrop-blur-md max-w-[85px] sm:max-w-none truncate">
            ${safeBadge}
          </span>

          <div class="absolute bottom-1.5 left-2 sm:bottom-2 sm:left-3 text-[10px] sm:text-[11px] font-medium text-gray-300 bg-black/60 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
            <i data-lucide="flame" class="w-3 h-3 text-orange-400"></i>
            ${safeSales}
          </div>
        </div>

        <div class="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-400 mb-1 sm:mb-1.5">
              <span class="text-purple-400 font-medium truncate max-w-[65%] sm:max-w-none">${safeCategory}</span>
              <span class="flex items-center gap-0.5 sm:gap-1 text-amber-400 font-semibold flex-shrink-0">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i>
                ${p.rating}
              </span>
            </div>

            <h4 class="font-semibold text-white text-xs sm:text-sm line-clamp-2 leading-tight sm:leading-snug min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-purple-300 transition-colors">
              ${safeTitle}
            </h4>
          </div>

          <div class="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-brand-border/60">
            <div class="flex items-baseline gap-1 sm:gap-1.5">
              <span class="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider font-semibold">A partir de</span>
              <div class="text-base sm:text-xl font-black text-emerald-400 tracking-tight">
                R$ ${formattedPrice}
              </div>
            </div>

            <div class="flex items-center gap-1 text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
              <i data-lucide="sparkles" class="w-3 h-3 text-brand-gold flex-shrink-0"></i>
              <span class="truncate">Com cupom no app</span>
            </div>

            <div class="grid grid-cols-5 gap-1.5 sm:gap-2 mt-2.5 sm:mt-3.5">
              <a 
                href="${safeUrl}" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="col-span-4 bg-gradient-to-r from-brand-shopee to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-[11px] sm:text-xs py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 shadow-md shadow-orange-950/40 transition active:scale-95"
              >
                <span>Ver na Shopee</span>
                <i data-lucide="external-link" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
              </a>

              <button 
                onclick="copyProductLinkById('${escapeHtml(p.id)}')" 
                title="Copiar Link"
                aria-label="Copiar link do produto"
                class="col-span-1 bg-brand-dark hover:bg-brand-hover border border-brand-border text-gray-300 hover:text-white rounded-lg sm:rounded-xl flex items-center justify-center transition cursor-pointer"
              >
                <i data-lucide="share-2" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
              </button>
            </div>
          </div>

        </div>

      </article>
    `;
  }).join("");

  // Gerenciamento da Visibilidade do Botão Carregar Mais
  if (items.length > visiveis.length) {
    loadMoreBox.classList.remove("hidden");
    pageCounterText.innerText = `Mostrando ${visiveis.length} de ${items.length} produtos disponíveis`;
  } else {
    loadMoreBox.classList.add("hidden");
  }

  lucide.createIcons();
}

// Ação do Botão: Puxa o próximo bloco sem recarregar a tela
function loadMoreProducts() {
  itensExibidosCount += ITENS_POR_PAGINA;
  applyFilters();
}

// Copiar Link Seguro por ID do Produto
function copyProductLinkById(productId) {
  const p = products.find(item => item.id === productId);
  if (!p) return;
  copyProductLink(p.affiliateUrl, p.title);
}

// Compartilhamento com Toast e Fallback Seguro
function copyProductLink(url, title) {
  const shortTitle = title ? title.substring(0, 24) : "Produto";
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      showToast(`Link de "${shortTitle}..." copiado!`);
    }).catch(() => fallbackCopy(url, shortTitle));
  } else {
    fallbackCopy(url, shortTitle);
  }
}

function fallbackCopy(text, shortTitle) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      showToast(shortTitle ? `Link de "${shortTitle}..." copiado!` : "Link copiado com sucesso!");
    } else {
      showToast("Não foi possível copiar automaticamente.");
    }
  } catch (err) {
    showToast("Não foi possível copiar.");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMessage");
  if (!toast || !msg) return;

  msg.innerText = message;
  toast.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
  toast.classList.add("translate-y-0", "opacity-100");

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
  }, 2800);
}

// Modal de Gestão JSON do Catálogo
function toggleConfigModal() {
  const modal = document.getElementById("configModal");
  const editor = document.getElementById("jsonEditor");
  if (!modal || !editor) return;

  if (modal.classList.contains("hidden")) {
    editor.value = JSON.stringify(products, null, 2);
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } else {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function saveJsonConfig() {
  const editor = document.getElementById("jsonEditor");
  try {
    const parsed = JSON.parse(editor.value);
    if (Array.isArray(parsed)) {
      persistProducts(parsed);
      toggleConfigModal();
      showToast("Catálogo atualizado com sucesso!");
    } else {
      alert("O JSON precisa ser uma lista (array) de produtos.");
    }
  } catch (e) {
    alert("Erro de sintaxe no JSON: " + e.message);
  }
}

function resetDefaultProducts() {
  if (confirm("Deseja restaurar a lista padrão de produtos do PartShop?")) {
    localStorage.removeItem("partshop_custom_catalog");
    localStorage.setItem("partshop_catalog_version", CATALOG_VERSION);
    products = [...DEFAULT_PRODUCTS];
    renderCategoryChips();
    applyFilters();
    toggleConfigModal();
    showToast("Catálogo padrão restaurado!");
  }
}

// Inicialização do Botão Back to Top
function initBackToTop() {
  const btn = document.getElementById("btnBackToTop");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 350) {
      btn.classList.remove("opacity-0", "pointer-events-none", "translate-y-4");
      btn.classList.add("opacity-100", "pointer-events-auto", "translate-y-0");
    } else {
      btn.classList.remove("opacity-100", "pointer-events-auto", "translate-y-0");
      btn.classList.add("opacity-0", "pointer-events-none", "translate-y-4");
    }
  }, { passive: true });
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// Atalhos de Teclado (ex.: Ctrl + Shift + K para abrir Gestão de Catálogo)
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
      e.preventDefault();
      toggleConfigModal();
    }
  });
}

// Controle do Menu Hambúrguer (Mobile)
function toggleMobileMenu() {
  const panel = document.getElementById("mobileMenuPanel");
  const icon = document.getElementById("menuHamburgerIcon");
  if (!panel || !icon) return;

  const isHidden = panel.classList.contains("hidden");
  if (isHidden) {
    panel.classList.remove("hidden");
    icon.setAttribute("data-lucide", "x");
  } else {
    panel.classList.add("hidden");
    icon.setAttribute("data-lucide", "menu");
  }
  lucide.createIcons();
}

// Ações do Programa Indique e Ganhe
function copyReferralCode(code) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Código ${code} copiado com sucesso!`);
    }).catch(() => fallbackCopy(code, `Código ${code}`));
  } else {
    fallbackCopy(code, `Código ${code}`);
  }
}

function openReferralRegistration(code, url) {
  copyReferralCode(code);
  showToast(`Código ${code} copiado! Abrindo cadastro Shopee...`);
  setTimeout(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, 400);
}

