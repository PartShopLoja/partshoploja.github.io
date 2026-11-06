// Configurações de Paginação
const ITENS_POR_PAGINA = 8;
let itensExibidosCount = ITENS_POR_PAGINA;

// Estado da Aplicação
let products = [];
let currentCategory = "Todos";
let searchQuery = "";
let currentSort = "relevance";

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  renderCategoryChips();
  applyFilters();
});

// Leitura com Fallback
function loadProducts() {
  const saved = localStorage.getItem("partshop_custom_catalog");
  if (saved) {
    try {
      products = JSON.parse(saved);
    } catch (e) {
      console.error("Erro no JSON local. Restaurando padrão.", e);
      products = [...DEFAULT_PRODUCTS];
    }
  } else {
    products = [...DEFAULT_PRODUCTS];
  }
}

function persistProducts(newProducts) {
  products = newProducts;
  localStorage.setItem("partshop_custom_catalog", JSON.stringify(products));
  renderCategoryChips();
  applyFilters();
}

// Renderizar Categorias Dinâmicas (Apenas de produtos ativos)
function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  const ativos = products.filter(p => p.ativo !== false);
  const categories = ["Todos", ...new Set(ativos.map(p => p.category))];

  container.innerHTML = categories.map(cat => {
    const isActive = cat === currentCategory;
    const activeClass = isActive 
      ? "bg-purple-600 text-white font-bold border-purple-500 shadow-md shadow-purple-900/30" 
      : "bg-brand-dark text-gray-400 hover:text-white border-brand-border hover:border-gray-600";

    return `
      <button 
        onclick="setCategory('${cat}')" 
        class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all border ${activeClass} flex items-center gap-1.5"
      >
        ${cat === 'Todos' ? '<i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>' : ''}
        ${cat}
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
  document.getElementById("searchInput").value = "";
  itensExibidosCount = ITENS_POR_PAGINA;
  renderCategoryChips();
  applyFilters();
}

// Filtro Central com Checagem Obrigatória de p.ativo !== false
function applyFilters() {
  let filtered = products.filter(p => {
    const isAtivo = p.ativo !== false; // Só exibe se for true
    const matchesCategory = currentCategory === "Todos" || p.category === currentCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery) || 
                          p.category.toLowerCase().includes(searchQuery);
    return isAtivo && matchesCategory && matchesSearch;
  });

  // Ordenação
  if (currentSort === "price-asc") {
    filtered.sort((a, b) => a.referencePrice - b.referencePrice);
  } else if (currentSort === "price-desc") {
    filtered.sort((a, b) => b.referencePrice - a.referencePrice);
  } else if (currentSort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  renderProducts(filtered);
}

// Renderização dos Cards e Controle do Botão "Carregar Mais"
function renderProducts(items) {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const title = document.getElementById("productsCountTitle");
  const badge = document.getElementById("activeFilterBadge");
  const loadMoreBox = document.getElementById("loadMoreContainer");
  const pageCounterText = document.getElementById("pageCounterText");

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

    const formattedPrice = p.referencePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
      <article class="bg-brand-card rounded-2xl border border-brand-border overflow-hidden hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 flex flex-col group">
        
        <div class="relative w-full aspect-square bg-brand-dark overflow-hidden">
          <img 
            src="${p.image}" 
            alt="${p.title}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onerror="this.src='https://placehold.co/400x400/1e1828/a855f7?text=PartShop'"
          >
          
          <span class="absolute top-3 left-3 px-2 py-1 rounded-lg text-[11px] font-black tracking-wide bg-brand-shopee text-white shadow-lg">
            ${p.discountText}
          </span>

          <span class="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold border ${badgeBg} backdrop-blur-md">
            ${p.badge}
          </span>

          <div class="absolute bottom-2 left-3 text-[11px] font-medium text-gray-300 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1">
            <i data-lucide="flame" class="w-3 h-3 text-orange-400"></i>
            ${p.salesCount}
          </div>
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
              <span class="text-purple-400 font-medium">${p.category}</span>
              <span class="flex items-center gap-1 text-amber-400 font-semibold">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i>
                ${p.rating}
              </span>
            </div>

            <h4 class="font-semibold text-white text-sm line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
              ${p.title}
            </h4>
          </div>

          <div class="mt-4 pt-3 border-t border-brand-border/60">
            <div class="flex items-baseline gap-1.5">
              <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">A partir de</span>
              <div class="text-xl font-black text-emerald-400 tracking-tight">
                R$ ${formattedPrice}
              </div>
            </div>

            <div class="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
              <i data-lucide="sparkles" class="w-3 h-3 text-brand-gold"></i>
              <span>Com cupom aplicado no app</span>
            </div>

            <div class="grid grid-cols-5 gap-2 mt-3.5">
              <a 
                href="${p.affiliateUrl}" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="col-span-4 bg-gradient-to-r from-brand-shopee to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/40 transition active:scale-95"
              >
                <span>Ver na Shopee</span>
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
              </a>

              <button 
                onclick="copyProductLink('${p.affiliateUrl}', '${p.title}')" 
                title="Copiar Link"
                class="col-span-1 bg-brand-dark hover:bg-brand-hover border border-brand-border text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition"
              >
                <i data-lucide="share-2" class="w-4 h-4"></i>
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

// Compartilhamento com Toast
function copyProductLink(url, title) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      showToast(`Link de "${title.substring(0, 20)}..." copiado!`);
    }).catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast("Link copiado com sucesso!");
  } catch (err) {
    showToast("Não foi possível copiar.");
  }
  document.body.removeChild(textArea);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMessage");
  msg.innerText = message;
  toast.classList.remove("translate-y-24", "opacity-0");
  setTimeout(() => {
    toast.classList.add("translate-y-24", "opacity-0");
  }, 2500);
}

// Modal JSON
function toggleConfigModal() {
  const modal = document.getElementById("configModal");
  const editor = document.getElementById("jsonEditor");

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
  if (confirm("Deseja restaurar a lista padrão de produtos?")) {
    localStorage.removeItem("partshop_custom_catalog");
    products = [...DEFAULT_PRODUCTS];
    renderCategoryChips();
    applyFilters();
    toggleConfigModal();
    showToast("Catálogo restaurado!");
  }
}