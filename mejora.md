# Análisis de Código y Usabilidad (UX/UI) — Raíces de Iztacalco

Este documento presenta el diagnóstico técnico y de experiencia de usuario del proyecto **Raíces de Iztacalco (Edición Col. Gabriel Ramos Millán)**, junto con propuestas de mejora priorizadas y accionables.

---

## 1. Resumen Ejecutivo

**Fortalezas actuales del proyecto:**
- **Identidad hiperlocal clara y cálida:** Excelente elección cromática (`papel`, `crema`, `terracota`, `chinampa`, `maiz`) y tipográfica (*Fraunces* + *Plus Jakarta Sans*) que evoca un periódico comunitario de barrio.
- **Enfoque práctico sin fricción de cuenta:** Conexión directa vía WhatsApp entre vecinos y comerciantes sin requerir registro de usuario ni inicio de sesión.
- **Arquitectura ligera:** Fácil de desplegar en cualquier hosting estático sincronizando datos con Google Sheets.

**Principales áreas de oportunidad:**
1. Ausencia de estados de carga (*loading*) y estados vacíos (*empty states*) cuando se filtra o se consulta Google Sheets.
2. Bugs de interacción en el filtro global (el buscador se borra visualmente al cambiar de sector) y funciones incompletas en el mapa y catálogo de **Comercio de Barrio**.
3. Fricción y riesgo de pérdida de datos en el flujo de pago con Mercado Pago en **Publicar (`anunciate.html`)**.
4. Problemas de legibilidad para adultos mayores (tamaños de fuente de `9px` a `11px`), accesibilidad y navegación móvil incompleta.
5. Errores técnicos en el manejo de comillas en eventos `onclick`, falta de sanitización HTML y páginas desincronizadas (`comunidad.html`).

---

## 2. Hallazgos de Usabilidad (UX/UI) y Propuestas de Mejora

### 2.1. Estados Vacíos (*Empty States*) y Retroalimentación de Carga (*Loading*)

- **Problema detectado:**
  - En `app.js`, las colecciones `tianguis`, `mascotas`, `oficios` y `empleos` inician vacías (`[]`) hasta que `syncWithGoogleSheets()` responde.
  - En `mascotas.html`, `oficios.html`, `empleos.html`, `tianguis.html` y en la barra lateral de `index.html`, si aún están cargando los datos, si falla la red o si el vecino selecciona un sector/búsqueda sin resultados, **los contenedores quedan totalmente en blanco (`innerHTML = ''`)**, dando la impresión de que la página está rota.
- **Propuesta de mejora:**
  - **Indicador de carga (*Skeletons*):** Mostrar tarjetas esqueleto animadas (`animate-pulse`) mientras `syncWithGoogleSheets()` está en curso.
  - **Estado vacío con llamada a la acción (CTA):** Cuando un filtro o sección no tenga elementos, mostrar un mensaje amigable como:
    > *"Aún no hay anuncios de [Categoría] en el sector **[Sector]**. ¡Sé el primero en publicar o cambia el filtro a «Toda la Ramos Millán»!"* acompañado de un botón para limpiar filtros o publicar.

---

### 2.2. Buscador Global y Filtro por Sectores (`app.js`)

- **Problema detectado:**
  - En `app.js` (líneas 382–388), la función `changeGlobalSector(sec)` vuelve a ejecutar `renderSharedLayout(currentPageId)`, reemplazando todo el `innerHTML` de `#shared-header`.
  - **Efecto negativo en UX:** Si el usuario escribió algo en el buscador (`searchQuery`) y luego hace clic en un botón de sector (ej. *Bramadero*), el texto del `<input type="search">` se borra visualmente de la caja de texto, pero la variable `searchQuery` sigue activa en memoria filtrando resultados sin que el usuario sepa por qué no aparecen elementos.
  - Además, al re-renderizar todo el header se pierde la posición del scroll horizontal en la barra de sectores y menú en móviles.
- **Propuesta de mejora:**
  - En `changeGlobalSector(sec)`, actualizar únicamente las clases activas de los botones (`[data-sec-btn]`) en lugar de reconstruir todo el encabezado, o bien preservar `value="${sanitizeHTML(searchQuery)}"` en el input.
  - Añadir un indicador visible de filtros activos (ej. *"Mostrando 3 resultados en Bramadero para «plomero» — [Limpiar filtros]"*).
  - Añadir un pequeño `debounce` (150–250 ms) en `changeGlobalSearch` para evitar re-renderizados excesivos en cada tecla.

---

### 2.3. Flujo de Publicación y Pago en `anunciate.html`

- **Problema detectado:**
  1. **Riesgo de pérdida de anuncios pagados:** Cuando el usuario llena el formulario de una categoría de pago (`TIANGUIS`, `OFICIO`, `EMPLEO`, `NEGOCIO`, `MASCOTA Boost`) y pulsa el botón principal, **sus datos aún no se guardan**. En su lugar, aparece un recuadro con dos botones: *"Pagar en Mercado Pago ↗"* y *"Ya pagué, enviar registro a revisión ✓"*. Muchos usuarios abrirán Mercado Pago, realizarán el pago y cerrarán la ventana pensando que el proceso terminó, perdiendo todo lo que escribieron sin que el administrador reciba el registro.
  2. **Falta de referencia de pago y contacto de seguimiento:** No se solicita un folio/comprobante de Mercado Pago ni los últimos 4 dígitos o nombre de quien paga para conciliar en Google Sheets. Asimismo, en `NOTICIA` y `FOTO_HISTORIA` el campo `f-wa` está oculto y vacío, por lo que el administrador no tiene forma de contactar al vecino si necesita aclarar algo.
  3. **Pérdida accidental de datos al cambiar de pestaña:** Hacer clic en otro botón de categoría (`setFormCategory`) reemplaza inmediatamente el formulario y borra lo que el usuario estaba escribiendo sin pedir confirmación.
  4. **Calidad de imagen deficiente en vista ampliada:** `handlePhotoPreview` comprime las fotos a `MAX_WIDTH = 360` y calidad JPEG `0.55`. Al abrirlas en el lightbox (`openPhotoLightbox` a `75vh`), las fotos de mascotas perdidas, productos del tianguis o crónicas históricas se ven borrosas y pixeladas.
  5. **Falso positivo de envío:** Se usa `fetch(..., { mode: 'no-cors' })` con un `catch (err) {}` vacío; si el usuario no tiene internet o el script falla, la interfaz muestra igualmente *"✅ ¡Enviado con éxito!"*.
- **Propuesta de mejora:**
  - **Guardar primero como `PENDIENTE_PAGO`:** Enviar el registro a Google Sheets en el momento en que el usuario hace clic en el botón principal (con estado `PENDIENTE_PAGO` y un ID único) **antes** de redirigir a Mercado Pago, y ofrecer un botón directo para enviar el comprobante por WhatsApp al administrador (`ADMIN_WHATSAPP`) con el ID prellenado.
  - **Subir resolución de compresión:** Aumentar `MAX_WIDTH` de `360` a `800` o `900` px con calidad `0.72` (sigue siendo ligero para Google Sheets/JSON y se ve nítido en el lightbox).
  - **Persistir borrador en `localStorage` o advertir al cambiar categoría:** Si los campos tienen texto, preguntar antes de limpiar el formulario.

---

### 2.4. Funcionalidades Incompletas en Comercio de Barrio (`comercio.html`)

- **Problema detectado:**
  1. **Coordenadas fijas en el mapa:** Aunque existe la constante `COORDENADAS_NEGOCIOS` (línea 84), en `initOrUpdateMap()` (líneas 118–125) todos los marcadores se colocan en la coordenada fija `[19.3895, -99.1030]`, encimando todos los negocios en el mismo punto.
  2. **Controles prometidos en el texto que no aparecen en la interfaz:** El encabezado de la página indica *"Selecciona tus productos en la tarjeta del local, ubica su calle exacta en el mapa..."* y *"Toca cualquier marcador o el botón «📍 Ubicar en mapa» dentro de cada anuncio"*. Sin embargo, aunque las funciones `focusBusinessOnMap()`, `updateQty()` y `businessCarts` están programadas en el `<script>`, el HTML generado en `window.onPageRender` (líneas 170–190) **no incluye el botón de ubicar en mapa ni la lista de productos/carrito (`n.catalogo`)**.
  3. **Filtro de giros desconectado de Google Sheets:** En `app.js` (línea 176), todos los negocios sincronizados desde Google Sheets reciben el giro fijo `'Comercio y Servicios'`, el cual no coincide con ninguno de los botones de `GIROS_LISTA` (`Comida y Antojitos`, `Salud y Mascotas`, `Talleres y Tlapalerías`, `Belleza y Barberías`). Al filtrar por cualquier giro específico, los negocios nuevos desaparecen.
- **Propuesta de mejora:**
  - Agregar el selector `<select id="f-giro">` en el formulario de Negocio en `anunciate.html` con las opciones exactas de `GIROS_LISTA`.
  - Renderizar en cada tarjeta de `comercio.html` el botón `📍 Ubicar en mapa` (conectado a `focusBusinessOnMap(n.id)` y abriendo el popup del marcador correspondiente) y el catálogo interactivo si el negocio cuenta con productos.
  - Asignar coordenadas aproximadas por sector (`Bramadero`, `Tlacotal`, `Cuchilla`, `Av. Té / Alcaldía`, `Coyuya / Plutarco`) con un ligero desplazamiento (*jitter*) cuando un negocio no tenga latitud/longitud exacta.

---

### 2.5. Arquitectura de Navegación, Diseño Móvil y Legibilidad

- **Problema detectado:**
  1. **Navegación inferior móvil incompleta:** En `app.js` (líneas 367–375), el menú fijo inferior (`lg:hidden`) solo tiene 5 opciones (`Inicio`, `Noticias`, `Comercio`, `Guía`, `Publicar`), dejando ocultas **5 secciones clave**: `Crónicas`, `Tianguis`, `Mascotas`, `Oficios` y `Empleos`.
  2. **Tamaños de letra demasiado pequeños para el público vecinal:** Se utilizan de forma intensiva clases como `text-[9px]`, `text-[10px]`, `text-[11px]` y `text-xs` (12px). En un periódico barrial cuyo público incluye adultos mayores de la colonia (especialmente en *Crónicas*, *Oficios* y *Noticias*), estos tamaños dificultan la lectura.
  3. **Exceso de altura del encabezado en pantallas móviles:** En celulares, antes de ver el contenido principal de cada sección, el usuario debe desplazar más de 380px de encabezado (cintillo patrocinado + barra alcaldía + título + barra de sectores + buscador + barra de 10 páginas).
  4. **Claridad en el Monitor de Tráfico y Cápsula del Tiempo:**
     - En `index.html`, el monitor vial muestra velocidades exactas (`8 - 14 km/h`, `40 - 55 km/h`) calculadas por hora del reloj local y un arreglo estático de conciertos (`AGENDA_CONCIERTOS_CDMX`). Si un vecino cree que es telemetría en vivo de GPS, puede generar desconfianza.
     - En `cronicas.html`, los botones `📷 Vista 1955 (Chinampas)` y `🏙️ Vista Hoy (Ramos Millán)` muestran exactamente la misma fotografía y solo alternan un filtro CSS sepia (`.sepia-vintage`).
- **Propuesta de mejora:**
  - Agregar un botón **«☰ Secciones»** en la barra inferior móvil que abra un cajón (*bottom sheet*) con acceso directo a las 10 secciones del periódico, o hacer la barra superior de secciones `sticky` de forma compacta al hacer scroll.
  - Subir la escala tipográfica base: cuerpo de tarjetas en `text-sm` (14px) en lugar de `text-xs` (12px), y etiquetas/badges en mínimo `text-xs` (12px) en lugar de `9px–10px`.
  - Etiquetar el monitor vial como **«Pronóstico vial estimado por horario y cartelera»** y añadir un botón directo a Google Maps / Waze con la ubicación de la colonia.
  - Usar dos fotografías distintas en `cronicas.html` para contrastar verdaderamente el año 1955 contra el 2026.

---

## 3. Problemas Técnicos, Accesibilidad y Seguridad en el Código

### 3.1. Vulnerabilidad XSS y Ruptura de Botones por Comillas en `innerHTML` / `onclick`
- **Ubicación:** `index.html`, `noticias.html`, `cronicas.html`, `comercio.html`, `tianguis.html`, `mascotas.html`, `oficios.html`, `empleos.html` y `anunciate.html`.
- **Detalle:** Aunque `app.js` define `sanitizeHTML(str)`, **no se aplica** al renderizar las tarjetas de ninguna sección. Además, se inyectan cadenas directamente dentro de atributos `onclick`:
  ```html
  onclick="openPhotoLightbox('${n.foto}', '${n.titulo}')"
  onclick="shareOnWhatsApp('Noticia en la Ramos Millán: ${n.titulo}')"
  onclick='enviarRegistroPostPago(${JSON.stringify(payload)})'
  ```
  Si un vecino escribe un título con comillas simples o dobles (ej. `Taquería "El Güero"` o `Don Pepe's`), el atributo HTML o el string de JS se rompe y el botón deja de funcionar (además de abrir la puerta a inyección de HTML/JS si entra texto sin sanitizar desde Google Sheets).
- **Solución:** Aplicar `sanitizeHTML()` a todos los campos dinámicos y pasar únicamente el `id` del elemento a las funciones (`onclick="openLightboxById('noticias', '${n.id}')"`), o usar `data-*` attributes con delegación de eventos.

### 3.2. Página `comunidad.html` Desactualizada y Huérfana
- **Ubicación:** `comunidad.html`.
- **Detalle:** No está enlazada desde `renderSharedLayout()`, pero sigue en el repositorio y utiliza propiedades que ya no existen en el modelo de datos de `app.js` (`o.nombre`, `o.calificacion`, `e.sueldo`), lo que renderiza `undefined` en pantalla. Además, su enlace de oficios apunta por error a `anunciate.html?tipo=negocio`.
- **Solución:** Eliminar `comunidad.html` (o redirigirla) ya que fue reemplazada por las páginas independientes `mascotas.html`, `oficios.html` y `empleos.html`.

### 3.3. Accesibilidad (WCAG / A11y)
- **Cintillo en movimiento (`sponsors-ticker-move`):** Carece de soporte para `@media (prefers-reduced-motion: reduce)`, lo que puede causar fatiga visual a personas sensibles al movimiento.
- **Lightbox de fotos (`openPhotoLightbox`):** No se puede cerrar con la tecla `Escape`, no bloquea el scroll del `<body>` y no cuenta con atributos `role="dialog"` ni `aria-modal="true"`.
- **Formularios en `anunciate.html`:** Las etiquetas `<label>` no tienen atributo `for="..."` vinculado al `id` de cada `<input>` / `<select>` / `<textarea>`.

### 3.4. Rendimiento y Configuración PWA (`manifest.json`)
- **Doble renderizado del Header en `index.html`:** `index.html` incluye 80 líneas de HTML estático dentro de `<div id="shared-header">` que son inmediatamente sobreescritas por `renderSharedLayout('inicio')` al ejecutar `DOMContentLoaded`.
- **`manifest.json` desconectado:** Ningún archivo HTML incluye `<link rel="manifest" href="manifest.json">`, y el archivo `manifest.json` no declara el arreglo `"icons"`, impidiendo que los vecinos instalen el periódico como aplicación (PWA) en la pantalla de inicio de su celular.
- **Tailwind por CDN:** Se carga `https://cdn.tailwindcss.com` en tiempo de ejecución en cada página; compilar el CSS en un archivo estático mejorará significativamente el tiempo de carga inicial y eliminará el parpadeo al navegar entre secciones.

---

## 4. Plan de Acción Recomendado (Priorizado)

| Prioridad | Acción | Archivos afectados | Impacto |
| :--- | :--- | :--- | :--- |
| **Alta (P0)** | Sanitizar con `sanitizeHTML()` todos los campos dinámicos y evitar interpolar textos libres o JSON dentro de atributos `onclick="..."`. | `app.js`, todos los `.html` | Seguridad y estabilidad |
| **Alta (P0)** | Agregar estados vacíos (*Empty States*) y esqueletos de carga (*Loading States*) cuando una categoría o filtro no tenga resultados. | `app.js`, todos los `.html` | Usabilidad crítica |
| **Alta (P0)** | Corregir `changeGlobalSector()` para que no borre el texto del buscador ni reinicie el scroll del menú. | `app.js` | Usabilidad de búsqueda |
| **Alta (P0)** | Guardar el anuncio antes de abrir Mercado Pago en `anunciate.html` y permitir enviar comprobante por WhatsApp con folio. | `anunciate.html` | Conversión y pagos |
| **Media (P1)** | Completar `comercio.html`: usar coordenadas por sector/negocio, mostrar botón «Ubicar en mapa», catálogo de productos y selector de Giro en `anunciate.html`. | `comercio.html`, `anunciate.html`, `app.js` | Funcionalidad completa |
| **Media (P1)** | Mejorar navegación móvil (acceso a las 10 secciones en barra inferior) y aumentar tamaño de fuente base (`14px` cuerpo, `12px` badges) para adultos mayores. | `app.js`, todos los `.html` | Accesibilidad y móvil |
| **Media (P1)** | Subir calidad de fotos comprimidas (`MAX_WIDTH = 800`, calidad `0.72`) y agregar cierre con tecla `Escape` en el lightbox. | `anunciate.html`, `app.js` | Calidad visual |
| **Baja (P2)** | Enlazar `manifest.json` con íconos en los `<head>`, unificar estilos de Tailwind en un CSS compilado y depurar o eliminar `comunidad.html`. | `manifest.json`, `comunidad.html`, todos los `.html` | Rendimiento y mantenimiento |
