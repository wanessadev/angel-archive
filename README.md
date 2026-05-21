# 🌌✨ Angel Archive — Meu Cantinho Cósmico de Mídias 🌟🌙

<p align="center">
  <img src="https://64.media.tumblr.com/e2311217287e981d94960a9373ff2e8f/6c4e04c0a07fb808-fb/s1280x1920/2ce70205f49b5ff2d90462a0569b2927b09a73a0.gif" width="300" alt="Angel Archive Logo Cósmica">
</p>

<p align="center">
  <b>Bem-vinda à nossa constelação de histórias! 💫</b><br>
  O <b>Angel Archive</b> é um grimório digital e imersivo feito para guardar e catalogar todas as minhas mídias favoritas: joguinhos mágicos, livros, animes/séries e filmes! 🎬🔮🎮
</p>

<img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-11CAA0?style=for-the-badge&logoColor=white" />

---

## 🔮✨ Magias do Nosso Sistema (Funcionalidades)

* **🛸 Catalogação nas Estrelas:** Adicione novas entradas no acervo com título, gênero, uma fotinha de capa linda, tipo de mídia e as minhas impressões pessoais.
* **🪐 Navegação por Galáxias:** Uma sidebar mágica para filtrar o feed e navegar pelas suas categorias favoritas: *Galáxia* (tudo junto!), *Jogos* (minhas odisseias), *Grimórios* (meus livrinhos), *Séries* ou *Filmes*.
* **⭐ Avaliação Estelar:** Um sistema super fofo de dar estrelinhas brilhantes ($\u10022$) para as obras, com direito a efeito de hover e suporte por teclado!
* **🌌 Aurora e Nebulosas Vivas:** Um fundo cósmico animado em CSS com camadas de nebulosas flutuantes, aurora boreal ondulante e estrelas que piscam de verdade enquanto você navega.
* **📂 Janela Estilo Notebook Retro/Y2K:** Uma interface com bordinhas arredondadas, efeito *Glassmorphism* (translúcido) e controles de janela coloridos que dão um toque super nostálgico e fofo.

---

## 🛠️ 🪐 Elementos Místicos (Tecnologias)

Para dar vida a esse universo, usamos as melhores poções de desenvolvimento web:

* **🌸 HTML5:** Estrutura semântica com tags de acessibilidade (Focus Trap nos modais) para que nenhum viajante espacial se perca.
* **🎨 CSS3 Avançado:** Onde a mágica visual acontece! Usamos `@keyframes` para o fundo respirar, variáveis de escopo (`--duration`) para as estrelas piscarem em tempos diferentes e filtros de blur para o efeito de vidro.
* **✨ JavaScript Puro (ES6+):** O coração do site, cuidando de toda a lógica dos modais, renderização dos cards na tela e interações.
* **🟢 Supabase & PostgreSQL (Nuvem):** A nossa grande evolução! Agora os dados não ficam presos no navegador. Eles viajam na velocidade da luz até um banco de dados real na nuvem, salvando tudo de forma eterna.

---

## 📊 ☄️ O Mapa das Constelações (Estrutura do Banco de Dados)

Nossa tabela `medias` no Supabase organiza as obras de forma mágica em linhas e colunas:

| Ícone | Coluna | Tipo | O que ela guarda? 🌸 |
| :---: | :--- | :--- | :--- |
| 🆔 | `id` | `int8` | O número identificador único e mágico gerado pelo banco. |
| 📅 | `created_at` | `timestamptz` | O momento exato em que a mídia entrou na nossa galáxia. |
| 👑 | `title` | `text` | O nome da obra maravilhosa. |
| 🌌 | `type` | `text` | A categoria (odisseia, grimorio, visao, cinema). |
| 🏷️ | `genre` | `text` | O gênero (RPG, Sci-Fi, Shonen, Romance...). |
| 🖼️ | `cover` | `text` | O link da capa para deixar o card bem lindo. |
| 🔋 | `status` | `text` | Se estou lendo/jogando, se já concluí ou se quero ver. |
| ⭐ | `rating` | `int4` | Minha nota de 0 a 5 estrelinhas reluzentes. |
| ✍️ | `review` | `text` | Minhas resenhas, desabafos e pensamentos sobre a obra. |

---

## 🚀 🛸 Como Viajar por Esse Universo Localmente

1. Abra o seu terminal espacial e clone o repositório:
