// ============================================
//  SUPABASE CONFIGURAÇÃO
// ============================================
const SUPABASE_URL = 'https://niaritlethlmrrpspwow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYXJpdGxldGhsbXJycHNwd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTA4NTIsImV4cCI6MjA5NDY4Njg1Mn0.CTQZNUmjQOSJqc2dv0SnKiZ94tfOdQAqX0flBiKIY0w';

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
//  CONFIGURAÇÕES — CORES PASTEL COZY
// ============================================
const STATUS_CONFIG = {
    progresso: { label: "Em Progresso", color: "#87B4A0", glow: "0 0 10px rgba(135, 180, 160, 0.4)" },
    concluido: { label: "Concluído",    color: "#9B8FD0", glow: "0 0 10px rgba(155, 143, 208, 0.4)" },
    pausado:   { label: "Pausado",      color: "#D4A373", glow: "0 0 10px rgba(212, 163, 115, 0.4)" },
    quero:     { label: "Quero Ver/Ler", color: "#C4B5D4", glow: "0 0 10px rgba(196, 181, 212, 0.4)" }
};

const TYPE_CONFIG = {
    galaxia:  { label: "Galáxia",   icon: "✦", filter: null },
    odisseia: { label: "Jogos",     icon: "◈", filter: "odisseia" },
    grimorio: { label: "Grimórios", icon: "⟁", filter: "grimorio" },
    visao:    { label: "Séries",    icon: "◉", filter: "visao" },
    anime:    { label: "Animes",    icon: "✦", filter: "anime" },
    cinema:   { label: "Filmes",    icon: "▶", filter: "cinema" }
};

const TYPE_LABELS = { odisseia: "Jogo", grimorio: "Livro", visao: "Série", anime: "Anime", cinema: "Filme" };

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
//  SUPABASE CRUD
// ============================================

const FETCH_TIMEOUT = 8000;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

async function loadFromSupabase() {
    if (!supabaseAvailable || !supabaseClient) return null;
    try {
        const { data, error } = await withTimeout(
            supabaseClient.from('media_items').select('*').order('created_at', { ascending: false }),
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

async function saveToSupabase(item) {
    if (!supabaseAvailable || !supabaseClient) {
        console.warn('Supabase indisponível. Salvando apenas localmente.');
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
                    cover_url: item.cover,
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

async function updateInSupabase(id, updates) {
    if (!supabaseAvailable || !supabaseClient) {
        console.warn('Supabase indisponível. Atualizando apenas localmente.');
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
                    cover_url: updates.cover,
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

async function deleteFromSupabase(id) {
    if (!supabaseAvailable || !supabaseClient) {
        console.warn('Supabase indisponível. Removendo apenas localmente.');
        return true;
    }
    try {
        const { error } = await withTimeout(
            supabaseClient.from('media_items').delete().eq('id', id),
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
//  FALLBACK PARA IMAGENS QUEBRADAS — TEMA COZY
// ============================================
function handleImgError(img, title) {
    img.style.display = 'none';
    const wrapper = img.parentElement;
    wrapper.style.background = 'linear-gradient(135deg, rgba(212, 163, 115, 0.15), rgba(155, 143, 208, 0.1))';
    const fallback = document.createElement('div');
    fallback.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:rgba(74,62,61,0.3);font-size:13px;font-family:"Nunito",sans-serif;font-weight:700;text-align:center;padding:16px;letter-spacing:0.02em';
    fallback.textContent = title;
    wrapper.appendChild(fallback);
}

// ============================================
//  INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticação
    const session = localStorage.getItem('angelnessa_session') || sessionStorage.getItem('angelnessa_session');
    if (!session) {
        window.location.href = 'login.html?from=logout';
        return;
    }
    try {
        const data = JSON.parse(session);
        if (!data.loggedIn || (Date.now() - data.timestamp) > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('angelnessa_session');
            sessionStorage.removeItem('angelnessa_session');
            window.location.href = 'login.html?from=logout';
            return;
        }
    } catch(e) {
        window.location.href = 'login.html?from=logout';
        return;
    }

    generateParticles();
    generateStars();
    await loadData();
    setupEventListeners();
    renderApp();
});

function generateParticles() {
    const field = document.getElementById("particle-field");
    if (!field) return;
    const fragment = document.createDocumentFragment();
    const colors = ['rgba(212, 163, 115, 0.3)', 'rgba(135, 180, 160, 0.25)', 'rgba(196, 181, 212, 0.25)', 'rgba(255, 255, 255, 0.4)'];
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

async function loadData() {
    let loaded = false;
    const supabaseData = await loadFromSupabase();
    if (supabaseData && supabaseData.length > 0) {
        mediaItems = supabaseData.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            genre: item.genre,
            cover: item.cover_url || item.cover,
            status: item.status,
            rating: item.rating,
            review: item.review
        }));
        showToast('Dados carregados da nuvem ☁️', 'success');
        loaded = true;
    }
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
    if (!loaded) {
        mediaItems = [];
        showToast('Seu acervo está vazio. Adicione sua primeira obra! ✨', 'info');
    }
    saveData();
}

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
    const countAnime = document.getElementById("count-anime");
    const countAnime = document.getElementById("count-anime");
    const countCinema = document.getElementById("count-cinema");
    if (countGalaxia) countGalaxia.textContent = `${mediaItems.length} itens`;
    if (countOdisseia) countOdisseia.textContent = `${mediaItems.filter(m => m.type === "odisseia").length} itens`;
    if (countGrimorio) countGrimorio.textContent = `${mediaItems.filter(m => m.type === "grimorio").length} itens`;
    if (countVisao) countVisao.textContent = `${mediaItems.filter(m => m.type === "visao").length} itens`;
    if (countAnime) countAnime.textContent = `${mediaItems.filter(m => m.type === "anime").length} itens`;
    if (countAnime) countAnime.textContent = `${mediaItems.filter(m => m.type === "anime").length} itens`;
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
            row.innerHTML = `<span style="color: rgba(74,62,61,0.5)">${cfg.label}</span><span style="color: ${cfg.color}; font-weight: 700">${count}</span>`;
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
                <div class="no-data-icon">${TYPE_CONFIG[currentFilter].icon}</div>
                <p class="no-data-title">O acervo aguarda suas histórias...</p>
                <p class="no-data-hint">Clique em "Nova Obra" para começar</p>
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
            <img src="${escapeHtml(item.cover)}" alt="Capa de ${escapeHtml(item.title)}" loading="lazy" onerror="handleImgError(this, '${escapeHtml(item.title).replace(/'/g, "\\'")}')">
            <div class="cover-mask"></div>
            <span class="media-type-badge">${TYPE_LABELS[item.type]}</span>
        </div>
        <div class="card-info">
            <h3>${escapeHtml(item.title)}</h3>
            <p class="genre">${escapeHtml(item.genre)}</p>
            <div class="card-meta">
                ${starsHtml}
                <span class="status-tag" data-status="${item.status}" style="color: ${statusCfg.color}; border: 1px solid ${statusCfg.color}44; background: ${statusCfg.color}15">
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
        html += `<span class="star-icon ${i <= rating ? 'filled' : ''}" aria-hidden="true">&#9733;</span>`;
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
    let isHovering = false;

    function renderStars(displayRating, hoverMode) {
        container.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            const isFilled = i <= displayRating;
            star.className = `star-icon ${isFilled ? 'filled' : ''}`;
            star.innerHTML = "&#9733;";
            star.setAttribute("role", "radio");
            star.setAttribute("aria-checked", isFilled ? "true" : "false");
            star.setAttribute("aria-label", `${i} estrela${i > 1 ? 's' : ''}`);
            star.setAttribute("tabindex", "0");
            star.setAttribute("data-value", i);

            // Hover: visualização temporária
            star.addEventListener("mouseenter", () => {
                isHovering = true;
                renderStars(i, true);
            });

            // Click: define rating definitivo
            star.addEventListener("click", (e) => {
                e.stopPropagation();
                currentRating = i;
                container.setAttribute("data-rating", currentRating);
                isHovering = false;
                renderStars(currentRating, false);
                // Animação de confirmação
                star.style.transform = 'scale(1.4)';
                setTimeout(() => { star.style.transform = ''; }, 200);
            });

            // Keyboard support
            star.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    currentRating = i;
                    container.setAttribute("data-rating", currentRating);
                    renderStars(currentRating, false);
                }
            });

            container.appendChild(star);
        }
    }

    // Mouse leave: volta pro rating salvo
    container.addEventListener("mouseleave", () => {
        if (isHovering) {
            isHovering = false;
            renderStars(currentRating, false);
        }
    });

    container.setAttribute("data-rating", currentRating);
    renderStars(currentRating, false);
}

// ============================================
//  FOCUS TRAP PARA MODAIS
// ============================================
function trapFocus(modalElement) {
    const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
            const savedItem = await saveToSupabase(newItem);
            if (savedItem) {
                mediaItems.push({
                    id: savedItem.id,
                    title: savedItem.title,
                    genre: savedItem.genre,
                    cover: savedItem.cover_url || savedItem.cover,
                    type: savedItem.type,
                    status: savedItem.status,
                    rating: savedItem.rating,
                    review: savedItem.review
                });
            } else {
                const localId = Date.now() + Math.floor(Math.random() * 1000);
                mediaItems.push({ id: localId, title, genre, cover, type, status, rating, review });
            }
            saveData();
            closeModals();
            renderApp();
            showToast(`"${title}" catalogada com sucesso!`, "success");
        });
    }

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
                item.status = newStatus;
                item.rating = updates.rating;
                item.review = updates.review;
            }
            saveData();
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

    const deleteBtn = document.getElementById("delete-btn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            const item = mediaItems.find(m => m.id === selectedItemId);
            if (!item) return;
            if (confirm(`Tem certeza que deseja remover "${item.title}" do acervo?`)) {
                await deleteFromSupabase(selectedItemId);
                mediaItems = mediaItems.filter(m => m.id !== selectedItemId);
                saveData();
                closeModals();
                renderApp();
                showToast(`"${item.title}" removida do acervo.`, "info");
            }
        });
    }

    document.querySelectorAll(".close-modal-btn").forEach(btn => {
        btn.addEventListener("click", closeModals);
    });
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === e.currentTarget) closeModals();
        });
    });
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
            btn.style.background = `${cfg.color}20`;
            btn.style.color = cfg.color;
            btn.style.borderColor = `${cfg.color}60`;
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
            e.currentTarget.style.background = `${cfg.color}20`;
            e.currentTarget.style.color = cfg.color;
            e.currentTarget.style.borderColor = `${cfg.color}60`;
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
