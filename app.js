const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz_yuI8WhbZFM79eoLqJhRfB5C9fAAMRb896IVKb9nHHKzX_AIK4u2RUR9k6jvm6Je7dA/exec";
const ADMIN_WHATSAPP = "5510803153";

const MP_LINKS = {
  SUSCRIPCION_PRO_199: { title: "Suscripción Mensual Pro", amount: "$199 MXN / mes", url: "https://mpago.la/259su4B" },
  TIANGUIS_39: { title: "Anuncio Destacado Tianguis", amount: "$39 MXN", url: "https://mpago.la/1AWbVzE" },
  VACANTE_100: { title: "Publicación de Vacante", amount: "$100 MXN", url: "https://mpago.la/32DNrnt" },
  BOOST_50: { title: "Boost Mascota Perdida", amount: "$50 MXN", url: "https://mpago.la/2UZYU9q" }
};

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
  negocios: [],
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
          DB.mascotas.unshift({ id: pub.id, tipo: esBoost ? '🔥 PERDIDO • BOOST URGENTE' : '🐾 REPORTE VECINAL', nombre: tituloOk, sector: pub.sector || 'Bramadero', calle: subdatoOk, descripcion: detallesOk, foto: fotoOk, destacado: esBoost, whatsapp: pub.whatsapp || ADMIN_WHATSAPP });
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
