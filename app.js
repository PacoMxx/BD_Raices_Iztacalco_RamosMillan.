/**
 * ============================================================================
 * ARCHIVO CENTRAL: app.js — RAÍCES DE IZTACALCO (EDICIÓN GABRIEL RAMOS MILLÁN)
 * Conecta las 6 páginas independientes, el menú, los candados y Google Sheets
 * ============================================================================
 */

// 1. PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT (termina en /exec):
const GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz_yuI8WhbZFM79eoLqJhRfB5C9fAAMRb896IVKb9nHHKzX_AIK4u2RUR9k6jvm6Je7dA/exec";

// 2. PON AQUÍ TU WHATSAPP DE ADMINISTRADOR (10 dígitos):
const ADMIN_WHATSAPP = "5510803153";

// 3. PEGA AQUÍ TUS LINKS REALES DE MERCADO PAGO:
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

// Configuración visual global de Tailwind para todas las páginas
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

// Estado global compartido
let currentSector = localStorage.getItem('raices_sector') || 'TODOS';
let searchQuery = '';
const businessCarts = {};
let lastFormSubmitTimestamp = 0;

// CANDADO 1: Sanitizador Anti-XSS
function sanitizeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

// ============================================================================
// DATOS BASE DE LA COLONIA GABRIEL RAMOS MILLÁN (Se combinan con Google Sheets)
// ============================================================================
const DB = {
  ticker: "🎸 Concierto en Estadio GNP (20:30 h): Tráfico pesado en Río Churubusco, Viaducto y Av. Té • ⛺ Tianguis Hoy: Sur 163 (Mercado Bramadero) hasta las 17:00 h.",
  patrocinadorTicker: "Servicio Mecánico Hnos. Pérez (Sur 157)",
  cronicas: [
    {
      id: 'c1',
      titulo: 'El Mercado 204 Bramadero: Más de medio siglo siendo el corazón del abasto en Sur 163',
      categoria: 'RAÍCES E HISTORIA',
      sector: 'Bramadero',
      fecha: 'Crónica de la Semana',
      resumen: 'Desde las primeras romerías hasta convertirse en el punto donde convergen tres generaciones de familias iztacalquenses cada domingo.',
      contenidoCompleto: 'Fundado para abastecer a las familias trabajadoras que poblaron la sección Bramadero, el Mercado 204 conserva locales atendidos por los nietos de sus fundadores originales: desde chiles secos y moles artesanales hasta las tradicionales carnitas.',
      patrocinado: false
    },
    {
      id: 'c2',
      titulo: 'El Rincón de la Ramos: "Panadería Tradicional La Espiga de Tlacotal", 38 años horneando en Sur 125',
      categoria: 'PUBLIRREPORTAJE • SELLO DE TRADICIÓN',
      sector: 'Tlacotal',
      fecha: 'Negocio Fundador',
      resumen: 'Don Arnulfo llegó a la esquina de Sur 125 y Oriente 100-A en 1988. Hoy sus conchas de mantequilla y bolillos calientes siguen saliendo a las 6:30 AM.',
      contenidoCompleto: 'Con horno de ladrillo original y recetas sin conservadores, La Espiga de Tlacotal ahora recibe pedidos de charolas familiares y pasteles directamente desde el directorio de Raíces de Iztacalco.',
      patrocinado: true
    },
    {
      id: 'c3',
      titulo: 'De Santa Anita a Avenida Recreo: Cuando las canoas de flores cruzaban cerca de nuestra colonia',
      categoria: 'MEMORIA DE IZTACALCO',
      sector: 'Coyuya / Plutarco',
      fecha: 'Archivo Histórico',
      resumen: 'A pocos minutos de Metro Coyuya y Plutarco Elías Calles estuvo el embarcadero más famoso del México antiguo durante el Viernes de Dolores.',
      contenidoCompleto: 'El Paseo de la Viga y el pueblo originario de Santa Anita Zacatlamanco marcaron la vocación comerciante y festiva que heredaron las colonias contiguas como la Gabriel Ramos Millán.',
      patrocinado: false
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
      whatsapp: '5512345678',
      catalogo: [
        { nombre: 'Charola de 10 piezas de pan dulce tradicional', precio: 135 },
        { nombre: 'Paquete de 6 Conchas rellenas de nata', precio: 95 },
        { nombre: 'Rosca familiar de mantequilla recién horneada', precio: 180 }
      ]
    },
    {
      id: 'neg3',
      nombre: 'Veterinaria y Estética Canina "Huellitas Sur 125"',
      giro: 'Salud y Mascotas',
      sector: 'Tlacotal',
      calle: 'Sur 125 #412 entre Av. Recreo y Oriente 102',
      anioFundacion: 2009,
      plan: 'PRO',
      cupon: '🐾 PROMO VECINAL: Corte de uñas y revisión dental gratis al agendar baño o estética.',
      historia: 'Cuidando a las mascotas de la Ramos Millán con médicos veterinarios titulados.',
      whatsapp: '5512345678',
      catalogo: [
        { nombre: 'Baño y Estética Canina Raza Pequeña/Mediana', precio: 220 },
        { nombre: 'Consulta Médica General + Desparasitación', precio: 250 },
        { nombre: 'Paquete Vacunación Anual Séxtuple', precio: 380 }
      ]
    },
    {
      id: 'neg4',
      nombre: 'Ferretería y Tlapalería "Casa Morales"',
      giro: 'Talleres y Tlapalerías',
      sector: 'Cuchilla',
      calle: 'Sur 149 esq. Oriente 106, Secc. Cuchilla Ramos Millán',
      anioFundacion: 1985,
      plan: 'PRO',
      cupon: '🔧 ENVÍO GRATIS a domicilio dentro de la Ramos Millán en compras mayores a $250 MXN.',
      historia: '41 años resolviendo emergencias de plomería, electricidad y pintura en la colonia.',
      whatsapp: '5512345678',
      catalogo: [
        { nombre: 'Kit Reparación Fuga de WC Universal', precio: 145 },
        { nombre: 'Cubeta Impermeabilizante Fibratado 5 Años (19L)', precio: 890 },
        { nombre: 'Juego de Llaves Mezcladoras para Fregadero', precio: 320 }
      ]
    },
    {
      id: 'neg5',
      nombre: 'Cocina Económica "Doña Lupe - Sazón de Casa"',
      giro: 'Comida y Antojitos',
      sector: 'Av. Té / Alcaldía',
      calle: 'Av. Té a media cuadra de la Explanada de la Alcaldía Iztacalco',
      anioFundacion: 2016,
      plan: 'BASICO',
      horario: 'Lunes a Sábado de 12:30 a 17:00 h'
    },
    {
      id: 'neg6',
      nombre: 'Barbería y Peluquería Clásica "Don Fidel"',
      giro: 'Belleza y Barberías',
      sector: 'Coyuya / Plutarco',
      calle: 'Av. Plutarco Elías Calles cerca de Metro Coyuya',
      anioFundacion: 1999,
      plan: 'BASICO',
      horario: 'Martes a Domingo de 10:00 a 20:00 h'
    }
  ],
  tianguis: [
    {
      id: 't1',
      producto: 'Bicicleta Urbana Rodada 26 con Canastilla y Luces LED (Seminueva)',
      precio: '$1,850 MXN',
      vendedor: 'Vecino: Carlos M. (Sur 157)',
      sector: 'Bramadero',
      puntoEntrega: 'Explanada Alcaldía Iztacalco',
      destacado: true,
      descripcion: 'Ideal para moverse por la ciclovía o ir al mercado. Frenos recién ajustados, llantas al 90%. Entrego frente a Ventanilla Única de la Alcaldía.',
      whatsapp: '5512345678'
    },
    {
      id: 't2',
      producto: 'Charola de Roles de Canela Glaseados Recién Horneados (Sobre Pedido)',
      precio: '$140 MXN (6 piezas grandes)',
      vendedor: 'Emprendimiento: Repostería Ceci & Fam',
      sector: 'Tlacotal',
      puntoEntrega: 'Entrada Mercado Tlacotal',
      destacado: true,
      descripcion: 'Horneamos sábado y domingo por la mañana. Pide por WhatsApp y recoge calientitos en la entrada de Mi Mercado Tlacotal o Metro Iztacalco.',
      whatsapp: '5512345678'
    },
    {
      id: 't3',
      producto: 'Escritorio Compacto de Madera para Home Office o Estudiante',
      precio: '$650 MXN',
      vendedor: 'Vecina: Laura G.',
      sector: 'Av. Té / Alcaldía',
      puntoEntrega: 'Metro Iztacalco (Línea 8)',
      destacado: false,
      descripcion: 'Mide 100x50 cm, cabe perfecto en departamento. Sin detalles, lo vendo por mudanza.',
      whatsapp: '5512345678'
    },
    {
      id: 't4',
      producto: 'Lote de 4 Sudaderas y Chamarra de Mezclilla Talla M (Excelente Estado)',
      precio: '$320 MXN por el paquete',
      vendedor: 'Vecina: Mariana R.',
      sector: 'Bramadero',
      puntoEntrega: 'Entrada Mercado Bramadero',
      destacado: false,
      descripcion: 'Ropa de segunda mano seleccionada, limpia y sin desgaste. Entrego sábado a mediodía en la entrada principal del Mercado 204.',
      whatsapp: '5512345678'
    }
  ],
  mascotas: [
    {
      id: 'm1',
      tipo: 'PERDIDO • BOOST VECINAL ACTIVO',
      nombre: 'Se busca a "Canelo" (Mestizo miel, collar azul)',
      sector: 'Bramadero',
      calle: 'Visto por última vez en Sur 159 esq. Oriente 106',
      descripcion: 'Se salió asustado ayer por la tarde. Es muy noble y lleva placa con teléfono. Se ofrece gratificación.',
      destacado: true,
      whatsapp: '5512345678'
    },
    {
      id: 'm2',
      tipo: 'ENCONTRADO EN RESGUARDO',
      nombre: 'Perrito Schnauzer gris encontrado cerca de Av. Té',
      sector: 'Av. Té / Alcaldía',
      calle: 'Resguardado cerca de la Explanada de la Alcaldía Iztacalco',
      descripcion: 'Trae pechera roja sin plaquita. Buscamos a su familia presentando foto de comprobación.',
      destacado: false,
      whatsapp: '5512345678'
    },
    {
      id: 'm3',
      tipo: 'ADOPCIÓN RESPONSABLE',
      nombre: 'Cachorrita de 3 meses desparasitada busca hogar en la colonia',
      sector: 'Tlacotal',
      calle: 'Sección Tlacotal (Sur 125)',
      descripcion: 'Talla mediana, súper cariñosa y conviviente con niños. Se entrega con cartilla.',
      destacado: false,
      whatsapp: '5512345678'
    }
  ],
  oficios: [
    {
      id: 'o1',
      oficio: 'Plomero y Destapacaños Urgente 24/7',
      nombre: 'Maestro Jorge Ramírez (22 años en la Ramos)',
      sector: 'Bramadero',
      calle: 'Base en Sur 157 • Llega en 15 min',
      calificacion: '4.9 ★ (42 reseñas vecinales)',
      garantia: 'Presupuesto sin costo en fugas de agua, bombas, boilers y tinacos.',
      whatsapp: '5512345678'
    },
    {
      id: 'o2',
      oficio: 'Servicio de Cerrajería Residencial y Automotriz',
      nombre: 'Cerrajería Hnos. Castillo',
      sector: 'Tlacotal',
      calle: 'Oriente 100-A junto al Mercado Tlacotal',
      calificacion: '5.0 ★ (31 reseñas vecinales)',
      garantia: 'Aperturas sin dañar tu chapa, duplicados y cambio de combinación.',
      whatsapp: '5512345678'
    },
    {
      id: 'o3',
      oficio: 'Electricista Doméstico y Cortocircuitos',
      nombre: 'Téc. Armando Solís',
      sector: 'Cuchilla',
      calle: 'Sur 145, Secc. Cuchilla Ramos Millán',
      calificacion: '4.8 ★ (19 reseñas vecinales)',
      garantia: 'Revisión de centros de carga, tierras físicas, apagadores y bombas.',
      whatsapp: '5512345678'
    }
  ],
  empleos: [
    {
      id: 'e1',
      puesto: 'Ayudante de Mostrador y Atención a Clientes',
      negocio: 'Panadería La Espiga de Tlacotal',
      sector: 'Tlacotal',
      calle: 'Sur 125 esq. Oriente 100-A',
      sueldo: '$1,900 MXN semanales + pan de casa',
      requisitos: 'Mayor de edad, trato amable con los vecinos, vivir en la Ramos Millán o cerca.',
      whatsapp: '5512345678'
    },
    {
      id: 'e2',
      puesto: 'Repartidor en Bicicleta o Moto Propia (Solo Iztacalco)',
      negocio: 'Ferretería Casa Morales',
      sector: 'Cuchilla',
      calle: 'Sur 149, Secc. Cuchilla',
      sueldo: '$2,100 MXN semanales + propinas íntegras',
      requisitos: 'Conocer bien las calles Sur y Oriente de la colonia. Horario de 9:00 a 17:30 h.',
      whatsapp: '5512345678'
    }
  ]
};

// ============================================================================
// SINCRONIZACIÓN AUTOMÁTICA CON GOOGLE SHEETS (Cuando GOOGLE_SHEETS_WEBAPP_URL está activo)
// ============================================================================
async function syncWithGoogleSheets() {
  if (!GOOGLE_SHEETS_WEBAPP_URL) return;
  try {
    const res = await fetch(GOOGLE_SHEETS_WEBAPP_URL);
    const data = await res.json();

    // 1. Alertas Viales
    if (data.alertas && data.alertas.length > 0) {
      const a = data.alertas[0];
      DB.ticker = `🚗 Vialidad: ${a.Estado_Vial || ''} • 🎸 Evento: ${a.Evento_Deportiva || ''} • ⛺ Tianguis Hoy: ${a.Tianguis_Hoy || ''}`;
      const tickerEl = document.getElementById('ticker-text');
      if (tickerEl) tickerEl.textContent = DB.ticker;
    }

    // 2. Fotos e Historias Aprobadas en Crónicas y Raíces
    if (data.cronicas && data.cronicas.length > 0) {
      const nuevasCronicas = data.cronicas.map((c, idx) => ({
        id: `sh_c_${idx}`,
        titulo: c.Titulo_Lugar || 'Memoria de la Ramos Millán',
        categoria

// ============================================================================
// CABECERA, MENÚ MULTIPÁGINA Y PIE DE PÁGINA AUTOMÁTICOS
// ============================================================================
function renderSharedLayout(activePage) {
  const navItems = [
    { id: 'inicio', label: '🏠 Portada', href: 'index.html' },
    { id: 'guia', label: '📖 ¿Cómo usar la página?', href: 'guia.html', badge: 'Guía Vecinal' },
    { id: 'cronicas', label: '📰 Crónicas y Raíces', href: 'cronicas.html' },
    { id: 'comercio', label: '🏪 Comercio de Barrio', href: 'comercio.html', badge: 'Ofertas' },
    { id: 'tianguis', label: '🛍️ Tianguis Digital', href: 'tianguis.html' },
    { id: 'comunidad', label: '🚨 Mascotas, Oficios y Empleo', href: 'comunidad.html' },
    { id: 'anunciate', label: '➕ Publicar / Anúnciate', href: 'anunciate.html', cta: true }
  ];

  const nowStr = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const headerContainer = document.getElementById('shared-header');
  if (headerContainer) {
    headerContainer.innerHTML = `
      <!-- Ticker Vial Superior -->
      <div class="bg-tinta text-papel text-xs border-b border-stone-800 sticky top-0 z-50">
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

      <!-- Masthead del Periódico -->
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
                <span>📖 ¿Cómo funciona esta página?</span>
              </a>
              <button onclick="installPWA()" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-terracota/10 text-terracota hover:bg-terracota hover:text-white font-bold text-xs transition">
                <span>📲 Instalar App</span>
              </button>
            </div>
          </div>

          <div class="py-4 text-center">
            <a href="index.html" class="inline-block group">
              <p class="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-terracota font-bold mb-1">
                « DONDE LA MEMORIA DE NUESTRAS CALLES SE UNE AL COMERCIO DE BARRIO »
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

          <!-- Barra de Navegación Multipágina (Desktop) -->
          <nav class="hidden lg:flex items-center justify-center flex-wrap gap-1.5 pt-3" aria-label="Páginas del periódico">
            ${navItems.map(item => {
              const isActive = activePage === item.id;
              if (item.cta) {
                return `<a href="${item.href}" class="px-4 py-2 rounded-lg font-bold text-xs sm:text-sm text-white bg-terracota hover:bg-terracotaDark shadow-sm transition ml-2">${item.label}</a>`;
              }
              return `
                <a href="${item.href}" class="px-3.5 py-2 rounded-t-lg text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition ${isActive ? 'border-terracota text-terracota font-extrabold bg-crema/70' : 'border-transparent text-grafito hover:text-tinta font-semibold'}">
                  <span>${item.label}</span>
                  ${item.badge ? `<span class="text-[10px] font-mono bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded-full font-bold">${item.badge}</span>` : ''}
                </a>
              `;
            }).join('')}
          </nav>
        </div>
      </header>
    `;
  }

  // Footer compartido con Candado 3 (Deslinde Legal Vecinal) y Navegación Móvil
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
                Periódico digital comunitario dividido por secciones independientes para rescatar nuestra historia e impulsar el comercio de barrio sin comisiones.
              </p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs">
                <a href="guia.html" class="text-amber-300 underline font-semibold">📖 Manual de Uso Vecinal</a>
                <span>•</span>
                <a href="anunciate.html" class="text-amber-300 underline font-semibold">➕ Anunciar mi Negocio</a>
              </div>
            </div>

            <div>
              <h5 class="font-mono text-xs uppercase font-bold text-white mb-2">Secciones Independientes</h5>
              <ul class="text-xs text-stone-300 space-y-1.5">
                <li><a href="index.html" class="hover:text-amber-300">🏠 Portada Principal y Selector de Secciones</a></li>
                <li><a href="guia.html" class="hover:text-amber-300">📖 Guía Paso a Paso: ¿Cómo usar la página?</a></li>
                <li><a href="cronicas.html" class="hover:text-amber-300">📰 Crónicas, Historia y Avisos Viales</a></li>
                <li><a href="comercio.html" class="hover:text-amber-300">🏪 Directorio de Comercio con Pedidos WhatsApp</a></li>
                <li><a href="tianguis.html" class="hover:text-amber-300">🛍️ El Tianguis Digital (Entregas Seguras)</a></li>
                <li><a href="comunidad.html" class="hover:text-amber-300">🚨 Mascotas Perdidas, Oficios y Empleo Local</a></li>
              </ul>
            </div>

            <!-- CANDADO 3: Aviso Legal Vecinal -->
            <div class="p-4 rounded-xl bg-stone-900 border border-stone-700">
              <h5 class="font-mono text-xs uppercase font-bold text-amber-400 mb-1.5">🛡️ Candado de Seguridad Vecinal</h5>
              <p class="text-[11px] text-stone-300 leading-relaxed">
                <strong>Raíces de Iztacalco</strong> es un directorio informativo comunitario. Los pedidos por WhatsApp y tratos del Tianguis Digital se realizan directamente entre vecinos y comercios. Recomendamos acordar entregas únicamente en puntos públicos seguros (Explanada de la Alcaldía, Metro Iztacalco/Coyuya, entradas de Mercados) y nunca depositar por adelantado a desconocidos. Los cobros de publicidad se procesan exclusivamente mediante enlaces encriptados de <strong>Mercado Pago</strong>.
              </p>
            </div>
          </div>
          <div class="pt-4 border-t border-stone-800 text-center text-[11px] text-stone-400">
            © 2026 Raíces de Iztacalco — Colonia Gabriel Ramos Millán, Alcaldía Iztacalco, CDMX.
          </div>
        </div>
      </footer>

      <!-- Barra Inferior Fija para Celulares (Multipágina) -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-borde z-50 px-1.5 py-1.5 shadow-lg">
        <div class="grid grid-cols-6 gap-1 max-w-lg mx-auto text-center">
          <a href="index.html" class="flex flex-col items-center py-1 rounded-lg ${activePage === 'inicio' ? 'text-terracota font-extrabold bg-amber-50' : 'text-grafito'}">
            <span class="text-base leading-none">🏠</span>
            <span class="text-[9px] mt-1">Inicio</span>
          </a>
          <a href="guia.html" class="flex flex-col items-center py-1 rounded-lg ${activePage === 'guia' ? 'text-terracota font-extrabold bg-amber-50' : 'text-grafito'}">
            <span class="text-base leading-none">📖</span>
            <span class="text-[9px] mt-1">Guía</span>
          </a>
          <a href="cronicas.html" class="flex flex-col items-center py-1 rounded-lg ${activePage === 'cronicas' ? 'text-terracota font-extrabold bg-amber-50' : 'text-grafito'}">
            <span class="text-base leading-none">📰</span>
            <span class="text-[9px] mt-1">Crónicas</span>
          </a>
          <a href="comercio.html" class="flex flex-col items-center py-1 rounded-lg ${activePage === 'comercio' ? 'text-terracota font-extrabold bg-amber-50' : 'text-grafito'}">
            <span class="text-base leading-none">🏪</span>
            <span class="text-[9px] mt-1">Comercio</span>
          </a>
          <a href="tianguis.html" class="flex flex-col items-center py-1 rounded-lg ${activePage === 'tianguis' ? 'text-terracota font-extrabold bg-amber-50' : 'text-grafito'}">
            <span class="text-base leading-none">🛍️</span>
            <span class="text-[9px] mt-1">Tianguis</span>
          </a>
          <a href="comunidad.html" class="flex flex-col items-center py-1 rounded-lg ${activePage === 'comunidad' ? 'text-terracota font-extrabold bg-amber-50' : 'text-grafito'}">
            <span class="text-base leading-none">🚨</span>
            <span class="text-[9px] mt-1">Vecinos</span>
          </a>
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

function installPWA() {
  alert('Para instalar Raíces de Iztacalco como App en tu celular:\n\n• En Android (Chrome): Toca el menú (⋮) arriba a la derecha y elige "Agregar a la pantalla principal".\n• En iPhone (Safari): Toca el botón Compartir y selecciona "Agregar a inicio".');
}
