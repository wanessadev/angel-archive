// ============================================
//  SUPABASE CONFIGURAÇÃO
// ============================================
const SUPABASE_URL = 'https://niaritlethlmrrpspwow.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lPmzjwPVaE9U08Jn8SSf4Q_GzTvKUiA';

console.log('🔍 [DIAGNÓSTICO] Iniciando carregamento...');
console.log('🔍 [DIAGNÓSTICO] SUPABASE_URL:', SUPABASE_URL);
console.log('🔍 [DIAGNÓSTICO] SUPABASE_KEY (primeiros 20 chars):', SUPABASE_KEY.substring(0, 20) + '...');

let supabaseClient = null;
let supabaseAvailable = false;

console.log('🔍 [DIAGNÓSTICO] typeof supabase:', typeof supabase);
console.log('🔍 [DIAGNÓSTICO] supabase.createClient existe?', typeof supabase !== 'undefined' && supabase.createClient ? 'SIM ✅' : 'NÃO ❌');

try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        supabaseAvailable = true;
        console.log('✅ [DIAGNÓSTICO] Supabase client CRIADO com sucesso');
    } else {
        console.error('❌ [DIAGNÓSTICO] Biblioteca Supabase não carregada! Modo offline ativado.');
    }
} catch (e) {
    console.error('❌ [DIAGNÓSTICO] Erro ao inicializar Supabase:', e);
    supabaseAvailable = false;
}

// ============================================
//  CONFIGURAÇÕES DO COFRE CÓSMICO
// ============================================
// 🧹 ACERVO COMEÇA VAZIO — sem dados de exemplo!

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
//  SUPABASE CRUD — COM DIAGNÓSTICO DETALHADO
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
    console.log('🔍 [DIAGNÓSTICO] Tentando carregar do Supabase...');

    if (!supabaseAvailable || !supabaseClient) {
        console.warn('❌ [DIAGNÓSTICO] Supabase indisponível. Pulando carregamento da nuvem.');
        return null;
    }

    try {
        console.log('🔍 [DIAGNÓSTICO] Executando: supabase.from("media_items").select("*")');

        const { data, error } = await withTimeout(
            supabaseClient
                .from('media_items')
                .select('*')
                .order('created_at', { ascending: false }),
            FETCH_TIMEOUT
        );

        if (error) {
            console.error('❌ [DIAGNÓSTICO] Erro Supabase ao carregar:', error);
            console.error('💡 [DIAGNÓSTICO] Código:', error.code);
            console.error('💡 [DIAGNÓSTICO] Mensagem:', error.message);
            console.error('💡 [DIAGNÓSTICO] Possíveis causas:');
            console.error('   - RLS (Row Level Security) bloqueando SELECT');
            console.error('   - Tabela "media_items" não existe');
            console.error('   - Sem permissão de leitura');
            return null;
        }

        console.log('✅ [DIAGNÓSTICO] Dados carregados do Supabase:', data ? data.length : 0, 'itens');
        if (data && data.length > 0) {
            console.log('🔍 [DIAGNÓSTICO] Primeiro item:', data[0]);
        }

        return data || [];
    } catch (e) {
        console.error('❌ [DIAGNÓSTICO] Falha na conexão Supabase:', e.message || e);
        return null;
    }
}

// Salvar nova mídia no Supabase
async function saveToSupabase(item) {
    console.log('🔍 [DIAGNÓSTICO] === TENTANDO SALVAR NO SUPABASE ===');
    console.log('🔍 [DIAGNÓSTICO] Item:', item);

    if (!supabaseAvailable || !supabaseClient) {
        console.warn('❌ [DIAGNÓSTICO] Supabase indisponível. Salvando apenas localmente.');
        return null;
    }

    try {
        const payload = {
            title: item.title,
            type: item.type,
            genre: item.genre,
            cover_url: item.cover,
            status: item.status,
            rating: item.rating,
            review: item.review
        };
        console.log('🔍 [DIAGNÓSTICO] Payload para INSERT:', payload);

        const { data, error } = await withTimeout(
            supabaseClient
                .from('media_items')
                .insert([payload])
                .select()
                .single(),
            FETCH_TIMEOUT
        );

        if (error) {
            console.error('❌ [DIAGNÓSTICO] Erro ao SALVAR no Supabase:', error);
            console.error('💡 [DIAGNÓSTICO] Código:', error.code);
            console.error('💡 [DIAGNÓSTICO] Mensagem:', error.message);
            console.error('💡 [DIAGNÓSTICO] Detalhes:', error.details);
            console.error('💡 [DIAGNÓSTICO] Hint:', error.hint);
            console.error('💡 [DIAGNÓSTICO] Possíveis causas:');
            console.error('   - RLS bloqueando INSERT');
            console.error('   - Coluna não existe (verifique se é cover_url ou cover)');
            console.error('   - Tipo de dado incorreto');
            console.error('   - NOT NULL violation');
            showToast('Erro ao salvar na nuvem', 'error');
            return null;
        }

        console.log('✅ [DIAGNÓSTICO] Item SALVO no Supabase! ID:', data.id);
        console.log('✅ [DIAGNÓSTICO] Dados retornados:', data);
        return data;
    } catch (e) {
        console.error('❌ [DIAGNÓSTICO] Falha ao salvar:', e);
        showToast('Erro de conexão', 'error');
        return null;
    }
}

// Atualizar mídia no Supabase
async function updateInSupabase(id, updates) {
    console.log('🔍 [DIAGNÓSTICO] === TENTANDO ATUALIZAR NO SUPABASE ===');
    console.log('🔍 [DIAGNÓSTICO] ID:', id);
    console.log('🔍 [DIAGNÓSTICO] Updates:', updates);

    if (!supabaseAvailable || !supabaseClient) {
        console.warn('❌ [DIAGNÓSTICO] Supabase indisponível. Atualizando apenas localmente.');
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
            console.error('❌ [DIAGNÓSTICO] Erro ao ATUALIZAR no Supabase:', error);
            console.error('💡 [DIAGNÓSTICO] Código:', error.code);
            console.error('💡 [DIAGNÓSTICO] Mensagem:', error.message);
            showToast('Erro ao atualizar na nuvem', 'error');
            return null;
        }

        console.log('✅ [DIAGNÓSTICO] Item ATUALIZADO no Supabase! ID:', data.id);
        return data;
    } catch (e) {
        console.error('❌ [DIAGNÓSTICO] Falha ao atualizar:', e);
        showToast('Erro de conexão', 'error');
        return null;
    }
}

// Deletar mídia do Supabase
async function deleteFromSupabase(id) {
    console.log('🔍 [DIAGNÓSTICO] === TENTANDO DELETAR DO SUPABASE ===');
    console.log('🔍 [DIAGNÓSTICO] ID:', id);

    if (!supabaseAvailable || !supabaseClient) {
        console.warn('❌ [DIAGNÓSTICO] Supabase indisponível. Removendo apenas localmente.');
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
            console.error('❌ [DIAGNÓSTICO] Erro ao DELETAR do Supabase:', error);
            console.error('💡 [DIAGNÓSTICO] Código:', error.code);
            console.error('💡 [DIAGNÓSTICO] Mensagem:', error.message);
            showToast('Erro ao remover da nuvem', 'error');
            return false;
        }

        console.log('✅ [DIAGNÓSTICO] Item DELETADO do Supabase! ID:', id);
        return true;
    } catch (e) {
        console.error('❌ [DIAGNÓSTICO] Falha ao deletar:', e);
        showToast('Erro de conexão', 'error');
        return false;
    }
}

// ============================================
//  INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    console.log('🔍 [DIAGNÓSTICO] DOM carregado. Iniciando app...');
    generateParticles();
    generateStars();
    await loadData();
    setupEventListeners();
    renderApp();
    console.log('🔍 [DIAGNÓSTICO] App renderizado. Estado final:');
    console.log('   - supabaseAvailable:', supabaseAvailable);
    console.log('   - mediaItems.length:', mediaItems.length);
    console.log('   - currentFilter:', currentFilter);
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
async function loadData() {
    console.log('🔍 [DIAGNÓSTICO] === INÍCIO DO loadData() ===');
    let loaded = false;

    // Tentar Supabase primeiro
    console.log('🔍 [DIAGNÓSTICO] Etapa 1: Tentando carregar do Supabase...');
    const supabaseData = await loadFromSupabase();
    console.log('🔍 [DIAGNÓSTICO] Resultado do Supabase:', supabaseData ? supabaseData.length + ' itens' : 'null/erro');

    if (supabaseData && supabaseData.length > 0) {
        console.log('✅ [DIAGNÓSTICO] Usando dados do Supabase');
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
    } else if (supabaseData && supabaseData.length === 0) {
        console.log('ℹ️ [DIAGNÓSTICO] Supabase retornou array VAZIO (0 itens). Tabela existe mas está vazia.');
    } else {
        console.warn('⚠️ [DIAGNÓSTICO] Supabase retornou null/erro. Indo para fallback...');
    }

    // Fallback: tentar localStorage
    if (!loaded) {
        console.log('🔍 [DIAGNÓSTICO] Etapa 2: Tentando carregar do localStorage...');
        try {
            const saved = localStorage.getItem("celestial-vault-media");
            console.log('🔍 [DIAGNÓSTICO] localStorage key "celestial-vault-media":', saved ? 'ENCONTRADO (' + saved.length + ' chars)' : 'NÃO ENCONTRADO');

            if (saved) {
                mediaItems = JSON.parse(saved);
                console.log('✅ [DIAGNÓSTICO] Dados carregados do localStorage:', mediaItems.length, 'itens');
                showToast('Dados carregados localmente 💾', 'info');
                loaded = true;
            }
        } catch (e) {
            console.warn("⚠️ [DIAGNÓSTICO] Erro ao carregar localStorage:", e);
        }
    }

    // Último fallback: catálogo VAZIO
    if (!loaded) {
        console.log('ℹ️ [DIAGNÓSTICO] Etapa 3: Nenhum dado encontrado. Iniciando com acervo VAZIO.');
        mediaItems = [];
        showToast('Seu acervo está vazio. Adicione sua primeira obra! ✨', 'info');
    }

    // Sempre salva no localStorage como backup
    console.log('🔍 [DIAGNÓSTICO] Salvando backup no localStorage...');
    saveData();
    console.log('🔍 [DIAGNÓSTICO] === FIM DO loadData() ===');
}

// Salvar no localStorage como backup
function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem("celestial-vault-media", JSON.stringify(mediaItems));
            console.log('💾 [DIAGNÓSTICO] Backup local salvo:', mediaItems.length, 'itens');
        } catch (e) {
            console.warn("⚠️ [DIAGNÓSTICO] Erro ao salvar backup local:", e);
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
                <p style="font-size: 12px; color: rgba(255,255,255,0.2)">Clique em "Nova Obra" para começar</p>
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

    // Fallback visual para imagem quebrada
    const imgFallback = `this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, rgba(188,132,238,0.2), rgba(17,202,160,0.1))'; this.parentElement.innerHTML+='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:14px;font-family:Cinzel;text-align:center;padding:10px\'>${escapeHtml(item.title)}</div>'`;

    card.innerHTML = `
        <div class="cover-wrapper">
            <img src="${escapeHtml(item.cover)}" alt="Capa de ${escapeHtml(item.title)}" loading="lazy" onerror="${imgFallback}">
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
            console.log('🔍 [DIAGNÓSTICO] Nova obra para salvar:', newItem);

            // Salvar no Supabase
            const savedItem = await saveToSupabase(newItem);
            console.log('🔍 [DIAGNÓSTICO] Resultado do saveToSupabase:', savedItem ? 'SUCESSO (ID: ' + savedItem.id + ')' : 'FALHA');

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
                console.log('✅ [DIAGNÓSTICO] Item adicionado ao array local com ID do Supabase');
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
                console.log('⚠️ [DIAGNÓSTICO] Item salvo APENAS localmente (modo offline). ID local:', localId);
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

            console.log('🔍 [DIAGNÓSTICO] Atualizando item ID:', selectedItemId, 'com:', updates);
            const updated = await updateInSupabase(selectedItemId, updates);
            console.log('🔍 [DIAGNÓSTICO] Resultado do updateInSupabase:', updated ? 'SUCESSO' : 'FALHA');

            if (updated) {
                item.status = newStatus;
                item.rating = updates.rating;
                item.review = updates.review;
            } else {
                // Modo offline: atualiza localmente mesmo assim
                item.status = newStatus;
                item.rating = updates.rating;
                item.review = updates.review;
                console.log('⚠️ [DIAGNÓSTICO] Atualização salva APENAS localmente');
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
                console.log('🔍 [DIAGNÓSTICO] Deletando item ID:', selectedItemId);
                const deleted = await deleteFromSupabase(selectedItemId);
                console.log('🔍 [DIAGNÓSTICO] Resultado do deleteFromSupabase:', deleted ? 'SUCESSO' : 'FALHA (ou offline)');

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