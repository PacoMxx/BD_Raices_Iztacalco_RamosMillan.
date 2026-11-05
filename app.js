/**
 * ============================================================================
 * ARCHIVO CENTRAL: app.js — RAÍCES DE IZTACALCO (EDICIÓN GABRIEL RAMOS MILLÁN)
 * Conecta todas las páginas independientes: Portada, Guía, Noticias, Crónicas,
 * Comercio, Tianguis, Mascotas, Oficios, Empleos y Publicar.
 * ============================================================================
 */

// 1. PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT (termina en /exec):
const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz_yuI8WhbZFM79eoLqJhRfB5C9fAAMRb896IVKb9nHHKzX_AIK4u2RUR9k6jvm6Je7dA/exec";

// 2. PON AQUÍ TU WHATSAPP DE ADMINISTRADOR (10 dígitos, aquí recibirás las alertas para aprobar posts):
const ADMIN_WHATSAPP = "5510803153";

// 3. PEGA AQUÍ TUS LINKS DE MERCADO PAGO:
const MP_LINKS = {
  SUSCRIPCION_PRO_199: {
    title: "Suscripción Mensual: Plan Pro Orgullo de Barrio",
    amount: "$199 MXN / mes",
    url: "https://mpago.la/259su4B"
  },
  TIANGUIS_39: {
    title: "Anuncio Destacado en El Tianguis Digital (7 días)",
    amount: "$39 MXN (Pago único)",
    url: "https://mpago.la/1AWbVzE"
  },
  VACANTE_100: {
    title: "Publicación de Vacante en Bolsa de Trabajo (15 días)",
    amount: "$100 MXN (Pago único)",
    url: "https://mpago.la/32DNrnt"
  },
  BOOST_50: {
    title: "Boost Vecinal de Mascota Perdida (7 días)",
    amount: "$50 MXN (Pago único)",
    url: "https://mpago.la/2UZYU9q"
  }
};

if (typeof tailwind !== "undefined") {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          papel: '#FBF8F3',
          crema: '#F3EDE2',
          tinta: '#1C1917',
          grafito: '#57534E',
          terracota: '#9B2C2C',
          terracotaDark: '#742A2A',
          maiz: '#D97706',
          chinampa: '#15803D',
          chinampaLight: '#DCFCE7',
          borde: '#E5DEC9'
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
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

// Filtra cualquier texto que por error contenga código Base64
function cleanDisplayField(val, fallback) {
  const s = String(val || '').trim();
  if (!s || s.startsWith('data:image')) return fallback || '';
  return s;
}

// ============================================================================
// BASE DE DATOS LOCAL + SINCRONIZACIÓN CON GOOGLE SHEETS
// ============================================================================
const DB = {
  ticker: "🎸 Concierto en Estadio GNP (20:30 h): Tráfico pesado en Río Churubusco, Viaducto y Av. Té • ⛺ Tianguis Hoy: Sur 163 (Mercado Bramadero) hasta las 17:00 h.",
  patrocinadorTicker: "Servicio Mecánico Hnos. Pérez (Sur 157)",
  noticias: [
    {
      id: 'not1',
      titulo: 'Jornada gratuita de vacunación y esterilización de mascotas este sábado en la Explanada',
      sector: 'Av. Té / Alcaldía',
      ubicacion: 'Explanada de la Alcaldía Iztacalco (Av. Té esq. Río Churubusco) • Reportó: Comité Vecinal',
      descripcion: 'Vecinos, este sábado y domingo de 9:00 AM a 2:30 PM estará la unidad móvil de salud animal frente a Ventanilla Única. Lleven a sus lomitos con correa y a sus gatitos en transportadora.',
      fecha: 'Hoy',
      foto: ''
    },
    {
      id: 'not2',
      titulo: 'Reparación de luminarias y poda de árboles sobre Sur 157 y Oriente 106',
      sector: 'Bramadero',
      ubicacion: 'Calle Sur 157 entre Oriente 104 y Oriente 108 • Reportó: Vecinos de Bramadero',
      descripcion: 'Cuadrillas de servicios urbanos estuvieron cambiando lámparas fundidas cerca del Mercado 204 Bramadero. Se recomienda precaución al circular porque hay camiones de poda trabajando.',
      fecha: 'Ayer',
      foto: ''
    }
  ],
  cronicas: [
    {
      id: 'c1',
      titulo: 'El Mercado 204 Bramadero: Más de medio siglo siendo el corazón del abasto en Sur 163',
      categoria: 'RAÍCES E HISTORIA',
      sector: 'Bramadero',
      fecha: 'Crónica de la Semana',
      autor: 'Archivo Histórico Vecinal',
      contenidoCompleto: 'Fundado para abastecer a las familias trabajadoras que poblaron la sección Bramadero, el Mercado 204 conserva locales atendidos por los nietos de sus fundadores originales: desde chiles secos y moles artesanales hasta las tradicionales carnitas.',
      foto: '',
      patrocinado: false
    },
    {
      id: 'c2',
      titulo: 'El Rincón de la Ramos: "Panadería Tradicional La Espiga de Tlacotal", 38 años horneando en Sur 125',
      categoria: 'PUBLIRREPORTAJE • SELLO DE TRADICIÓN',
      sector: 'Tlacotal',
      fecha: 'Negocio Fundador',
      autor: 'Redacción Raíces',
      contenidoCompleto: 'Don Arnulfo llegó a la esquina de Sur 125 y Oriente 100-A en 1988. Con horno de ladrillo original y recetas sin conservadores, La Espiga de Tlacotal ahora recibe pedidos de charolas familiares directamente desde nuestro directorio.',
      foto: '',
      patrocinado: true
    }
  ],
  negocios: [
    {
      id: 'neg1',
      nombre: 'Carnitas y Chicharrón "El Patrón del Bramadero"',
      giro: 'Comida y Antojitos',
      sector: 'Bramadero',
      calle: 'Sur 163 casi esq. Oriente 108 (Junto al Mercado Bramadero)',
      anioFundacion: 1994,
      plan: 'PRO',
      cupon: '🎁 OFERTA DEL JUEVES Y VIERNES: 1/2 litro de salsa de habanero y nopales gratis al pedir 1 kg de carnitas mencionando Raíces de Iztacalco.',
      historia: 'Más de 30 años preparando carnitas estilo Michoacán en cazo de cobre para las familias de la sección Bramadero.',
      foto: '',
      whatsapp: '5512345678',
      catalogo: [
        { nombre: '1 Kg de Carnitas Surtidas (Maciza, Costilla, Cuerito)', precio: 290 },
        { nombre: '1/2 Kg de Carnitas + Tortillas hechas a mano', precio: 155 },
        { nombre: 'Orden de 4 Tacos bien servidos', precio: 110 }
      ]
    },
    {
      id: 'neg2',
      nombre: 'Panadería Artesanal "La Espiga de Tlacotal"',
      giro: 'Comida y Antojitos',
      sector: 'Tlacotal',
      calle: 'Sur 125 esq. Oriente 100-A (Frente a Mi Mercado Tlacotal)',
      anioFundacion: 1988,
      plan: 'PRO',
      cupon: '🥐 CUPÓN VECINAL: 6 Conchas rellenas de nata o chocolate por $95 MXN pidiendo desde la página.',
      historia: 'Horneando pan tradicional desde 1988 en el corazón de la sección Tlacotal.',
      foto: '',
      whatsapp: '5512345678',
      catalogo: [
        { nombre: 'Charola de 10 piezas de pan dulce tradicional', precio: 135 },
        { nombre: 'Paquete de 6 Conchas rellenas de nata', precio: 95 },
        { nombre: 'Rosca familiar de mantequilla recién horneada', precio: 180 }
      ]
    }
  ],
  tianguis: [
    {
      id: 't1',
      producto: 'Bicicleta Urbana Rodada 26 con Canastilla y Luces LED ($1,850 MXN)',
      sector: 'Bramadero',
      puntoEntrega: 'Explanada Alcaldía Iztacalco • Vecino: Carlos M.',
      destacado: true,
      descripcion: 'Ideal para moverse por la ciclovía o ir al mercado. Frenos recién ajustados, llantas al 90% de vida. Entrego frente a Ventanilla Única de la Alcaldía.',
      foto: '',
      whatsapp: '5512345678'
    },
    {
      id: 't2',
      producto: 'Charola de 6 Roles de Canela Glaseados Recién Horneados ($140 MXN)',
      sector: 'Tlacotal',
      puntoEntrega: 'Entrada Mercado Tlacotal • Repostería Ceci',
      destacado: true,
      descripcion: 'Horneamos sábado y domingo por la mañana. Pide por WhatsApp y recoge calientitos en la entrada principal de Mi Mercado Tlacotal o Metro Iztacalco.',
      foto: '',
      whatsapp: '5512345678'
    }
  ],
  mascotas: [
    {
      id: 'm1',
      tipo: '🔥 PERDIDO • BOOST VECINAL ACTIVO',
      nombre: 'Se busca a "Canelo" (Perrito mestizo color miel)',
      sector: 'Bramadero',
      calle: 'Sur 159 esquina Oriente 106 (Cerca del Mercado Bramadero)',
      descripcion: 'Se salió asustado ayer por la tarde. Es de talla mediana, muy noble, lleva collar azul con plaquita y un lunar oscuro cerca de la nariz. Su familia lo extraña mucho y ofrece gratificación.',
      foto: '',
      destacado: true,
      whatsapp: '5512345678'
    },
    {
      id: 'm2',
      tipo: '🐾 ENCONTRADO EN RESGUARDO',
      nombre: 'Perrito Schnauzer gris encontrado sano y salvo',
      sector: 'Av. Té / Alcaldía',
      calle: 'Alrededores de la Explanada de la Alcaldía Iztacalco y Av. Té',
      descripcion: 'Lo encontramos caminando solito cerca de la explanada. Trae pechera roja limpia pero sin placa. Está tomando agua y resguardado; buscamos a sus dueños presentando foto.',
      foto: '',
      destacado: false,
      whatsapp: '5512345678'
    }
  ],
  oficios: [
    {
      id: 'o1',
      oficio: 'Plomero y Destapacaños Urgente 24/7 — Maestro Jorge Ramírez',
      sector: 'Bramadero',
      calle: 'Base en Sur 157 • Llega en 15 minutos a domicilio',
      garantia: '22 años de experiencia en la Ramos Millán. Reparación de fugas de agua y gas, bombas hidroneumáticas, boilers, lavado de tinacos y destapacaños con máquina.',
      foto: '',
      whatsapp: '5512345678'
    },
    {
      id: 'o2',
      oficio: 'Cerrajería Residencial y Automotriz "Hnos. Castillo"',
      sector: 'Tlacotal',
      calle: 'Oriente 100-A junto a Mi Mercado Tlacotal',
      garantia: 'Aperturas de puertas y autos las 24 horas sin dañar tu chapa, cambios de combinación, chapas de alta seguridad y duplicado de llaves con chip.',
      foto: '',
      whatsapp: '5512345678'
    }
  ],
  empleos: [
    {
      id: 'e1',
      puesto: 'Ayudante de Mostrador y Atención a Clientes ($1,900 semanales)',
      sector: 'Tlacotal',
      negocio: 'Panadería La Espiga de Tlacotal • Sur 125 esq. Oriente 100-A',
      requisitos: 'Buscamos vecino o vecina mayor de edad con trato amable para despacho de pan y cobro en caja. Turno matutino o vespertino, incluye pan de casa diario y descanso fijo.',
      foto: '',
      whatsapp: '5512345678'
    },
    {
      id: 'e2',
      puesto: 'Repartidor en Bicicleta o Moto Propia ($2,100 semanales + propinas)',
      sector: 'Cuchilla',
      negocio: 'Ferretería Casa Morales • Sur 149 esq. Oriente 106',
      requisitos: 'Solo para entregas locales dentro de la colonia Gabriel Ramos Millán e Iztacalco. Indispensable conocer bien las calles Sur y Oriente. Horario de 9:00 a 17:30 h.',
      foto: '',
      whatsapp: '5512345678'
    }
  ]
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
          DB.noticias.unshift({
            id: pub.id,
            titulo: tituloOk,
            sector: pub.sector || 'Bramadero',
            ubicacion: subdatoOk,
            descripcion: detallesOk,
            fecha: pub.fecha || 'Hoy',
            foto: fotoOk
          });
        } else if (cat === 'FOTO_HISTORIA') {
          DB.cronicas.unshift({
            id: pub.id,
            titulo: tituloOk,
            categoria: '📷 MEMORIA VECINAL',
            sector: pub.sector || 'Bramadero',
            fecha: pub.fecha || 'Reciente',
            autor: subdatoOk,
            contenidoCompleto: detallesOk,
            foto: fotoOk,
            patrocinado: false
          });
        } else if (cat === 'MASCOTA') {
          const esBoost = String(pub.modalidad).includes('Boost');
          DB.mascotas.unshift({
            id: pub.id,
            tipo: esBoost ? '🔥 PERDIDO • BOOST URGENTE ACTIVO' : '🐾 REPORTE VECINAL DE MASCOTA',
            nombre: tituloOk,
            sector: pub.sector || 'Bramadero',
            calle: subdatoOk,
            descripcion: detallesOk,
            foto: fotoOk,
            destacado: esBoost,
            whatsapp: pub.whatsapp || ADMIN_WHATSAPP
          });
        } else if (cat === 'OFICIO') {
          DB.oficios.unshift({
            id: pub.id,
            oficio: tituloOk,
            sector: pub.sector || 'Bramadero',
            calle: subdatoOk,
            garantia: detallesOk,
            foto: fotoOk,
            whatsapp: pub.whatsapp || ADMIN_WHATSAPP
          });
        } else if (cat === 'EMPLEO') {
          DB.empleos.unshift({
            id: pub.id,
            puesto: tituloOk,
            sector: pub.sector || 'Bramadero',
            negocio: subdatoOk,
            requisitos: detallesOk,
            foto: fotoOk,
            whatsapp: pub.whatsapp || ADMIN_WHATSAPP
          });
        } else if (cat === 'TIANGUIS') {
          DB.tianguis.unshift({
            id: pub.id,
            producto: tituloOk,
            sector: pub.sector || 'Bramadero',
            puntoEntrega: subdatoOk,
            destacado: String(pub.modalidad).includes('Destacado'),
            descripcion: detallesOk,
            foto: fotoOk,
            whatsapp: pub.whatsapp || ADMIN_WHATSAPP
          });
        } else if (cat === 'NEGOCIO') {
          DB.negocios.unshift({
            id: pub.id,
            nombre: tituloOk,
            giro: 'Comida y Antojitos',
            sector: pub.sector || 'Bramadero',
            calle: subdatoOk,
            anioFundacion: 2020,
            plan: String(pub.modalidad).includes('Pro') ? 'PRO' : 'BASICO',
            cupon: detallesOk || 'Promoción vecinal activa',
            historia: 'Comercio local de la Colonia Gabriel Ramos Millán.',
            foto: fotoOk,
            whatsapp: pub.whatsapp || ADMIN_WHATSAPP,
            catalogo: [{ nombre: 'Pedido o Promoción Vecinal', precio: 100 }]
          });
        }
      });
    }

    if (typeof window.onPageRender === 'function') {
      window.onPageRender();
    }
  } catch (err) {
    console.warn('Usando datos locales:', err);
  }
}

// ============================================================================
// MENÚ GLOBAL CON TODAS LAS SECCIONES INDEPENDIENTES
// ============================================================================
function renderSharedLayout(activePage) {
  const navItems = [
    { id: 'inicio', label: '🏠 Inicio', href: 'index.html' },
    { id: 'guia', label: '📖 Guía', href: 'guia.html' },
    { id: 'noticias', label: '🗞️ Noticias Colonia', href: 'noticias.html', badge: 'Vecinal' },
    { id: 'cronicas', label: '📷 Crónicas y Raíces', href: 'cronicas.html' },
    { id: 'comercio', label: '🏪 Comercio', href: 'comercio.html' },
    { id: 'tianguis', label: '🛍️ Tianguis', href: 'tianguis.html' },
    { id: 'mascotas', label: '🐾 Mascotas', href: 'mascotas.html' },
    { id: 'oficios', label: '🛠️ Oficios', href: 'oficios.html' },
    { id: 'empleos', label: '💼 Empleos', href: 'empleos.html' },
    { id: 'anunciate', label: '➕ Publicar / Subir', href: 'anunciate.html', cta: true }
  ];

  const nowStr = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const headerContainer = document.getElementById('shared-header');
  if (headerContainer) {
    headerContainer.innerHTML = `
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
              <a href="guia.html" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 hover:bg-amber-200 font-bold text-xs transition">
                <span>📖 ¿Cómo funciona la página?</span>
              </a>
              <a href="anunciate.html" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-terracota text-white font-bold text-xs transition">
                <span>➕ Subir Publicación</span>
              </a>
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

          <!-- Filtro Global por Sector -->
          <div class="border-t-2 border-b border-tinta py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
              <span class="text-xs font-mono uppercase font-bold text-tinta shrink-0 mr-1">📍 Sector:</span>
              ${['TODOS', 'Bramadero', 'Tlacotal', 'Cuchilla', 'Av. Té / Alcaldía', 'Coyuya / Plutarco'].map(sec => `
                <button onclick="changeGlobalSector('${sec}')" class="px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${currentSector === sec ? 'bg-terracota text-white' : 'bg-crema text-tinta hover:bg-stone-200'}">
                  ${sec === 'TODOS' ? 'Toda la Ramos Millán' : sec}
                </button>
              `).join('')}
