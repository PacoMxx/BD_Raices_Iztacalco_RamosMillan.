/**
 * ============================================================================
 * ARCHIVO CENTRAL: app.js — RAÍCES DE IZTACALCO (EDICIÓN GABRIEL RAMOS MILLÁN)
 * ============================================================================
 */

// 1. TU URL DE GOOGLE APPS SCRIPT:
const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz_yuI8WhbZFM79eoLqJhRfB5C9fAAMRb896IVKb9nHHKzX_AIK4u2RUR9k6jvm6Je7dA/exec";

// 2. TU WHATSAPP DE ADMINISTRADOR:
const ADMIN_WHATSAPP = "5510803153";

const MP_LINKS = {
  SUSCRIPCION_PRO_199: { title: "Suscripción Mensual Pro", amount: "$199 MXN / mes", url: "https://mpago.la/259su4B" },
  TIANGUIS_39: { title: "Anuncio Destacado Tianguis", amount: "$39 MXN", url: "https://mpago.la/1AWbVzE" },
  VACANTE_100: { title: "Publicación de Vacante", amount: "$100 MXN", url: "https://mpago.la/32DNrnt" },
  BOOST_50: { title: "Boost Mascota Perdida", amount: "$50 MXN", url: "https://mpago.la/2UZYU9q" }
};

if (typeof tailwind !== "undefined") {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          papel: '#FBF8F3', crema: '#F3EDE2', tinta: '#1C1917', grafito: '#57534E',
          terracota: '#9B2C2C', terracotaDark: '#742A2A', maiz: '#D97706',
          chinampa: '#15803D', chinampaLight: '#DCFCE7', borde: '#E5DEC9'
        },
        fontFamily: {
          serif: ['Fraunces', 'Georgia', 'serif'],
          sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'monospace']
        }
      }
    }
  };
}

let currentSector = localStorage.getItem('raices_sector') || 'TODOS';
let searchQuery = '';
const businessCarts = {};
let sheetsAlreadySynced = false;

function sanitizeHTML(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').trim();
}

function cleanDisplayField(val, fallback) {
  const s = String(val || '').trim();
  if (!s || s.startsWith('data:image')) return fallback || '';
  return s;
}

const DB = {
  ticker: "🎸 Concierto en Estadio GNP (20:30 h): Tráfico pesado en Río Churubusco y Viaducto • ⛺ Tianguis Hoy: Sur 163 (Mercado Bramadero).",
  patrocinadorTicker: "Servicio Mecánico Hnos. Pérez (Sur 157)",
  noticias: [],
  cronicas: [],
  negocios: [
    {
      id: 'neg1',
      nombre: 'Carnitas y Chicharrón "El Patrón del Bramadero"',
      giro: 'Comida y Antojitos',
      sector: 'Bramadero',
      calle: 'Sur 163 casi esq. Oriente 108 (Junto al Mercado Bramadero)',
      anioFundacion: 1994,
      plan: 'PRO',
      cupon: '🎁 OFERTA DEL JUEVES Y VIERNES: 1/2 litro de salsa de habanero y nopales gratis al pedir 1 kg de carnitas.',
      historia: 'Más de 30 años preparando carnitas estilo Michoacán en cazo de cobre.',
      foto: '',
      whatsapp: '5512345678',
      catalogo: [
        { nombre: '1 Kg de Carnitas Surtidas', precio: 290 },
        { nombre: '1/2 Kg de Carnitas + Tortillas', precio: 155 }
      ]
    }
  ],
  tianguis: [],
  mascotas: [],
  oficios: [],
  empleos: []
};

async function syncWithGoogleSheets() {
  if (!GOOGLE_SHEETS_WEBAPP_URL || sheetsAlreadySynced) return;
  try {
    const sep = GOOGLE_SHEETS_WEBAPP_URL.includes('?') ? '&' : '?';
    const res = await fetch(`${GOOGLE_SHEETS_WEBAPP_URL}${sep}t=${Date.now()}`, { redirect: 'follow' });
    const data = await res.json();
    sheetsAlreadySynced = true;

    if (Array.isArray(data.publicaciones)) {
      data.publicaciones.forEach(pub => {
        const cat = String(pub.categoria || '').trim().toUpperCase();
        const fotoOk = (pub.foto && String(pub.foto).startsWith('data:image')) ? pub.foto : '';
        const tituloOk = cleanDisplayField(pub.titulo, 'Publicación Vecinal');
        const subdatoOk = cleanDisplayField(pub.subdato, 'Col. Gabriel Ramos Millán');
        const detallesOk = cleanDisplayField(pub.detalles, '');

        if (cat === 'NOTICIA') {
          DB.noticias.unshift({ id: pub.id, titulo: tituloOk, sector: pub.sector || 'Bramadero', ubicacion: subdatoOk, descripcion: detallesOk, fecha: pub.fecha || 'Hoy', foto: fotoOk });
        } else if (cat === 'FOTO_HISTORIA') {
          DB.cronicas.unshift({ id: pub.id, titulo: tituloOk, categoria: '📷 MEMORIA VECINAL', sector: pub.sector || 'Bramadero', fecha: pub.fecha || 'Reciente', autor: subdatoOk, contenidoCompleto: detallesOk, foto: fotoOk, patrocinado: false });
        } else if (cat === 'MASCOTA') {
          const esBoost = String(pub.modalidad).includes('Boost');
          DB.mascotas.unshift({ id: pub.id, tipo: esBoost ? '🔥 PERDIDO • BOOST URGENTE ACTIVO' : '🐾 REPORTE VECINAL', nombre: tituloOk, sector: pub.sector || 'Bramadero', calle: subdatoOk, descripcion: detallesOk, foto: fotoOk, destacado: esBoost, whatsapp: pub.whatsapp || ADMIN_WHATSAPP });
        } else if (cat === 'OFICIO') {
          DB.oficios.unshift({ id: pub.id, oficio: tituloOk, sector: pub.sector || 'Bramadero', calle: subdatoOk, garantia: detallesOk, foto: fotoOk, whatsapp: pub.whatsapp || ADMIN_WHATSAPP });
        } else if (cat === 'EMPLEO') {
          DB.empleos.unshift({ id: pub.id, puesto: tituloOk, sector: pub.sector || 'Bramadero', negocio: subdatoOk, requisitos: detallesOk, foto: fotoOk, whatsapp: pub.whatsapp || ADMIN_WHATSAPP });
        } else if (cat === 'TIANGUIS') {
          DB.tianguis.unshift({ id: pub.id, producto: tituloOk, sector: pub.sector || 'Bramadero', puntoEntrega: subdatoOk, destacado: String(pub.modalidad).includes('Destacado'), descripcion: detallesOk, foto: fotoOk, whatsapp: pub.whatsapp || ADMIN_WHATSAPP });
        } else if (cat === 'NEGOCIO') {
          DB.negocios.unshift({ id: pub.id, nombre: tituloOk, giro: 'Comercio y Servicios', sector: pub.sector || 'Bramadero', calle: subdatoOk, anioFundacion: 2020, plan: String(pub.modalidad).includes('Pro') ? 'PRO' : 'BASICO', cupon: detallesOk || 'Promoción vecinal', historia: 'Comercio local.', foto: fotoOk, whatsapp: pub.whatsapp || ADMIN_WHATSAPP, catalogo: [{ nombre: 'Servicio general', precio: 100 }] });
        }
      });
    }

    if (typeof window.onPageRender === 'function') window.onPageRender();
  } catch (err) {
    console.warn('Modo local activo:', err);
  }
}

function openPhotoLightbox(src, caption) {
  if (!src) return;
  let modal = document.getElementById('global-photo-lightbox');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-photo-lightbox';
    modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4';
    modal.onclick = () => modal.classList.add('hidden');
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onclick="event.stopPropagation()">
      <div class="relative bg-stone-950 flex items-center justify-center max-h-[75vh]">
        <img src="${src}" alt="${sanitizeHTML(caption)}" class="max-h-[75vh] w-auto object-contain" />
        <button onclick="document.getElementById('global-photo-lightbox').classList.add('hidden')" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white font-bold text-base flex items-center justify-center hover:bg-black">✕</button>
      </div>
      <div class="p-4 bg-papel flex items-center justify-between gap-2">
        <p class="text-xs sm:text-sm font-bold text-tinta">${sanitizeHTML(caption || 'Fotografía vecinal')}</p>
        <button onclick="document.getElementById('global-photo-lightbox').classList.add('hidden')" class="px-3 py-1 rounded-lg bg-tinta text-white text-xs font-bold shrink-0">Cerrar</button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
}

function renderSharedLayout(activePage) {
  // Barra de navegación idéntica a tu captura para todas las páginas independientes
  const navItems = [
    { id: 'inicio', label: '🏠 Portada', href: 'index.html' },
    { id: 'noticias', label: '🗞️ Noticias', href: 'noticias.html' },
    { id: 'cronicas', label: '📷 Crónicas', href: 'cronicas.html' },
    { id: 'comercio', label: '🏪 Comercio', href: 'comercio.html' },
    { id: 'tianguis', label: '🛍️ Tianguis', href: 'tianguis.html' },
    { id: 'mascotas', label: '🐾 Mascotas', href: 'mascotas.html' },
    { id: 'oficios', label: '🛠️ Oficios', href: 'oficios.html' },
    { id: 'empleos', label: '💼 Empleos', href: 'empleos.html' },
    { id: 'guia', label: '📖 Guía', href: 'guia.html' }
  ];

  const nowStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const headerContainer = document.getElementById('shared-header');

  if (headerContainer) {
    headerContainer.innerHTML = `
      <!-- Monitor Vial Exclusivo en la Portada -->
      ${activePage === 'inicio' ? `
        <div class="bg-tinta text-papel text-xs border-b border-stone-800 sticky top-0 z-40">
          <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
              <span class="font-mono uppercase text-[11px] bg-red-600 text-white px-2 py-0.5 rounded font-bold shrink-0">RADAR VIAL HOY</span>
              <span id="ticker-text" class="text-stone-200 font-medium">${DB.ticker}</span>
            </div>
            <a href="comercio.html" class="hidden md:inline text-[11px] text-amber-300 font-mono hover:underline shrink-0">
              Patrocinado por: <strong>${DB.patrocinadorTicker}</strong>
            </a>
          </div>
        </div>
      ` : ''}

      <header class="bg-papel/95 backdrop-blur-md border-b border-borde">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-borde text-xs text-grafito">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="index.html" class="font-mono uppercase font-bold text-terracota bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                ALCALDÍA IZTACALCO • CDMX
              </a>
              <span class="capitalize font-medium">${nowStr}</span>
            </div>
            <div class="flex items-center gap-2">
              <a href="guia.html" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 font-bold text-xs transition">📖 Guía Vecinal</a>
              <a href="anunciate.html" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-terracota hover:bg-terracotaDark text-white font-bold text-xs shadow transition">➕ Publicar</a>
            </div>
          </div>

          <!-- TÍTULO Y ENCABEZADOS FIJOS EN TODAS LAS PÁGINAS -->
          <div class="py-4 text-center">
            <a href="index.html" class="inline-block group">
              <p class="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-terracota font-bold mb-1">
                « PERIÓDICO COMUNITARIO Y COMERCIO DE BARRIO »
              </p>
              <h1 class="font-serif text-3xl sm:text-5xl font-extrabold text-tinta group-hover:text-terracota transition">
                Raíces de Iztacalco
              </h1>
            </a>
            <p class="mt-1 text-xs sm:text-sm text-grafito font-medium">
              Edición Hiperlocal: <strong class="text-tinta">Col. Gabriel Ramos Millán</strong> (Bramadero · Tlacotal · Cuchilla · Av. Té · Coyuya)
            </p>
          </div>

          <!-- Filtro Global por Sector -->
          <div class="border-t-2 border-b border-tinta py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
              <span class="text-xs font-mono uppercase font-bold text-tinta shrink-0 mr-1">📍 Sector:</span>
              ${['TODOS', 'Bramadero', 'Tlacotal', 'Cuchilla', 'Av. Té / Alcaldía', 'Coyuya / Plutarco'].map(sec => `
                <button onclick="changeGlobalSector('${sec}')" class="px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${currentSector === sec ? 'bg-terracota text-white' : 'bg-crema text-tinta hover:bg-stone-200'}">
                  ${sec === 'TODOS' ? 'Toda la Ramos Millán' : sec}
                </button>
              `).join('')}
            </div>
            <div class="relative w-full sm:w-56 shrink-0">
              <input oninput="changeGlobalSearch(this.value)" type="search" placeholder="Buscar en esta sección..." class="w-full pl-7 pr-3 py-1 text-xs bg-white border border-borde rounded-full focus:outline-none focus:border-terracota text-tinta" />
              <span class="absolute left-2.5 top-1 text-xs text-stone-400">🔍</span>
            </div>
          </div>

          <!-- Barra de Navegación Estilo Imagen con Botón Rojo de Publicar -->
          <nav class="hidden lg:flex items-center justify-center flex-wrap gap-1 pt-3 pb-1" aria-label="Páginas del periódico">
            ${navItems.map(item => {
              const isActive = activePage === item.id;
              return `
                <a href="${item.href}" class="px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition ${isActive ? 'text-terracota font-extrabold bg-crema/70' : 'text-grafito hover:text-tinta font-semibold'}">
                  <span>${item.label}</span>
                </a>
              `;
            }).join('')}
            <a href="anunciate.html" class="ml-2 px-4 py-2 rounded-lg bg-terracota hover:bg-terracotaDark text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition">
              <span>➕ Publicar</span>
            </a>
          </nav>
        </div>
      </header>
    `;
  }

  const footerContainer = document.getElementById('shared-footer');
  if (footerContainer) {
    footerContainer.innerHTML = `
      <footer class="bg-tinta text-stone-300 border-t border-stone-800 mt-14 pb-20 lg:pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span class="font-mono text-[11px] uppercase tracking-widest text-amber-400 font-bold">RAÍCES DE IZTACALCO</span>
              <h4 class="font-serif text-xl font-bold text-white mt-1">Edición Gabriel Ramos Millán</h4>
              <p class="text-xs text-stone-400 mt-2 leading-relaxed">
                Periódico digital comunitario y directorio de comercio local sin comisiones.
              </p>
            </div>
            <div>
              <h5 class="font-mono text-xs uppercase font-bold text-white mb-2">Secciones Independientes</h5>
              <ul class="text-xs text-stone-300 space-y-1.5">
                <li><a href="noticias.html" class="hover:text-amber-300">🗞️ Noticias Vecinales</a></li>
                <li><a href="cronicas.html" class="hover:text-amber-300">📷 Crónicas y Raíces</a></li>
                <li><a href="comercio.html" class="hover:text-amber-300">🏪 Comercio de Barrio</a></li>
                <li><a href="tianguis.html" class="hover:text-amber-300">🛍️ Tianguis Digital</a></li>
                <li><a href="mascotas.html" class="hover:text-amber-300">🐾 Radar de Mascotas</a></li>
                <li><a href="oficios.html" class="hover:text-amber-300">🛠️ El Oficio Verificado</a></li>
                <li><a href="empleos.html" class="hover:text-amber-300">💼 Bolsa de Trabajo</a></li>
              </ul>
            </div>
            <div class="p-4 rounded-xl bg-stone-900 border border-stone-700">
              <h5 class="font-mono text-xs uppercase font-bold text-amber-400 mb-1.5">🛡️ Seguridad Vecinal</h5>
              <p class="text-[11px] text-stone-300 leading-relaxed">
                Acuerda tratos únicamente en puntos públicos seguros. Nunca deposites por adelantado a desconocidos.
              </p>
            </div>
          </div>
          <div class="pt-4 border-t border-stone-800 text-center text-[11px] text-stone-400">
            © 2026 Raíces de Iztacalco — Col. Gabriel Ramos Millán, CDMX.
          </div>
        </div>
      </footer>

      <!-- Barra Inferior Móvil -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-borde z-40 px-1 py-1 shadow-lg">
        <div class="grid grid-cols-5 gap-1 max-w-lg mx-auto text-center text-[10px]">
          <a href="index.html" class="py-1 ${activePage === 'inicio' ? 'text-terracota font-extrabold' : 'text-grafito'}">🏠 Inicio</a>
          <a href="noticias.html" class="py-1 ${activePage === 'noticias' ? 'text-terracota font-extrabold' : 'text-grafito'}">🗞️ Noticias</a>
          <a href="comercio.html" class="py-1 ${activePage === 'comercio' ? 'text-terracota font-extrabold' : 'text-grafito'}">🏪 Comercio</a>
          <a href="mascotas.html" class="py-1 ${activePage === 'mascotas' ? 'text-terracota font-extrabold' : 'text-grafito'}">🐾 Mascotas</a>
          <a href="anunciate.html" class="py-1 ${activePage === 'anunciate' ? 'text-terracota font-extrabold' : 'text-grafito'}">➕ Publicar</a>
        </div>
      </nav>
    `;
  }

  syncWithGoogleSheets();
}

function changeGlobalSector(sec) {
  currentSector = sec;
  localStorage.setItem('raices_sector', sec);
  const currentPageId = document.body.getAttribute('data-page') || 'inicio';
  renderSharedLayout(currentPageId);
  if (typeof window.onPageRender === 'function') window.onPageRender();
}

function changeGlobalSearch(val) {
  searchQuery = val.trim();
  if (typeof window.onPageRender === 'function') window.onPageRender();
}

function matchesGlobalFilter(itemSector, textBlob) {
  const secOk = (currentSector === 'TODOS') || (itemSector === currentSector);
  const qOk = !searchQuery || textBlob.toLowerCase().includes(searchQuery.toLowerCase());
  return secOk && qOk;
}

function openWhatsAppDirect(phone, text) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  window.open(`https://wa.me/52${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

function shareOnWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`, '_blank', 'noopener,noreferrer');
}
