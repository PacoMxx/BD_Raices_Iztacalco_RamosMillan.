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
  OFICIO_50: { title: "Anuncio de Oficio Verificado", amount: "$50 MXN", url: "https://mpago.la/2UZYU9q" },
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

const SECTORES_LISTA = ['TODOS', 'Bramadero', 'Tlacotal', 'Cuchilla', 'Av. Té / Alcaldía', 'Coyuya / Plutarco'];

const COORDENADAS_SECTORES = {
  'Bramadero': { lat: 19.3862, lng: -99.0982 },
  'Tlacotal': { lat: 19.3918, lng: -99.1045 },
  'Cuchilla': { lat: 19.3845, lng: -99.0938 },
  'Av. Té / Alcaldía': { lat: 19.3952, lng: -99.0975 },
  'Coyuya / Plutarco': { lat: 19.3885, lng: -99.1105 },
  'TODOS': { lat: 19.3895, lng: -99.1030 }
};

let currentSector = localStorage.getItem('raices_sector') || 'TODOS';
let searchQuery = '';
let searchDebounceTimer = null;
let isSyncing = false;
let forcedDeviceView = sessionStorage.getItem('raices_view_override') || 'auto';
let currentDeviceType = 'desktop';
const businessCarts = {};

/**
 * ============================================================================
 * DETECCIÓN ADAPTATIVA DE DISPOSITIVO (CELULAR, TABLETA Y COMPUTADORA)
 * ============================================================================
 */
function detectRealDeviceType() {
  const ua = navigator.userAgent || '';
  const w = window.innerWidth || document.documentElement.clientWidth || 1024;
  const isIPadOrTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobileUA = /Mobi|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) && !isIPadOrTabletUA;

  if (w < 768 || (isMobileUA && w < 900)) {
    return 'mobile';
  }
  if ((w >= 768 && w < 1024) || (isIPadOrTabletUA && w < 1280)) {
    return 'tablet';
  }
  return 'desktop';
}

function getEffectiveDeviceType() {
  if (forcedDeviceView && forcedDeviceView !== 'auto') {
    return forcedDeviceView;
  }
  return detectRealDeviceType();
}

function applyDeviceViewMode() {
  const prevDevice = currentDeviceType;
  currentDeviceType = getEffectiveDeviceType();
  if (!document.body) return;

  document.body.setAttribute('data-device', currentDeviceType);
  document.body.setAttribute('data-device-mode', forcedDeviceView);

  // Actualizar indicador en barra superior si existe
  const badgeEl = document.getElementById('device-mode-badge');
  if (badgeEl) {
    const labels = {
      desktop: '💻 Vista Web (Computadora)',
      tablet: '📟 Vista Tableta',
      mobile: '📱 Vista Celular'
    };
    badgeEl.textContent = labels[currentDeviceType] || labels.desktop;
  }

  document.querySelectorAll('[data-view-switch]').forEach(btn => {
    const mode = btn.getAttribute('data-view-switch');
    const isActive = (forcedDeviceView === 'auto' && mode === currentDeviceType) || (forcedDeviceView === mode);
    btn.className = isActive
      ? 'px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-bold text-[11px] transition'
      : 'px-2 py-0.5 rounded text-stone-700 hover:bg-stone-200 font-medium text-[11px] transition';
  });

  if (prevDevice !== currentDeviceType && typeof window.onDeviceChange === 'function') {
    window.onDeviceChange(currentDeviceType);
  }
}

function setDeviceViewOverride(mode) {
  forcedDeviceView = mode;
  if (mode === 'auto') {
    sessionStorage.removeItem('raices_view_override');
  } else {
    sessionStorage.setItem('raices_view_override', mode);
  }
  applyDeviceViewMode();
  const currentPageId = document.body.getAttribute('data-page') || 'inicio';
  renderSharedLayout(currentPageId, false);
  if (typeof window.onPageRender === 'function') window.onPageRender();
}

window.addEventListener('resize', () => {
  if (forcedDeviceView === 'auto') {
    const next = detectRealDeviceType();
    if (next !== currentDeviceType) {
      applyDeviceViewMode();
    }
  }
});

/**
 * ============================================================================
 * SANITIZACIÓN Y UTILIDADES SEGURAS (PREVENCIÓN DE XSS Y RUPTURA DE ONCLICK)
 * ============================================================================
 */
function sanitizeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

function encodeDataParam(str) {
  return encodeURIComponent(String(str || '').trim());
}

function decodeDataParam(str) {
  try {
    return decodeURIComponent(str || '');
  } catch (e) {
    return String(str || '');
  }
}

function cleanDisplayField(val, fallback) {
  const s = String(val || '').trim();
  if (!s || s.startsWith('data:image')) return fallback || '';
  return s;
}

/**
 * Normaliza la URL de fotografía proveniente de Google Sheets:
 * - Acepta enlaces de Google Drive (cualquier formato de link o ID) y los convierte a URL directa rápida (lh3.googleusercontent.com)
 * - Acepta URLs https:// estándar
 * - Mantiene compatibilidad hacia atrás con imágenes antiguas en Base64 (data:image/...)
 */
function normalizePhotoUrl(rawFoto) {
  const s = String(rawFoto || '').trim();
  if (!s) return '';
  if (s.startsWith('data:image')) return s;

  // Si es un enlace de Google Drive (/file/d/ID, ?id=ID, /d/ID), extraer el ID para usar el CDN directo de imágenes de Google
  const driveFileMatch = s.match(/(?:\/file\/d\/|\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  return '';
}

function inferirGiroNegocio(texto, giroExplicito) {
  if (giroExplicito && ['Comida y Antojitos', 'Salud y Mascotas', 'Talleres y Tlapalerías', 'Belleza y Barberías'].includes(giroExplicito)) {
    return giroExplicito;
  }
  const t = String(texto || '').toLowerCase();
  if (/taco|carnita|comida|antojito|panader|tortill|postre|cocina|restauran|pizza|tamal|jugo|caf[eé]|pollo/i.test(t)) {
    return 'Comida y Antojitos';
  }
  if (/veterinar|mascota|farmacia|dental|dentista|m[eé]dic|salud|consultorio|[oó]ptica|pod[oó]log/i.test(t)) {
    return 'Salud y Mascotas';
  }
  if (/barber|est[eé]tica|belleza|u[ñn]as|cabello|peluquer|spa/i.test(t)) {
    return 'Belleza y Barberías';
  }
  if (/taller|mec[aá]nic|tlapaler|ferreter|cerraj|plomer|el[eé]ctric|herrer|llant/i.test(t)) {
    return 'Talleres y Tlapalerías';
  }
  return 'Comida y Antojitos';
}

const INITIAL_DATA = {
  noticias: [
    {
      id: 'not_init_1',
      titulo: 'Precaución vial por eventos en Estadio GNP y Palacio de los Deportes',
      sector: 'Coyuya / Plutarco',
      ubicacion: 'Río Churubusco, Añil y Viaducto',
      descripcion: 'Vecinos: tomen precauciones en horario vespertino y nocturno. Se recomienda circular por Sur 157, Oriente 106 y Eje 4 Sur Av. Té.',
      fecha: 'Reporte Diario',
      foto: ''
    },
    {
      id: 'not_init_2',
      titulo: 'Jornada comunitaria e información vecinal en la Gabriel Ramos Millán',
      sector: 'Bramadero',
      ubicacion: 'Explanada y alrededores de Sur 163',
      descripcion: 'Comparte avisos de tu cuadra, mejoras urbanas y reportes comunitarios desde el botón de Publicar.',
      fecha: 'Aviso Vecinal',
      foto: ''
    }
  ],
  cronicas: [
    {
      id: 'cro_init_1',
      titulo: 'El origen de nuestras calles Sur y Oriente en los años 50',
      categoria: '📷 MEMORIA VECINAL',
      sector: 'Bramadero',
      fecha: 'Archivo Histórico',
      autor: 'Vecinos Fundadores',
      contenidoCompleto: 'De las antiguas zanjas chinamperas conectadas al Canal de la Viga hasta convertirse en el corazón comercial de Iztacalco en honor a Gabriel Ramos Millán, el «Apóstol del Maíz».',
      foto: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      patrocinado: false
    }
  ],
  negocios: [
    {
      id: 'neg1',
      nombre: 'Servicio Mecánico Hnos. Pérez',
      giro: 'Talleres y Tlapalerías',
      sector: 'Bramadero',
      calle: 'Sur 157 cerca del Mercado Bramadero',
      anioFundacion: 1998,
      plan: 'PRO',
      cupon: 'Revisión de frenos sin costo al mencionar Raíces de Iztacalco',
      historia: 'Taller mecánico familiar de confianza en la colonia.',
      foto: '',
      whatsapp: ADMIN_WHATSAPP,
      lat: 19.3862,
      lng: -99.0982,
      catalogo: [
        { nombre: 'Afinación y diagnóstico por escáner', precio: 850 },
        { nombre: 'Cambio de balatas y ajuste de frenos', precio: 450 }
      ]
    }
  ],
  tianguis: [
    {
      id: 'tian_init_1',
      producto: 'Bicicleta Urbana R26 en buen estado — $1,650 MXN',
      sector: 'Bramadero',
      puntoEntrega: 'Explanada Alcaldía Iztacalco',
      destacado: true,
      descripcion: 'Recién ajustada de frenos y llantas con media vida. Ideal para moverse por la colonia o hacia el Metro Iztacalco.',
      foto: '',
      whatsapp: ADMIN_WHATSAPP
    }
  ],
  mascotas: [
    {
      id: 'masc_init_1',
      tipo: '🐾 REPORTE VECINAL',
      nombre: 'Campaña permanente de placas e identificación en la Ramos Millán',
      sector: 'Av. Té / Alcaldía',
      calle: 'Explanada Alcaldía Iztacalco y parques de la colonia',
      descripcion: 'Si extraviaste o encontraste una mascota en nuestras calles Sur y Oriente, súbela sin costo en esta sección para activar la alerta entre cuadras.',
      foto: '',
      destacado: false,
      whatsapp: ADMIN_WHATSAPP
    }
  ],
  oficios: [
    {
      id: 'ofi_init_1',
      oficio: 'Plomería, Gas y Destapado de Drenaje',
      nombre: 'Maestro Roberto Hernández',
      sector: 'Tlacotal',
      calle: 'Atención a domicilio en toda la Gabriel Ramos Millán',
      garantia: 'Reparación de fugas de agua y gas, bombas, tinacos y boilers con garantía por escrito para vecinos.',
      calificacion: '4.9 ★',
      foto: '',
      whatsapp: ADMIN_WHATSAPP
    }
  ],
  empleos: [
    {
      id: 'emp_init_1',
      puesto: 'Ayudante General de Mostrador y Atención al Cliente',
      sector: 'Bramadero',
      negocio: 'Comercio Local en Mercado Bramadero',
      sueldo: 'Sueldo semanal competitivo + prestaciones',
      requisitos: 'Vivir en la Col. Gabriel Ramos Millán o a menos de 15 minutos. Trato amable y puntualidad.',
      foto: '',
      whatsapp: ADMIN_WHATSAPP
    }
  ]
};

const DB = {
  ticker: "🎸 Concierto en Estadio GNP (20:30 h): Tráfico pesado en Río Churubusco y Viaducto • ⛺ Tianguis Hoy: Sur 163 (Mercado Bramadero).",
  patrocinadorTicker: "Servicio Mecánico Hnos. Pérez (Sur 157)",
  noticias: [...INITIAL_DATA.noticias],
  cronicas: [...INITIAL_DATA.cronicas],
  negocios: [...INITIAL_DATA.negocios],
  tianguis: [...INITIAL_DATA.tianguis],
  mascotas: [...INITIAL_DATA.mascotas],
  oficios: [...INITIAL_DATA.oficios],
  empleos: [...INITIAL_DATA.empleos]
};

const SHEETS_CACHE_KEY = 'raices_sheets_cache_v1';
const SHEETS_CACHE_TS_KEY = 'raices_sheets_cache_ts_v1';
const SHEETS_CACHE_TTL_MS = 90 * 1000; // 90 segundos antes de volver a consultar en segundo plano
const LOCAL_REGISTRATIONS_KEY = 'raices_registros_locales_v1';
const MAX_SHEETS_CELL_CHARS = 47000; // Límite seguro bajo el máximo de 50,000 caracteres por celda en Google Sheets

const GIROS_VALIDOS = [
  'Comida y Antojitos',
  'Salud y Mascotas',
  'Talleres y Tlapalerías',
  'Belleza y Barberías'
];

const REGISTRO_REGLAS = {
  NOTICIA: {
    label: 'Noticia Vecinal',
    sectionHref: 'noticias.html',
    sectionName: 'Noticias Vecinales',
    photoRequired: false,
    waRequired: false,
    giroRequired: false
  },
  FOTO_HISTORIA: {
    label: 'Crónicas y Raíces',
    sectionHref: 'cronicas.html',
    sectionName: 'Crónicas y Raíces',
    photoRequired: true,
    waRequired: false,
    giroRequired: false
  },
  MASCOTA: {
    label: 'Radar de Mascotas',
    sectionHref: 'mascotas.html',
    sectionName: 'Radar de Mascotas',
    photoRequired: true,
    waRequired: true,
    giroRequired: false
  },
  TIANGUIS: {
    label: 'Tianguis Digital',
    sectionHref: 'tianguis.html',
    sectionName: 'Tianguis Digital',
    photoRequired: true,
    waRequired: true,
    giroRequired: false
  },
  OFICIO: {
    label: 'Oficio Verificado',
    sectionHref: 'oficios.html',
    sectionName: 'Oficios Verificados',
    photoRequired: false,
    waRequired: true,
    giroRequired: false
  },
  EMPLEO: {
    label: 'Bolsa de Trabajo',
    sectionHref: 'empleos.html',
    sectionName: 'Bolsa de Trabajo',
    photoRequired: false,
    waRequired: true,
    giroRequired: false
  },
  NEGOCIO: {
    label: 'Comercio de Barrio',
    sectionHref: 'comercio.html',
    sectionName: 'Comercio de Barrio',
    photoRequired: true,
    waRequired: true,
    giroRequired: true
  }
};

/**
 * Normaliza un número telefónico mexicano a 10 dígitos (elimina espacios, guiones y prefijo +52 / 521)
 */
function normalizePhoneMX(rawPhone) {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521')) {
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith('52')) {
    digits = digits.slice(2);
  }
  return digits;
}

function getMercadoPagoPlanForModalidad(modalidad) {
  const mod = String(modalidad || 'Gratis');
  if (mod.includes('Pro')) return MP_LINKS.SUSCRIPCION_PRO_199;
  if (mod.includes('Destacado')) return MP_LINKS.TIANGUIS_39;
  if (mod.includes('Oficio')) return MP_LINKS.OFICIO_50;
  if (mod.includes('Vacante')) return MP_LINKS.VACANTE_100;
  if (mod.includes('Boost')) return MP_LINKS.BOOST_50;
  return null;
}

function generateRegistrationFolio() {
  return 'RI-' + String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Valida y normaliza un payload de registro para cualquiera de las 7 categorías
 */
function validateRegistrationPayload(rawPayload) {
  const p = rawPayload || {};
  const errors = [];

  if (p.website_url_trap && String(p.website_url_trap).trim() !== '') {
    return { valid: false, honeypot: true, errors: ['Detección anti-bots activada'], normalizedPayload: null };
  }

  const categoria = String(p.categoria || '').trim().toUpperCase();
  const rules = REGISTRO_REGLAS[categoria];
  if (!rules) {
    errors.push('Selecciona una categoría válida para tu publicación.');
  }

  const sectoresValidos = SECTORES_LISTA.filter(s => s !== 'TODOS');
  const sector = String(p.sector || '').trim();
  if (!sectoresValidos.includes(sector)) {
    errors.push('Selecciona un sector válido de la Colonia Gabriel Ramos Millán.');
  }

  const titulo = String(p.titulo || '').trim();
  if (titulo.length < 3) {
    errors.push('El título debe tener al menos 3 caracteres.');
  } else if (titulo.length > 100) {
    errors.push('El título no debe exceder 100 caracteres.');
  }

  const subdato = String(p.subdato || '').trim();
  if (subdato.length < 2) {
    errors.push('El campo de ubicación, autor o nombre secundario es obligatorio.');
  } else if (subdato.length > 100) {
    errors.push('El campo secundario no debe exceder 100 caracteres.');
  }

  const detalles = String(p.detalles || '').trim();
  if (detalles.length < 5) {
    errors.push('La descripción o detalles debe tener al menos 5 caracteres.');
  } else if (detalles.length > 600) {
    errors.push('La descripción no debe exceder 600 caracteres.');
  }

  const whatsappClean = normalizePhoneMX(p.whatsapp);
  if (rules && rules.waRequired) {
    if (!/^\d{10}$/.test(whatsappClean)) {
      errors.push('Ingresa un número de WhatsApp válido de 10 dígitos.');
    }
  } else if (whatsappClean.length > 0 && !/^\d{10}$/.test(whatsappClean)) {
    errors.push('Si ingresas un WhatsApp opcional, debe tener 10 dígitos.');
  }

  const foto = String(p.foto || '').trim();
  if (rules && rules.photoRequired && !foto) {
    errors.push('Por favor adjunta la fotografía requerida para esta sección.');
  }
  if (foto && foto.startsWith('data:image') && foto.length > 49500) {
    errors.push('La fotografía excede el límite permitido de almacenamiento (50,000 caracteres).');
  }

  let giro = String(p.giro || '').trim();
  if (rules && rules.giroRequired) {
    if (!GIROS_VALIDOS.includes(giro)) {
      errors.push('Selecciona un giro comercial válido para el negocio.');
    }
  }

  const modalidad = String(p.modalidad || 'Gratis').trim();
  const folio = String(p.folio || p.id || generateRegistrationFolio()).trim();
  const sueldo = String(p.sueldo || '').trim();
  const fecha = String(p.fecha || new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })).trim();

  const normalizedPayload = {
    website_url_trap: '',
    id: folio,
    folio: folio,
    fecha: fecha,
    categoria: categoria,
    modalidad: modalidad,
    giro: giro,
    sector: sector,
    titulo: titulo,
    subdato: subdato,
    detalles: detalles,
    whatsapp: whatsappClean,
    foto: foto,
    sueldo: sueldo,
    // Alias de compatibilidad hacia atrás con versiones previas de Google Apps Script
    tipo: `${categoria} - ${modalidad}`,
    calle: subdato,
    descripcion: detalles,
    precio: sueldo || modalidad
  };

  return {
    valid: errors.length === 0,
    honeypot: false,
    errors: errors,
    normalizedPayload: normalizedPayload
  };
}

function getLocalRegistrations() {
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function getCachedSheetsPublications() {
  try {
    const raw = localStorage.getItem(SHEETS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRegistration(payloadObj) {
  const list = getLocalRegistrations();
  const folio = payloadObj.folio || payloadObj.id || generateRegistrationFolio();
  const itemToSave = {
    ...payloadObj,
    id: folio,
    folio: folio,
    fecha: payloadObj.fecha || 'Hoy',
    createdAt: new Date().toISOString()
  };

  const filtered = list.filter(x => String(x.folio || x.id) !== String(folio));
  filtered.unshift(itemToSave);

  try {
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(filtered.slice(0, 50)));
    localStorage.setItem('raices_ultimo_registro', JSON.stringify({
      folio: folio,
      titulo: itemToSave.titulo,
      categoria: itemToSave.categoria,
      sector: itemToSave.sector,
      modalidad: itemToSave.modalidad,
      fecha: itemToSave.createdAt
    }));
  } catch (quotaErr) {
    // Si localStorage se llena por imágenes en Base64, guardar versión sin foto pesada o conservar los más recientes
    try {
      const compactList = filtered.slice(0, 15).map((it, idx) => idx === 0 ? it : { ...it, foto: '' });
      localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(compactList));
    } catch (e) {}
  }

  applyPublicacionesToDB(getCachedSheetsPublications());
  return itemToSave;
}

function removeLocalRegistration(folioOrId) {
  const list = getLocalRegistrations().filter(x => String(x.folio || x.id) !== String(folioOrId));
  try {
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(list));
  } catch (e) {}
  applyPublicacionesToDB(getCachedSheetsPublications());
  return list;
}

function clearLocalRegistrations() {
  try {
    localStorage.removeItem(LOCAL_REGISTRATIONS_KEY);
    localStorage.removeItem('raices_ultimo_registro');
  } catch (e) {}
  applyPublicacionesToDB(getCachedSheetsPublications());
}

/**
 * Envía un registro a Google Sheets usando Content-Type: text/plain;charset=utf-8 (CORS-safe simple request)
 * para poder verificar la respuesta JSON del servidor sin bloqueo por preflight OPTIONS.
 */
async function sendPayloadToGoogleSheets(payloadObj, customFetch) {
  if (!GOOGLE_SHEETS_WEBAPP_URL) return { ok: true, mode: 'local-only' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Sin conexión a internet');
  }

  const fetchFn = customFetch || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return { ok: true, mode: 'no-fetch' };

  const bodyStr = JSON.stringify(payloadObj);

  try {
    const res = await fetchFn(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyStr
    });

    if (res && res.type === 'opaque') {
      return { ok: true, mode: 'opaque' };
    }

    if (res && typeof res.text === 'function') {
      const text = await res.text();
      if (text) {
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr) {
          parsed = null;
        }
        if (parsed && parsed.ok === false) {
          // Si el servidor falló al procesar una foto en Base64 (ej. permisos de DriveApp o límite de celda),
          // reintentar automáticamente guardando los datos de texto en Google Sheets para no perder el registro.
          if (payloadObj.foto && String(payloadObj.foto).startsWith('data:image')) {
            const fallbackPayload = { ...payloadObj, foto: '' };
            const retryRes = await fetchFn(GOOGLE_SHEETS_WEBAPP_URL, {
              method: 'POST',
              redirect: 'follow',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(fallbackPayload)
            });
            if (retryRes && typeof retryRes.json === 'function') {
              try {
                const retryJson = await retryRes.json();
                if (retryJson && retryJson.ok !== false) {
                  return { ok: true, mode: 'sheets-text-fallback', warning: parsed.error };
                }
              } catch (e) {}
            }
          }
          throw new Error(parsed.error || 'Error al guardar en Google Sheets');
        }
        if (parsed && parsed.ok === true) {
          return { ok: true, mode: 'cors-json', data: parsed };
        }
      }
    }
    return { ok: true, mode: 'cors' };
  } catch (err) {
    // Si el error fue explícito del servidor de Google Sheets o falta de red, propagarlo
    if (err && err.message && (err.message.includes('Sin conexión') || err.message.includes('Error al guardar'))) {
      throw err;
    }
    // Fallback a mode: 'no-cors' con text/plain en caso de bloqueo de redirección CORS por el navegador
    await fetchFn(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyStr
    });
    return { ok: true, mode: 'no-cors-fallback' };
  }
}

/**
 * Función integral de registro: valida, guarda localmente, actualiza DB y sincroniza con Google Sheets
 */
async function registrarPublicacion(rawPayload, options = {}) {
  const validation = validateRegistrationPayload(rawPayload);
  if (validation.honeypot) {
    return { ok: true, honeypot: true, folio: null };
  }
  if (!validation.valid) {
    return { ok: false, errors: validation.errors, payload: null };
  }

  const payload = validation.normalizedPayload;
  const mpPlan = getMercadoPagoPlanForModalidad(payload.modalidad);
  const rules = REGISTRO_REGLAS[payload.categoria];

  let remoteResult = { ok: true, mode: 'skipped' };
  if (options.sendToRemote !== false) {
    remoteResult = await sendPayloadToGoogleSheets(payload, options.customFetch);
  }

  const savedItem = saveLocalRegistration(payload);
  updateSponsorsTicker();

  return {
    ok: true,
    folio: payload.folio,
    payload: savedItem,
    mpPlan: mpPlan,
    sectionHref: rules ? rules.sectionHref : 'index.html',
    sectionName: rules ? rules.sectionName : 'Portada',
    remoteResult: remoteResult
  };
}

function applyPublicacionesToDB(publicaciones) {
  DB.noticias = [...INITIAL_DATA.noticias];
  DB.cronicas = [...INITIAL_DATA.cronicas];
  DB.negocios = [...INITIAL_DATA.negocios];
  DB.mascotas = [...INITIAL_DATA.mascotas];
  DB.oficios = [...INITIAL_DATA.oficios];
  DB.empleos = [...INITIAL_DATA.empleos];
  DB.tianguis = [...INITIAL_DATA.tianguis];

  const remoteList = Array.isArray(publicaciones) ? publicaciones : [];
  const localList = getLocalRegistrations();

  // Combinar publicaciones de Google Sheets + registros locales sin duplicar folios/IDs
  const seenIds = new Set();
  const combined = [];

  // Primero agregamos las remotas y luego las locales al frente (en orden cronológico)
  remoteList.forEach(item => {
    if (!item) return;
    const key = String(item.id || item.folio || '').trim();
    if (key) seenIds.add(key);
    combined.push(item);
  });

  // Los registros locales que aún no vienen en remoteList se agregan al final de combined
  // (como usamos unshift abajo, los últimos en combined quedan hasta arriba de cada sección)
  for (let i = localList.length - 1; i >= 0; i--) {
    const loc = localList[i];
    if (!loc) continue;
    const key = String(loc.id || loc.folio || '').trim();
    if (key && seenIds.has(key)) continue;
    if (key) seenIds.add(key);
    combined.push(loc);
  }

  combined.forEach((pub, index) => {
    const cat = String(pub.categoria || '').trim().toUpperCase();
    const fotoOk = normalizePhotoUrl(pub.foto);
    const tituloOk = cleanDisplayField(pub.titulo, 'Publicación Vecinal');
    const subdatoOk = cleanDisplayField(pub.subdato, 'Col. Gabriel Ramos Millán');
    const detallesOk = cleanDisplayField(pub.detalles, '');
    const sectorOk = pub.sector || 'Bramadero';
    const pubId = pub.id || pub.folio || `pub_${index}`;

    if (cat === 'NOTICIA') {
      DB.noticias.unshift({
        id: pubId,
        titulo: tituloOk,
        sector: sectorOk,
        ubicacion: subdatoOk,
        descripcion: detallesOk,
        fecha: pub.fecha || 'Hoy',
        foto: fotoOk
      });
    } else if (cat === 'FOTO_HISTORIA') {
      DB.cronicas.unshift({
        id: pubId,
        titulo: tituloOk,
        categoria: '📷 MEMORIA VECINAL',
        sector: sectorOk,
        fecha: pub.fecha || 'Reciente',
        autor: subdatoOk,
        contenidoCompleto: detallesOk,
        foto: fotoOk,
        patrocinado: false
      });
    } else if (cat === 'MASCOTA') {
      const esBoost = String(pub.modalidad).includes('Boost');
      DB.mascotas.unshift({
        id: pubId,
        tipo: esBoost ? '🔥 PERDIDO • BOOST URGENTE' : '🐾 REPORTE VECINAL',
        nombre: tituloOk,
        sector: sectorOk,
        calle: subdatoOk,
        descripcion: detallesOk,
        foto: fotoOk,
        destacado: esBoost,
        whatsapp: pub.whatsapp || ADMIN_WHATSAPP
      });
    } else if (cat === 'OFICIO') {
      DB.oficios.unshift({
        id: pubId,
        oficio: tituloOk,
        nombre: subdatoOk,
        sector: sectorOk,
        calle: `${subdatoOk} · Sector ${sectorOk}`,
        garantia: detallesOk,
        calificacion: '5.0 ★',
        foto: fotoOk,
        whatsapp: pub.whatsapp || ADMIN_WHATSAPP
      });
    } else if (cat === 'EMPLEO') {
      let negocioVal = subdatoOk;
      let sueldoVal = cleanDisplayField(pub.sueldo, '');
      if (!sueldoVal && subdatoOk.includes('•')) {
        const parts = subdatoOk.split('•');
        negocioVal = parts[0].trim() || subdatoOk;
        sueldoVal = parts.slice(1).join('•').trim();
      }
      DB.empleos.unshift({
        id: pubId,
        puesto: tituloOk,
        sector: sectorOk,
        negocio: negocioVal,
        sueldo: sueldoVal || 'Consultar en entrevista',
        requisitos: detallesOk,
        foto: fotoOk,
        whatsapp: pub.whatsapp || ADMIN_WHATSAPP
      });
    } else if (cat === 'TIANGUIS') {
      DB.tianguis.unshift({
        id: pubId,
        producto: tituloOk,
        sector: sectorOk,
        puntoEntrega: subdatoOk,
        destacado: String(pub.modalidad).includes('Destacado'),
        descripcion: detallesOk,
        foto: fotoOk,
        whatsapp: pub.whatsapp || ADMIN_WHATSAPP
      });
    } else if (cat === 'NEGOCIO') {
      const baseCoord = COORDENADAS_SECTORES[sectorOk] || COORDENADAS_SECTORES['TODOS'];
      const offsetLat = ((index % 5) - 2) * 0.0008;
      const offsetLng = (((index * 3) % 5) - 2) * 0.0008;
      DB.negocios.unshift({
        id: pubId,
        nombre: tituloOk,
        giro: inferirGiroNegocio(`${tituloOk} ${detallesOk}`, pub.giro),
        sector: sectorOk,
        calle: subdatoOk,
        anioFundacion: 2020,
        plan: String(pub.modalidad).includes('Pro') ? 'PRO' : 'BASICO',
        cupon: detallesOk || 'Promoción especial para vecinos de la colonia',
        historia: 'Comercio local de la Col. Gabriel Ramos Millán.',
        foto: fotoOk,
        whatsapp: pub.whatsapp || ADMIN_WHATSAPP,
        lat: baseCoord.lat + offsetLat,
        lng: baseCoord.lng + offsetLng,
        catalogo: [
          { nombre: 'Pedido o promoción vecinal', precio: 100 }
        ]
      });
    }
  });
}

// Hidratación síncrona instantánea (0 ms) al abrir o cambiar de página (incluye caché de Sheets y registros locales)
(function hydrateFromLocalCacheImmediately() {
  try {
    applyPublicacionesToDB(getCachedSheetsPublications());
  } catch (e) {
    console.warn('No se pudo hidratar caché local:', e);
  }
})();

function getPatrocinadoresTickerHTML() {
  const listaNegocios = (DB.negocios && DB.negocios.length > 0) ? DB.negocios : INITIAL_DATA.negocios;
  const items = listaNegocios.map(n =>
    `<a href="comercio.html" class="mx-5 hover:underline text-amber-300 font-extrabold">★ ${sanitizeHTML(n.nombre)} <span class="text-stone-200 font-normal">(${sanitizeHTML(n.calle)} · ${sanitizeHTML(n.sector)})</span></a>`
  ).join('<span class="text-amber-500">•</span>');

  const promoAviso = `<a href="anunciate.html?tipo=negocio" class="mx-5 text-white hover:text-amber-300 font-bold">🏪 ¡Anuncia tu negocio por $199/mes y aparece en este cintillo patrocinado! →</a>`;
  return `${items} <span class="text-amber-500">•</span> ${promoAviso} <span class="text-amber-500">•</span> ${items}`;
}

function updateSponsorsTicker() {
  const track = document.getElementById('sponsors-marquee-content');
  if (track) {
    track.innerHTML = getPatrocinadoresTickerHTML();
  }
}

async function syncWithGoogleSheets(forceRefresh = false) {
  if (!GOOGLE_SHEETS_WEBAPP_URL) return;

  // Si el caché es reciente (< 90s) y no se forzó actualización, evitamos esperar a Google Apps Script en cada clic de menú
  const lastTs = Number(localStorage.getItem(SHEETS_CACHE_TS_KEY) || 0);
  const hasCachedData = Boolean(localStorage.getItem(SHEETS_CACHE_KEY));
  if (!forceRefresh && hasCachedData && (Date.now() - lastTs < SHEETS_CACHE_TTL_MS)) {
    return;
  }

  isSyncing = true;
  try {
    const sep = GOOGLE_SHEETS_WEBAPP_URL.includes('?') ? '&' : '?';
    const res = await fetch(`${GOOGLE_SHEETS_WEBAPP_URL}${sep}t=${Date.now()}`, { redirect: 'follow' });
    const data = await res.json();

    if (Array.isArray(data.publicaciones)) {
      const prevRaw = localStorage.getItem(SHEETS_CACHE_KEY);
      const nextRaw = JSON.stringify(data.publicaciones);
      try {
        localStorage.setItem(SHEETS_CACHE_KEY, nextRaw);
        localStorage.setItem(SHEETS_CACHE_TS_KEY, String(Date.now()));
      } catch (quotaErr) {
        console.warn('Caché local lleno (imágenes Base64), usando memoria en sesión:', quotaErr);
      }

      // Solo re-aplicar y re-renderizar si realmente cambiaron los datos respecto al caché local
      if (prevRaw !== nextRaw) {
        applyPublicacionesToDB(data.publicaciones);
        updateSponsorsTicker();
        updateActiveFilterBanner();
        if (typeof window.onPageRender === 'function') window.onPageRender();
      }
    }
  } catch (err) {
    console.warn('Error sincronizando con Google Sheets:', err);
  } finally {
    isSyncing = false;
  }
}

/**
 * ============================================================================
 * LIGHTBOX ACCESIBLE CON SOPORTE PARA TECLA ESCAPE Y PARÁMETROS SEGUROS
 * ============================================================================
 */
function openPhotoLightboxEncoded(encodedSrc, encodedCaption) {
  openPhotoLightbox(decodeDataParam(encodedSrc), decodeDataParam(encodedCaption));
}

function closePhotoLightbox() {
  const modal = document.getElementById('global-photo-lightbox');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function openPhotoLightbox(src, caption) {
  if (!src) return;
  let modal = document.getElementById('global-photo-lightbox');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-photo-lightbox';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Vista ampliada de fotografía');
    modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4';
    modal.onclick = () => closePhotoLightbox();
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onclick="event.stopPropagation()">
      <div class="relative bg-stone-950 flex items-center justify-center max-h-[75vh]">
        <img src="${sanitizeHTML(src)}" alt="${sanitizeHTML(caption || 'Fotografía vecinal')}" class="max-h-[75vh] w-auto object-contain" />
        <button type="button" aria-label="Cerrar imagen" onclick="closePhotoLightbox()" class="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/75 text-white font-bold text-base flex items-center justify-center hover:bg-black focus:outline-none focus:ring-2 focus:ring-amber-400">✕</button>
      </div>
      <div class="p-4 bg-papel flex items-center justify-between gap-3">
        <p class="text-sm font-bold text-tinta">${sanitizeHTML(caption || 'Fotografía vecinal')}</p>
        <button type="button" onclick="closePhotoLightbox()" class="px-4 py-1.5 rounded-lg bg-tinta hover:bg-stone-800 text-white text-xs font-bold shrink-0">Cerrar (Esc)</button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePhotoLightbox();
    closeMobileSectionsDrawer();
  }
});

/**
 * ============================================================================
 * ESTADOS VACÍOS Y DE CARGA REUTILIZABLES
 * ============================================================================
 */
function renderEmptyState({ icon = '📭', title = 'No encontramos publicaciones con este filtro', subtitle = '', ctaHref = 'anunciate.html', ctaLabel = '➕ Publicar ahora' }) {
  const hayFiltro = currentSector !== 'TODOS' || searchQuery !== '';
  const desc = subtitle || (hayFiltro
    ? `No hay resultados en el sector "${currentSector === 'TODOS' ? 'Toda la Ramos Millán' : currentSector}"${searchQuery ? ` para la búsqueda "${searchQuery}"` : ''}.`
    : 'Sé el primer vecino en compartir un anuncio en esta sección.');

  return `
    <div class="col-span-full bg-white rounded-2xl border-2 border-dashed border-borde p-6 sm:p-8 text-center space-y-3 my-2">
      <div class="text-3xl">${icon}</div>
      <h4 class="font-serif font-bold text-lg text-stone-900">${sanitizeHTML(title)}</h4>
      <p class="text-xs sm:text-sm text-stone-700 max-w-md mx-auto leading-relaxed">${sanitizeHTML(desc)}</p>
      <div class="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        ${hayFiltro ? `
          <button type="button" onclick="resetGlobalFilters()" class="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs shadow transition">
            🔄 Ver Toda la Ramos Millán
          </button>
        ` : ''}
        <a href="${sanitizeHTML(ctaHref)}" class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs shadow transition">
          ${sanitizeHTML(ctaLabel)}
        </a>
      </div>
    </div>
  `;
}

function toggleMobileSectionsDrawer() {
  const drawer = document.getElementById('mobile-sections-drawer');
  if (!drawer) return;
  drawer.classList.toggle('hidden');
}

function closeMobileSectionsDrawer() {
  const drawer = document.getElementById('mobile-sections-drawer');
  if (drawer) drawer.classList.add('hidden');
}

/**
 * ============================================================================
 * ENCABEZADO Y PIE DE PÁGINA ADAPTATIVOS (COMPUTADORA, TABLETA Y CELULAR)
 * ============================================================================
 */
function renderSharedLayout(activePage, triggerSync = true) {
  applyDeviceViewMode();

  const navItems = [
    { id: 'inicio', label: '🏠 Portada', shortLabel: 'Portada', icon: '🏠', href: 'index.html' },
    { id: 'noticias', label: '🗞️ Noticias', shortLabel: 'Noticias', icon: '🗞️', href: 'noticias.html' },
    { id: 'cronicas', label: '📷 Crónicas', shortLabel: 'Crónicas', icon: '📷', href: 'cronicas.html' },
    { id: 'comercio', label: '🏪 Comercio', shortLabel: 'Comercio', icon: '🏪', href: 'comercio.html' },
    { id: 'tianguis', label: '🛍️ Tianguis', shortLabel: 'Tianguis', icon: '🛍️', href: 'tianguis.html' },
    { id: 'mascotas', label: '🐾 Mascotas', shortLabel: 'Mascotas', icon: '🐾', href: 'mascotas.html' },
    { id: 'oficios', label: '🛠️ Oficios', shortLabel: 'Oficios', icon: '🛠️', href: 'oficios.html' },
    { id: 'empleos', label: '💼 Empleos', shortLabel: 'Empleos', icon: '💼', href: 'empleos.html' },
    { id: 'guia', label: '📖 Guía', shortLabel: 'Guía', icon: '📖', href: 'guia.html' }
  ];

  const nowStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const headerContainer = document.getElementById('shared-header');
  const isMobileView = currentDeviceType === 'mobile';
  const isTabletView = currentDeviceType === 'tablet';

  if (headerContainer) {
    headerContainer.innerHTML = `
      <style>
        @keyframes tickerSlide {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .sponsors-ticker-wrap {
          overflow: hidden;
          white-space: nowrap;
          flex: 1;
        }
        .sponsors-ticker-move {
          display: inline-block;
          white-space: nowrap;
          animation: tickerSlide 28s linear infinite;
        }
        .sponsors-ticker-move:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .sponsors-ticker-move {
            animation: none !important;
          }
          .animate-pulse {
            animation: none !important;
          }
        }
        /* Ajustes específicos según vista Web / Tableta / Celular */
        body[data-device="mobile"] .desktop-only-block { display: none !important; }
        body[data-device="desktop"] .mobile-only-bar { display: none !important; }
        body[data-device="tablet"] .mobile-only-bar { display: none !important; }
      </style>

      <!-- CINTILLO SUPERIOR DE PATROCINADORES -->
      <div class="bg-stone-900 text-stone-100 text-xs border-b-2 border-amber-400 sticky top-0 z-40 shadow-md">
        <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-3">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
          <span class="font-mono uppercase text-[11px] bg-amber-400 text-stone-950 px-2 py-0.5 rounded font-extrabold shrink-0">
            ⭐ PATROCINADO:
          </span>
          <div class="sponsors-ticker-wrap">
            <div id="sponsors-marquee-content" class="sponsors-ticker-move text-xs font-medium text-stone-100">
              ${getPatrocinadoresTickerHTML()}
            </div>
          </div>
        </div>
      </div>

      <header class="bg-papel/95 backdrop-blur-md border-b border-borde">
        <div class="max-w-7xl mx-auto px-3 sm:px-6 pt-2.5 pb-2">
          <!-- BARRA SUPERIOR DE CONTEXTO Y SELECTOR DE VISTA ADAPTATIVA -->
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-borde text-xs text-grafito">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="index.html" class="font-mono uppercase font-bold text-terracota bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                ALCALDÍA IZTACALCO • CDMX
              </a>
              <span class="capitalize font-semibold text-stone-800 hidden sm:inline">${sanitizeHTML(nowStr)}</span>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <!-- Conmutador de Vista (Automático por dispositivo + opción manual Web / Tablet / Celular) -->
              <div class="inline-flex items-center bg-crema border border-borde rounded-lg p-0.5 gap-0.5" role="group" aria-label="Modo de visualización">
                <button type="button" onclick="setDeviceViewOverride('desktop')" data-view-switch="desktop" title="Vista Web para Computadora" class="${currentDeviceType === 'desktop' ? 'px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-bold text-[11px]' : 'px-2 py-0.5 rounded text-stone-700 hover:bg-stone-200 font-medium text-[11px]'}">
                  💻 Web
                </button>
                <button type="button" onclick="setDeviceViewOverride('tablet')" data-view-switch="tablet" title="Vista para Tableta" class="${currentDeviceType === 'tablet' ? 'px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-bold text-[11px]' : 'px-2 py-0.5 rounded text-stone-700 hover:bg-stone-200 font-medium text-[11px]'}">
                  📟 Tablet
                </button>
                <button type="button" onclick="setDeviceViewOverride('mobile')" data-view-switch="mobile" title="Vista para Teléfono Celular" class="${currentDeviceType === 'mobile' ? 'px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-bold text-[11px]' : 'px-2 py-0.5 rounded text-stone-700 hover:bg-stone-200 font-medium text-[11px]'}">
                  📱 Celular
                </button>
              </div>

              <a href="guia.html" class="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-md bg-amber-300 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition">📖 Guía</a>
              <a href="anunciate.html" class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 font-extrabold text-xs shadow transition">➕ Publicar</a>
            </div>
          </div>

          <!-- CABECERA DEL PERIÓDICO: COMPACTA EN CELULAR, AMPLIA EN TABLET Y COMPUTADORA -->
          ${isMobileView ? `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <a href="index.html" class="block">
                <p class="text-[10px] font-mono uppercase tracking-wider text-terracota font-bold">PERIÓDICO COMUNITARIO Y COMERCIO</p>
                <h1 class="font-serif text-2xl font-extrabold text-tinta leading-tight">Raíces de Iztacalco</h1>
                <p class="text-xs text-stone-700 font-medium">Col. <strong>Gabriel Ramos Millán</strong></p>
              </a>
              <button type="button" onclick="toggleMobileSectionsDrawer()" class="px-3 py-2 rounded-xl bg-crema border border-borde text-tinta font-extrabold text-xs flex items-center gap-1.5 shadow-sm shrink-0">
                <span>☰ Secciones</span>
              </button>
            </div>
          ` : `
            <div class="${isTabletView ? 'py-3' : 'py-4'} text-center">
              <a href="index.html" class="inline-block group">
                <p class="text-xs font-mono uppercase tracking-[0.2em] text-terracota font-bold mb-1">
                  « PERIÓDICO COMUNITARIO Y COMERCIO DE BARRIO »
                </p>
                <h1 class="font-serif ${isTabletView ? 'text-4xl' : 'text-3xl sm:text-5xl'} font-extrabold text-tinta group-hover:text-terracota transition">
                  Raíces de Iztacalco
                </h1>
              </a>
              <p class="mt-1 text-xs sm:text-sm text-stone-700 font-medium">
                Edición Hiperlocal: <strong class="text-tinta">Col. Gabriel Ramos Millán</strong> (Bramadero · Tlacotal · Cuchilla · Av. Té · Coyuya)
              </p>
            </div>
          `}

          <!-- BARRA DE FILTRO POR SECTOR Y BUSCADOR SIN PÉRDIDA DE FOCO -->
          <div class="border-t-2 border-b border-tinta py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
            <div id="sector-buttons-bar" class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-0.5 no-scrollbar">
              <span class="text-xs font-mono uppercase font-bold text-tinta shrink-0 mr-1">📍 Sector:</span>
              ${SECTORES_LISTA.map(sec => `
                <button type="button" onclick="changeGlobalSector('${sec}')" data-sec-btn="${sec}" class="px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${currentSector === sec ? 'bg-stone-900 text-amber-300 shadow-sm' : 'bg-crema text-tinta hover:bg-stone-200'}">
                  ${sec === 'TODOS' ? 'Toda la Ramos Millán' : sec}
                </button>
              `).join('')}
            </div>

            <div class="relative w-full md:w-64 shrink-0 flex items-center">
              <span class="absolute left-3 text-xs text-stone-500 pointer-events-none">🔍</span>
              <input
                id="global-search-input"
                oninput="changeGlobalSearch(this.value)"
                type="search"
                value="${sanitizeHTML(searchQuery)}"
                aria-label="Buscar en esta sección"
                placeholder="Buscar calle, oficio, producto..."
                class="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-white border border-borde rounded-full focus:outline-none focus:border-terracota text-tinta"
              />
              <button
                id="clear-search-btn"
                type="button"
                onclick="clearGlobalSearch()"
                title="Limpiar búsqueda"
                class="${searchQuery ? '' : 'hidden'} absolute right-2.5 text-xs text-stone-500 hover:text-stone-900 font-bold"
              >✕</button>
            </div>
          </div>

          <!-- AVISO ACTIVO DE FILTRO (SI HAY UN SECTOR O BÚSQUEDA SELECCIONADA) -->
          <div id="active-filter-banner" class="hidden pt-2"></div>

          <!-- MENÚ DE SECCIONES DEL PERIÓDICO -->
          <nav class="flex items-center justify-start lg:justify-center overflow-x-auto gap-1.5 pt-2.5 pb-1" aria-label="Páginas del periódico">
            ${navItems.map(item => {
              const isActive = activePage === item.id;
              return `
                <a href="${item.href}" aria-current="${isActive ? 'page' : 'false'}" class="px-3 py-1.5 rounded-lg text-xs sm:text-sm shrink-0 flex items-center gap-1 transition ${isActive ? 'bg-stone-900 text-amber-300 font-extrabold shadow-sm' : 'text-stone-800 hover:bg-crema font-bold'}">
                  <span>${item.label}</span>
                </a>
              `;
            }).join('')}
            <a href="anunciate.html" class="ml-1 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs sm:text-sm shrink-0 flex items-center gap-1 shadow transition">
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
      <footer class="bg-tinta text-stone-300 border-t border-stone-800 mt-14 ${isMobileView ? 'pb-24' : 'pb-10'}">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span class="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">RAÍCES DE IZTACALCO</span>
              <h4 class="font-serif text-xl font-bold text-white mt-1">Edición Gabriel Ramos Millán</h4>
              <p class="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
                Periódico digital comunitario y directorio de comercio local sin comisiones. Optimizado para computadora, tableta y teléfono celular.
              </p>
            </div>
            <div>
              <h5 class="font-mono text-xs uppercase font-bold text-white mb-2">Todas las Secciones</h5>
              <ul class="grid grid-cols-2 gap-1.5 text-xs sm:text-sm text-stone-300">
                <li><a href="index.html" class="hover:text-amber-300">🏠 Portada</a></li>
                <li><a href="noticias.html" class="hover:text-amber-300">🗞️ Noticias</a></li>
                <li><a href="cronicas.html" class="hover:text-amber-300">📷 Crónicas</a></li>
                <li><a href="comercio.html" class="hover:text-amber-300">🏪 Comercio</a></li>
                <li><a href="tianguis.html" class="hover:text-amber-300">🛍️ Tianguis</a></li>
                <li><a href="mascotas.html" class="hover:text-amber-300">🐾 Mascotas</a></li>
                <li><a href="oficios.html" class="hover:text-amber-300">🛠️ Oficios</a></li>
                <li><a href="empleos.html" class="hover:text-amber-300">💼 Empleos</a></li>
                <li><a href="guia.html" class="hover:text-amber-300">📖 Guía Vecinal</a></li>
                <li><a href="anunciate.html" class="text-amber-300 font-bold hover:underline">➕ Publicar</a></li>
              </ul>
            </div>
            <div class="p-4 rounded-xl bg-stone-900 border border-stone-700 space-y-2">
              <h5 class="font-mono text-xs uppercase font-bold text-amber-400">🛡️ Seguridad Vecinal</h5>
              <p class="text-xs text-stone-300 leading-relaxed">
                Acuerda entregas únicamente en puntos públicos seguros como la Explanada de la Alcaldía Iztacalco o estaciones de Metro. Nunca deposites por adelantado a desconocidos.
              </p>
            </div>
          </div>
          <div class="pt-4 border-t border-stone-800 text-center text-xs text-stone-400">
            © 2026 Raíces de Iztacalco — Col. Gabriel Ramos Millán, Alcaldía Iztacalco, CDMX.
          </div>
        </div>
      </footer>

      <!-- BARRA INFERIOR FIJA PARA CELULAR CON ACCESO A LAS 10 SECCIONES -->
      <nav class="${isMobileView ? 'fixed' : 'lg:hidden fixed'} mobile-only-bar bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t-2 border-stone-900 z-40 px-1 py-1.5 shadow-2xl" aria-label="Navegación rápida móvil">
        <div class="grid grid-cols-5 gap-1 max-w-lg mx-auto text-center text-[11px]">
          <a href="index.html" class="py-1 rounded-lg flex flex-col items-center justify-center ${activePage === 'inicio' ? 'bg-amber-100 text-stone-950 font-extrabold' : 'text-stone-800 font-bold'}">
            <span class="text-base leading-none">🏠</span>
            <span class="mt-0.5">Portada</span>
          </a>
          <a href="noticias.html" class="py-1 rounded-lg flex flex-col items-center justify-center ${activePage === 'noticias' ? 'bg-amber-100 text-stone-950 font-extrabold' : 'text-stone-800 font-bold'}">
            <span class="text-base leading-none">🗞️</span>
            <span class="mt-0.5">Noticias</span>
          </a>
          <a href="comercio.html" class="py-1 rounded-lg flex flex-col items-center justify-center ${activePage === 'comercio' ? 'bg-amber-100 text-stone-950 font-extrabold' : 'text-stone-800 font-bold'}">
            <span class="text-base leading-none">🏪</span>
            <span class="mt-0.5">Comercio</span>
          </a>
          <a href="anunciate.html" class="py-1 rounded-lg flex flex-col items-center justify-center ${activePage === 'anunciate' ? 'bg-amber-400 text-stone-950 font-extrabold' : 'bg-stone-900 text-amber-300 font-extrabold'}">
            <span class="text-base leading-none">➕</span>
            <span class="mt-0.5">Publicar</span>
          </a>
          <button type="button" onclick="toggleMobileSectionsDrawer()" class="py-1 rounded-lg flex flex-col items-center justify-center text-stone-900 font-extrabold hover:bg-crema">
            <span class="text-base leading-none">☰</span>
            <span class="mt-0.5">Secciones</span>
          </button>
        </div>
      </nav>

      <!-- CAJÓN DESLIZABLE (BOTTOM SHEET) CON LAS 10 SECCIONES EN MÓVIL -->
      <div id="mobile-sections-drawer" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end justify-center" onclick="closeMobileSectionsDrawer()">
        <div class="w-full max-w-lg bg-papel rounded-t-3xl border-t-2 border-stone-900 p-5 space-y-4 shadow-2xl" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between border-b border-borde pb-3">
            <div>
              <span class="font-mono text-[11px] uppercase font-bold text-terracota">MENÚ COMPLETO DEL PERIÓDICO</span>
              <h4 class="font-serif text-lg font-bold text-stone-900">Todas las Secciones de Raíces</h4>
            </div>
            <button type="button" onclick="closeMobileSectionsDrawer()" class="w-8 h-8 rounded-full bg-stone-200 text-stone-900 font-bold text-sm">✕</button>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            ${navItems.map(item => `
              <a href="${item.href}" class="p-3 rounded-xl border ${activePage === item.id ? 'bg-stone-900 text-amber-300 border-stone-900 font-extrabold' : 'bg-white text-stone-900 border-borde font-bold'} text-xs flex items-center gap-2 shadow-xs">
                <span class="text-base">${item.icon}</span>
                <span>${item.shortLabel}</span>
              </a>
            `).join('')}
            <a href="anunciate.html" class="p-3 rounded-xl bg-amber-400 text-stone-950 border border-stone-900 font-extrabold text-xs flex items-center gap-2 shadow-xs">
              <span class="text-base">➕</span>
              <span>Publicar Anuncio</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  updateActiveFilterBanner();

  if (triggerSync) {
    syncWithGoogleSheets();
  }
}

function updateActiveFilterBanner() {
  const banner = document.getElementById('active-filter-banner');
  if (!banner) return;

  if (currentSector === 'TODOS' && !searchQuery) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }

  banner.classList.remove('hidden');
  banner.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-stone-900">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-bold">🔎 Filtro activo:</span>
        ${currentSector !== 'TODOS' ? `<span class="px-2 py-0.5 rounded-full bg-stone-900 text-amber-300 font-bold">📍 ${sanitizeHTML(currentSector)}</span>` : ''}
        ${searchQuery ? `<span class="px-2 py-0.5 rounded-full bg-white border border-stone-300 font-bold">Texto: "${sanitizeHTML(searchQuery)}"</span>` : ''}
      </div>
      <button type="button" onclick="resetGlobalFilters()" class="font-extrabold text-terracota hover:underline">
        ✕ Mostrar todo
      </button>
    </div>
  `;
}

/**
 * Cambia el sector sin reconstruir el input de búsqueda ni perder foco/scroll
 */
function changeGlobalSector(sec) {
  currentSector = sec;
  localStorage.setItem('raices_sector', sec);

  document.querySelectorAll('[data-sec-btn]').forEach(btn => {
    const btnSec = btn.getAttribute('data-sec-btn');
    const isSelected = btnSec === currentSector;
    btn.className = `px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
      isSelected ? 'bg-stone-900 text-amber-300 shadow-sm' : 'bg-crema text-tinta hover:bg-stone-200'
    }`;
  });

  updateActiveFilterBanner();
  if (typeof window.onPageRender === 'function') window.onPageRender();
}

function changeGlobalSearch(val) {
  searchQuery = String(val || '').trim();
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !searchQuery);
  }
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    updateActiveFilterBanner();
    if (typeof window.onPageRender === 'function') window.onPageRender();
  }, 120);
}

function clearGlobalSearch() {
  searchQuery = '';
  const input = document.getElementById('global-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.classList.add('hidden');
  updateActiveFilterBanner();
  if (typeof window.onPageRender === 'function') window.onPageRender();
}

function resetGlobalFilters() {
  currentSector = 'TODOS';
  localStorage.setItem('raices_sector', 'TODOS');
  searchQuery = '';
  const input = document.getElementById('global-search-input');
  if (input) input.value = '';
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.classList.add('hidden');
  changeGlobalSector('TODOS');
}

function matchesGlobalFilter(itemSector, textBlob) {
  const secOk = (currentSector === 'TODOS') || (itemSector === currentSector);
  const qOk = !searchQuery || String(textBlob || '').toLowerCase().includes(searchQuery.toLowerCase());
  return secOk && qOk;
}

function openWhatsAppDirect(phone, text) {
  const cleanPhone = String(phone || ADMIN_WHATSAPP).replace(/\D/g, '');
  window.open(`https://wa.me/52${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

function openWhatsAppDirectEncoded(phone, encodedText) {
  openWhatsAppDirect(phone, decodeDataParam(encodedText));
}

function shareOnWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`, '_blank', 'noopener,noreferrer');
}

function shareOnWhatsAppEncoded(encodedText) {
  shareOnWhatsApp(decodeDataParam(encodedText));
}
