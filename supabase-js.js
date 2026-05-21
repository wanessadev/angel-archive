// ============================================
//  SUPABASE JS LOADER
//  Carrega dinamicamente da CDN para evitar
//  conflitos de merge no repositório
// ============================================

(function() {
    'use strict';

    // Se já existe supabase global, não faz nada
    if (typeof window.supabase !== 'undefined') {
        console.log('Supabase já carregado');
        return;
    }

    // Cria um script element para carregar da CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.async = false; // Carrega síncrono para garantir ordem
    script.onload = function() {
        console.log('Supabase carregado com sucesso da CDN');
    };
    script.onerror = function() {
        console.error('Falha ao carregar Supabase da CDN');
        // Fallback: cria um objeto mock para não quebrar o app
        window.supabase = {
            createClient: function() {
                console.warn('Supabase não disponível - modo offline');
                return null;
            }
        };
    };

    // Insere no head
    document.head.appendChild(script);
})();