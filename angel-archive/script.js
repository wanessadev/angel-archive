// ============================================
//  SUPABASE CONFIGURAÇÃO
// ============================================
const SUPABASE_URL = 'https://niaritlethlmrrpspwow.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lPmzjwPVaE9U08Jn8SSf4Q_GzTvKUiA';

let supabaseClient = null;
let supabaseAvailable = false;

try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        supabaseAvailable = true;
    } else {
        console.warn('Biblioteca Supabase não carregada. Modo offline ativado.');
    }
} catch (e) {
    console.error('Erro ao inicializar Supabase:', e);
    supabaseAvailable = false;
}

// ============================================
//  CONFIGURAÇÕES DO COFRE CÓSMICO
// ============================================
const INITIAL_MEDIA = [
    { id: 1, title: "Dune: Messiah", type: "grimorio", genre: "Sci-Fi / Épico", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg", status: "concluido", rating: 5, review: "Uma obra que redefine épicos literários. Herbert tece política e misticismo com maestria singular." },
    { id: 2, title: "Elden Ring", type: "odisseia", genre: "Action RPG / Soulslike", cover: "https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg", status: "progresso", rating: 5, review: "Mundo vasto e labiríntico. Cada canto esconde lore denso e recompensas para os curiosos." },
    { id: 3, title: "Fullmetal Alchemist: Brotherhood", type: "visao", genre: "Shonen / Aventura", cover: "https://cdn.myanimelist.net/images/anime/1223/96541.jpg", status: "concluido", rating: 5, review: "Narrativa perfeita do início ao fim. Cada personagem tem peso e propósito." },
    { id: 4, title: "Severance", type: "visao", genre: "Thriller / Sci-Fi", cover: "https://m.media-amazon.com/images/M/MV5BZWQ5MWY0YzQtNGFkYi00NDliLWI1ZGMtOGFjNjFiM2E3NjkxXkEyXkFqcGdeQXVyMTEzMTI1Mjk3._V1_.jpg", status: "progresso", rating: 4, review: "A divisão entre o 'innie' e 'outie' é uma metáfora perturbadora sobre alienação do trabalho." },
    { id: 5, title: "Hollow Knight", type: "odisseia", genre: "Metroidvania / Indie", cover: "https://upload.wikimedia.org/wikipedia/en/7/74/Hollow_Knight_cover.webp", status: "pausado", rating: 4, review: "Arte e atmosfera impecáveis. Hallownest é um mundo que respira melancolia e beleza." },
    { id: 6, title: "Blade Runner 2049", type: "cinema", genre: "Sci-Fi / Neo-Noir", cover: "https://upload.wikimedia.org/wikipedia/en/9/9b/Blade_Runner_2049_poster.png", status: "concluido", rating: 5, review: "Uma obra-prima visual que expande o universo do original com maestria. Deakins é um deus da fotografia." },
    { id: 7, title: "Everything Everywhere All at Once", type: "cinema", genre: "Aventura / Absurdo", cover: "https://upload.wikimedia.org/wikipedia/en/1/1e/Everything_Everywhere_All_at_Once_poster.jpg", status: "concluido", rating: 5, review: "Caótico, emocionante e profundamente humano. Uma experiência cinematográfica única." },
    { id: 8, title: "Dune: Part Two", type: "cinema", genre: "Sci-Fi / Épico", cover: "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg", status: "quero", rating: 0, review: "" }
];

const STATUS_CONFIG = {
    progresso: { label: "Em Progresso", color: "#11CAA0", glow: "0 0 12px #11CAA0aa" },
    concluido: { label: "Concluído", color: "#BC84EE", glow: "0 0 12px #BC84EEaa" },
    pausado:   { label: "Pausado",   color: "#FDD5BD", glow: "0 0 12px #FDD5BDaa" },
    quero:     { label: "Quero Ver/Ler", color: "#84b4ee", glow: "0 0 12px #84b4eeaa" }
};

const TYPE_CONFIG = {
    galaxia:  { label: "Galáxia",   icon: "\u2726", filter: null },
    odisseia: { label: "Jogos",     icon: "\u25C8", filter: "odisseia" },
    grimorio: { label: "Grimórios", icon: "\u27C1", filter: "grimorio" },
    visao:    { label: "Séries",    icon: "\u25C9", filter: "visao" },
    cinema:   { label: "Filmes",    icon: "\u25B6", filter: "cinema" }
};

const TYPE_LABELS = { odisseia: "Jogo", grimorio: "Livro", visao: "Série", cinema: "Filme" };

// ============================================
//  ESTADO GLOBAL
// ============================================
let mediaItems = [];
let currentFilter = "galaxia";
let selectedItemId = null;
let saveTimeout = null;
let lastFocusedElement = null;
let revealTimeouts = [];

// ============================================
//  SUPABASE CRUD — COM TIMEOUT, RESILIÊNCIA E MAPEAMENTO cover_url
// ============================================

const FETCH_TIMEOUT = 8000;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
}

// Carregar mídias do Supabase
async function loadFromSupabase() {
    if (!supabaseAvailable || !supabaseClient) {
        console.log('Supabase indisponível. Pulando carregamento da nuvem.');
        return null;
    }
    try {
        const { data, error } = await withTimeout(
            supabaseClient
                .from('media_items')
                .select('*')
                .order('created_at', { ascending: false }),
            FETCH_TIMEOUT
        );

        if (error) {
            console.error('Erro Supabase:', error);
            return null;
        }

        return data || [];
    } catch (e) {
        console.error('Falha na conexão Supabase:', e.message || e);
        return null;
    }
}

// Salvar nova mídia no Supabase
// NOTA: A coluna no Supabase se chama 'cover_url', mas no JS usamos 'cover'
async function saveToSupabase(item) {
    if (!supabaseAvailable || !supabaseClient) {
        console.log('Supabase indisponível. Salvando apenas localmente.');
        return null;
    }
    try {
        const { data, error } = await withTimeout(
            supabaseClient
                .from('media_items')
                .insert([{
                    title: item.title,
                    type: item.type,
                    genre: item.genre,
                    cover_url: item.cover,        // ← MAPEAMENTO: cover → cover_url
                    status: item.status,
                    rating: item.rating,
                    review: item.review
                }])
                .select()
                .single(),
            FETCH_TIMEOUT
        );

        if (error) {
            console.error('Erro ao salvar:', error);
            showToast('Erro ao salvar na nuvem', 'error');
            return null;
        }

        return data;
    } catch (e) {
        console.error('Falha ao salvar:', e);
        showToast('Erro de conexão', 'error');
        return null;
    }
}

// Atualizar mídia no Supabase
// NOTA: A coluna no Supabase se chama 'cover_url', mas no JS usamos 'cover'
async function updateInSupabase(id, updates) {
    if (!supabaseAvailable || !supabaseClient) {
        console.log('Supabase indisponível. Atualizando apenas localmente.');
        return null;
    }
    try {
        const { data, error } = await withTimeout(
            supabaseClient
                .from('media_items')
                .update({
                    title: updates.title,
                    type: updates.type,
                    genre: updates.genre,
                    cover_url: updates.cover,     // ← MAPEAMENTO: cover → cover_url
                    status: updates.status,
                    rating: updates.rating,
                    review: updates.review
                })
                .eq('id', id)
                .select()
                .single(),
            FETCH_TIMEOUT
        );

        if (error) {
            console.error('Erro ao atualizar:', error);
            showToast('Erro ao atualizar na nuvem', 'error');
            return null;
        }

        return data;
    } catch (e) {
        console.error('Falha ao atualizar:', e);
        showToast('Erro de conexão', 'error');
        return null;
    }
}

// Deletar mídia do Supabase
async function deleteFromSupabase(id) {
    if (!supabaseAvailable || !supabaseClient) {
        console.log('Supabase indisponível. Removendo apenas localmente.');
        return true;
    }
    try {
        const { error } = await withTimeout(
            supabaseClient
                .from('media_items')
                .delete()
                .eq('id', id),
            FETCH_TIMEOUT
        );

        if (error) {
            console.error('Erro ao deletar:', error);
            showToast('Erro ao remover da nuvem', 'error');
            return false;
        }

        return true;
    } catch (e) {
        console.error('Falha ao deletar:', e);
        showToast('Erro de conexão', 'error');
        return false;
    }
}

// ============================================
//  INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    generateParticles();
    generateStars();
    await loadData();
    setupEventListeners();
    renderApp();
});

// Gerar partículas etéreas flutuantes
function generateParticles() {
    const field = document.getElementById("particle-field");
    if (!field) return;

    const fragment = document.createDocumentFragment();
    const colors = ['rgba(188, 132, 238, 0.4)', 'rgba(17, 202, 160, 0.3)', 'rgba(255, 107, 157, 0.3)', 'rgba(255, 255, 255, 0.5)'];

    for (let i = 0; i < 25; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        const size = 1 + Math.random() * 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDuration = `${15 + Math.random() * 20}s`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.borderRadius = '50%';
        fragment.appendChild(particle);
    }

    field.appendChild(fragment);
}

// Gerar campo de estrelas
function generateStars() {
    const field = document.getElementById("stars-field");
    if (!field) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 80; i++) {
        const star = document.createElement("div");
        star.className = "star";
        const size = Math.random() > 0.8 ? 2 : 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.setProperty('--duration', `${2 + Math.random() * 4}s`);
        star.style.setProperty('--delay', `${Math.random() * 5}s`);
        fragment.appendChild(star);
    }

    field.appendChild(fragment);
}

// Carregar dados (Supabase primeiro, fallback para localStorage)
// NOTA: O Supabase envia 'cover_url', mas o JS espera 'cover'
async function loadData() {
    let loaded = false;

    // Tentar Supabase primeiro
    const supabaseData = await loadFromSupabase();

    if (supabaseData && supabaseData.length > 0) {
        mediaItems = supabaseData.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            genre: item.genre,
            cover: item.cover_url || item.cover,  // ← MAPEAMENTO: cover_url → cover
            status: item.status,
            rating: item.rating,
            review: item.review
        }));
        showToast('Dados carregados da nuvem ☁️', 'success');
        loaded = true;
    }

    // Fallback: tentar localStorage
    if (!loaded) {
        try {
            const saved = localStorage.getItem("celestial-vault-media");
            if (saved) {
                mediaItems = JSON.parse(saved);
                showToast('Dados carregados localmente 💾', 'info');
                loaded = true;
            }
        } catch (e) {
            console.warn("Erro ao carregar localStorage:", e);
        }
    }

    // Último fallback: dados iniciais
    if (!loaded) {
        mediaItems = [...INITIAL_MEDIA];
        showToast('Acervo inicial carregado ✨', 'info');

        // Tenta sincronizar iniciais no Supabase (silenciosamente)
        if (supabaseAvailable) {
            for (const item of INITIAL_MEDIA) {
                try {
                    await saveToSupabase(item);
                } catch (e) {
                    // ignora erro individual
                }
            }
        }
    }

    // Sempre salva no localStorage como backup
    saveData();
}

// Salvar no localStorage como backup
function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem("celestial-vault-media", JSON.stringify(mediaItems));
        } catch (e) {
            console.warn("Erro ao salvar backup local:", e);
        }
    }, 300);
}

// ============================================
//  TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = "success", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "toastOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
//  RENDERIZADORES
// ============================================
function renderApp() {
    renderSidebarCounts();
    renderGlobalStats();
    renderGrid();
}

function renderGlobalStats() {
    const statTotal = document.getElementById("stat-total");
    const statConcluidos = document.getElementById("stat-concluidos");
    if (statTotal) statTotal.textContent = `${mediaItems.length} obras`;
    const concluidos = mediaItems.filter(m => m.status === "concluido").length;
    if (statConcluidos) statConcluidos.textContent = `${concluidos} concluídas`;
}

function renderSidebarCounts() {
    const countGalaxia = document.getElementById("count-galaxia");
    const countOdisseia = document.getElementById("count-odisseia");
    const countGrimorio = document.getElementById("count-grimorio");
    const countVisao = document.getElementById("count-visao");
    const countCinema = document.getElementById("count-cinema");

    if (countGalaxia) countGalaxia.textContent = `${mediaItems.length} itens`;
    if (countOdisseia) countOdisseia.textContent = `${mediaItems.filter(m => m.type === "odisseia").length} itens`;
    if (countGrimorio) countGrimorio.textContent = `${mediaItems.filter(m => m.type === "grimorio").length} itens`;
    if (countVisao) countVisao.textContent = `${mediaItems.filter(m => m.type === "visao").length} itens`;
    if (countCinema) countCinema.textContent = `${mediaItems.filter(m => m.type === "cinema").length} itens`;

    const statsList = document.getElementById("progresso-stats-list");
    if (!statsList) return;
    statsList.innerHTML = "";

    const fragment = document.createDocumentFragment();
    Object.entries(STATUS_CONFIG).forEach(([key, cfg]) => {
        const count = mediaItems.filter(m => m.status === key).length;
        if (count > 0) {
            const row = document.createElement("div");
            row.className = "stat-row";
            row.innerHTML = `
                <span style="color: rgba(255,255,255,0.3)">${cfg.label}</span>
                <span style="color: ${cfg.color}; font-weight: 600">${count}</span>
            `;
            fragment.appendChild(row);
        }
    });
    statsList.appendChild(fragment);
}

function renderGrid() {
    const grid = document.getElementById("media-grid");
    if (!grid) return;

    revealTimeouts.forEach(clearTimeout);
    revealTimeouts = [];

    grid.innerHTML = "";

    const filterType = TYPE_CONFIG[currentFilter].filter;
    const filteredItems = filterType ? mediaItems.filter(m => m.type === filterType) : mediaItems;

    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");
    if (pageTitle) pageTitle.textContent = `${TYPE_CONFIG[currentFilter].icon} ${TYPE_CONFIG[currentFilter].label}`;
    if (pageSubtitle) pageSubtitle.textContent = `${filteredItems.length} ${filteredItems.length === 1 ? 'obra catalogada' : 'obras catalogadas'} no acervo`;

    if (filteredItems.length === 0) {
        grid.innerHTML = `
            <div class="no-data">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.4">${TYPE_CONFIG[currentFilter].icon}</div>
                <p style="font-size: 16px; margin-bottom: 8px; font-style: italic; font-family: 'Crimson Text', serif">O acervo aguarda suas histórias...</p>
            </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredItems.forEach((item, index) => {
        const card = createMediaCard(item, index);
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
}

function createMediaCard(item, index) {
    const card = document.createElement("div");
    card.className = "media-card";
    card.setAttribute("data-id", item.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${item.title}, ${TYPE_LABELS[item.type]}, ${STATUS_CONFIG[item.status].label}`);

    card.addEventListener("click", () => openEditModal(item));
    card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEditModal(item);
        }
    });

    card.style.animationDelay = `${index * 60}ms`;

    const starsHtml = buildStarsHtml(item.rating);
    const statusCfg = STATUS_CONFIG[item.status];

    card.innerHTML = `
        <div class="cover-wrapper">
            <img src="${escapeHtml(item.cover)}" alt="Capa de ${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x180/0B0E21/BC84EE?text=${encodeURIComponent(item.title)}'">
            <div class="cover-mask"></div>
            <span class="media-type-badge">${TYPE_LABELS[item.type]}</span>
        </div>
        <div class="card-info">
            <h3>${escapeHtml(item.title)}</h3>
            <p class="genre">${escapeHtml(item.genre)}</p>
            <div class="card-meta">
                ${starsHtml}
                <span class="status-tag" data-status="${item.status}" style="color: ${statusCfg.color}; border: 1px solid ${statusCfg.color}44; background: ${statusCfg.color}18">
                    <span class="dot" style="background: ${statusCfg.color}; box-shadow: ${statusCfg.glow}"></span>
                    ${statusCfg.label}
                </span>
            </div>
            <div class="card-review-box">
                <p>"${item.review ? escapeHtml(item.review) : 'Sem resenha escrita ainda...'}"</p>
            </div>
        </div>
    `;

    return card;
}

function buildStarsHtml(rating) {
    let html = '<div class="stars-display">';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star-icon ${i <= rating ? 'filled' : ''}" aria-hidden="true">&#10022;</span>`;
    }
    html += '</div>';
    return html;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
//  PICKER DE ESTRELAS
// ============================================
function initStarsPicker(containerId, initialRating) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let currentRating = initialRating;

    function renderStars(displayRating) {
        container.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            const isFilled = i <= displayRating;
            star.className = `star-icon ${isFilled ? 'filled' : ''}`;
            star.innerHTML = "&#10022;";
            star.setAttribute("role", "radio");
            star.setAttribute("aria-checked", isFilled ? "true" : "false");
            star.setAttribute("aria-label", `${i} estrela${i > 1 ? 's' : ''}`);
            star.setAttribute("tabindex", "0");
            star.setAttribute("data-value", i);

            star.addEventListener("mouseenter", () => {
                renderStars(i);
            });

            star.addEventListener("click", (e) => {
                e.stopPropagation();
                currentRating = i;
                container.setAttribute("data-rating", currentRating);
                renderStars(currentRating);
            });

            star.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    currentRating = i;
                    container.setAttribute("data-rating", currentRating);
                    renderStars(currentRating);
                }
            });

            container.appendChild(star);
        }
    }

    container.addEventListener("mouseleave", () => {
        renderStars(currentRating);
    });

    container.setAttribute("data-rating", currentRating);
    renderStars(currentRating);
}

// ============================================
//  FOCUS TRAP PARA MODAIS
// ============================================
function trapFocus(modalElement) {
    const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    modalElement.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
        }
    });

    if (firstFocusable) firstFocusable.focus();
}

// ============================================
//  EVENTOS E INTERAÇÃO
// ============================================
function setupEventListeners() {
    // Navegação da Sidebar
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetBtn = e.currentTarget;
            const newFilter = targetBtn.getAttribute("data-nav");

            if (newFilter === currentFilter) return;

            document.querySelectorAll(".nav-btn").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            targetBtn.classList.add("active");
            targetBtn.setAttribute("aria-pressed", "true");
            currentFilter = newFilter;

            const grid = document.getElementById("media-grid");
            if (grid) {
                grid.style.opacity = "0";
                grid.style.transform = "translateY(10px)";

                setTimeout(() => {
                    renderGrid();
                    grid.style.opacity = "1";
                    grid.style.transform = "translateY(0)";
                    grid.scrollTop = 0;
                }, 150);
            }
        });
    });

    // Modal de adicionar
    const openAddBtn = document.getElementById("open-add-modal");
    if (openAddBtn) {
        openAddBtn.addEventListener("click", () => {
            lastFocusedElement = document.activeElement;
            document.getElementById("add-title").value = "";
            document.getElementById("add-genre").value = "";
            document.getElementById("add-cover").value = "";
            document.getElementById("add-review").value = "";
            initStarsPicker("add-stars-picker", 3);

            const modal = document.getElementById("add-modal");
            modal.classList.add("open");
            modal.setAttribute("aria-hidden", "false");
            trapFocus(modal.querySelector(".modal-card"));
        });
    }

    // Alternar tipos no modal de cadastro
    document.querySelectorAll(".type-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".type-btn").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-checked", "false");
            });
            e.currentTarget.classList.add("active");
            e.currentTarget.setAttribute("aria-checked", "true");
        });
    });

    // Salvar cadastro de nova obra
    const saveAddBtn = document.getElementById("save-add-btn");
    if (saveAddBtn) {
        saveAddBtn.addEventListener("click", async () => {
            const title = document.getElementById("add-title").value.trim();
            if (!title) {
                showToast("Por favor, digite ao menos o Título!", "error");
                document.getElementById("add-title").focus();
                return;
            }

            const genre = document.getElementById("add-genre").value.trim() || "Gênero Geral";
            const cover = document.getElementById("add-cover").value.trim();
            const type = document.querySelector(".type-btn.active").getAttribute("data-type");
            const status = document.getElementById("add-status").value;
            const rating = Number(document.getElementById("add-stars-picker").getAttribute("data-rating"));
            const review = document.getElementById("add-review").value.trim();

            const newItem = { title, genre, cover, type, status, rating, review };

            // Salvar no Supabase
            const savedItem = await saveToSupabase(newItem);

            if (savedItem) {
                mediaItems.push({
                    id: savedItem.id,
                    title: savedItem.title,
                    genre: savedItem.genre,
                    cover: savedItem.cover_url || savedItem.cover,  // ← MAPEAMENTO DE VOLTA
                    type: savedItem.type,
                    status: savedItem.status,
                    rating: savedItem.rating,
                    review: savedItem.review
                });
            } else {
                // Modo offline: gera ID local
                const localId = Date.now() + Math.floor(Math.random() * 1000);
                mediaItems.push({
                    id: localId,
                    title,
                    genre,
                    cover,
                    type,
                    status,
                    rating,
                    review
                });
            }

            saveData(); // backup local
            closeModals();
            renderApp();
            showToast(`"${title}" catalogada com sucesso!`, "success");
        });
    }

    // Salvar edição
    const saveEditBtn = document.getElementById("save-edit-btn");
    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", async () => {
            const item = mediaItems.find(m => m.id === selectedItemId);
            if (!item) return;

            const newStatus = document.querySelector(".status-btn.active").getAttribute("data-status");
            const oldStatus = item.status;

            const updates = {
                title: item.title,
                genre: item.genre,
                cover: item.cover,
                type: item.type,
                status: newStatus,
                rating: Number(document.getElementById("edit-stars-picker").getAttribute("data-rating")),
                review: document.getElementById("edit-review").value.trim()
            };

            const updated = await updateInSupabase(selectedItemId, updates);

            if (updated) {
                item.status = newStatus;
                item.rating = updates.rating;
                item.review = updates.review;
            } else {
                // Modo offline: atualiza localmente mesmo assim
                item.status = newStatus;
                item.rating = updates.rating;
                item.review = updates.review;
            }

            saveData(); // backup local
            closeModals();
            renderApp();

            if (oldStatus !== newStatus) {
                setTimeout(() => {
                    const card = document.querySelector(`.media-card[data-id="${item.id}"] .status-tag`);
                    if (card) {
                        card.classList.add("status-pulse");
                        setTimeout(() => card.classList.remove("status-pulse"), 600);
                    }
                }, 100);
            }

            showToast(`"${item.title}" atualizada!`, "success");
        });
    }

    // Deletar registro
    const deleteBtn = document.getElementById("delete-btn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            const item = mediaItems.find(m => m.id === selectedItemId);
            if (!item) return;

            if (confirm(`Tem certeza que deseja remover "${item.title}" do acervo?`)) {
                const deleted = await deleteFromSupabase(selectedItemId);

                // Sempre remove localmente, mesmo se Supabase falhar
                mediaItems = mediaItems.filter(m => m.id !== selectedItemId);
                saveData(); // backup local
                closeModals();
                renderApp();
                showToast(`"${item.title}" removida do acervo.`, "info");
            }
        });
    }

    // Fechar modais
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
        btn.addEventListener("click", closeModals);
    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === e.currentTarget) closeModals();
        });
    });

    // Fechar com Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const openModal = document.querySelector(".modal-overlay.open");
            if (openModal) closeModals();
        }
    });
}

// ============================================
//  MODAL DE EDIÇÃO
// ============================================
function openEditModal(item) {
    selectedItemId = item.id;
    lastFocusedElement = document.activeElement;

    const editModalTitle = document.getElementById("edit-modal-title");
    const editReview = document.getElementById("edit-review");
    if (editModalTitle) editModalTitle.textContent = item.title;
    if (editReview) editReview.value = item.review || "";

    const container = document.getElementById("edit-status-container");
    if (!container) return;
    container.innerHTML = "";

    Object.entries(STATUS_CONFIG).forEach(([key, cfg]) => {
        const active = item.status === key;
        const btn = document.createElement("button");
        btn.className = `status-btn ${active ? 'active' : ''}`;
        btn.setAttribute("data-status", key);
        btn.setAttribute("role", "radio");
        btn.setAttribute("aria-checked", active ? "true" : "false");
        btn.textContent = cfg.label;

        if (active) {
            btn.style.background = `${cfg.color}25`;
            btn.style.color = cfg.color;
            btn.style.borderColor = `${cfg.color}88`;
            btn.style.boxShadow = cfg.glow;
        }

        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".status-btn").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-checked", "false");
                b.style.background = "";
                b.style.color = "";
                b.style.borderColor = "";
                b.style.boxShadow = "";
            });

            e.currentTarget.classList.add("active");
            e.currentTarget.setAttribute("aria-checked", "true");
            e.currentTarget.style.background = `${cfg.color}25`;
            e.currentTarget.style.color = cfg.color;
            e.currentTarget.style.borderColor = `${cfg.color}88`;
            e.currentTarget.style.boxShadow = cfg.glow;
        });

        container.appendChild(btn);
    });

    initStarsPicker("edit-stars-picker", item.rating);

    const modal = document.getElementById("edit-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    trapFocus(modal.querySelector(".modal-card"));
}

function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => {
        m.classList.remove("open");
        m.setAttribute("aria-hidden", "true");
    });
    selectedItemId = null;

    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}