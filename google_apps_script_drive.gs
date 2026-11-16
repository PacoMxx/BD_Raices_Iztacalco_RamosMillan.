/**
 * ============================================================================
 * GOOGLE APPS SCRIPT PARA RAÍCES DE IZTACALCO (GOOGLE SHEETS + GOOGLE DRIVE + CACHÉ)
 * ============================================================================
 * INSTRUCCIONES:
 * 1. En tu Google Drive crea una carpeta llamada exactamente:
 *      Raices_Iztacalco_Fotos
 *    (Si no la creas manualmente, este script la creará por ti automáticamente).
 * 2. En tu hoja de Google Sheets ve a: Extensiones > Apps Script.
 * 3. Reemplaza el código por este archivo y pulsa "Implementar" > "Gestionar implementaciones" > Editar (lápiz) > "Nueva versión" > "Implementar".
 */

const DRIVE_FOLDER_NAME = "Raices_Iztacalco_Fotos";
const CACHE_KEY = "PUBLICACIONES_APROBADAS_V1";
const CACHE_TTL_SECONDS = 300; // 5 minutos en memoria rápida de Google

/**
 * Obtiene la carpeta "Raices_Iztacalco_Fotos" en Google Drive (o la crea si no existe)
 * y se asegura de que tenga permisos públicos de lectura para que las fotos se vean en la web.
 */
function obtenerOCrearCarpetaFotos() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return folder;
}

/**
 * Convierte una cadena Base64 (data:image/jpeg;base64,...) en un archivo dentro de
 * la carpeta "Raices_Iztacalco_Fotos" y devuelve la URL directa de carga rápida.
 */
function guardarFotoEnDrive(base64Data, prefixTitulo) {
  if (!base64Data || typeof base64Data !== "string") return "";
  if (!base64Data.startsWith("data:image")) {
    return base64Data; // Ya es una URL
  }

  const partes = base64Data.split(",");
  if (partes.length < 2) return "";

  const header = partes[0];
  const base64Content = partes[1];
  const mimeMatch = header.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
  const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";

  const cleanName = String(prefixTitulo || "anuncio")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const fileName = `${cleanName}_${Date.now()}.${ext}`;

  const decodedBytes = Utilities.base64Decode(base64Content);
  const blob = Utilities.newBlob(decodedBytes, contentType, fileName);

  const folder = obtenerOCrearCarpetaFotos();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // URL de CDN directo de Google para etiquetas <img> (carga rápida y ligera)
  return `https://lh3.googleusercontent.com/d/${file.getId()}`;
}

/**
 * POST: Recibe un nuevo anuncio desde anunciate.html, guarda la foto en Drive
 * ("Raices_Iztacalco_Fotos") y escribe solo el link corto en Google Sheets.
 */
function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    // Candado anti-bots (honeypot)
    if (data.website_url_trap && String(data.website_url_trap).trim() !== "") {
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Si trae foto en Base64, intentamos guardarla en Drive ("Raices_Iztacalco_Fotos").
    // Si Drive no está autorizado aún, usamos fallback seguro en Base64 (< 49,000 caracteres por límite de celda en Sheets).
    let fotoUrl = "";
    if (data.foto && String(data.foto).startsWith("data:image")) {
      try {
        fotoUrl = guardarFotoEnDrive(data.foto, `${data.categoria || "POST"}_${data.folio || ""}`);
      } catch (driveErr) {
        const rawBase64 = String(data.foto);
        fotoUrl = rawBase64.length <= 49000 ? rawBase64 : "";
      }
    } else if (data.foto) {
      const rawFoto = String(data.foto);
      fotoUrl = rawFoto.length <= 49000 ? rawFoto : "";
    }

    const fechaStr = Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy HH:mm");
    const idUnico = data.folio || data.id || ("ID-" + Date.now());
    const safeCell = (val, maxLen) => String(val || "").replace(/^[=+\-@]/, "'").trim().slice(0, maxLen || 1000);

    // Orden de columnas compatible con tu hoja actual:
    // [ID/Folio, Fecha, Estado, Categoria, Modalidad, Sector, Titulo, Subdato, Detalles, WhatsApp, FotoURL, Giro, Sueldo]
    sheet.appendRow([
      safeCell(idUnico, 60),
      fechaStr,
      "PENDIENTE",
      safeCell(data.categoria || "NOTICIA", 40),
      safeCell(data.modalidad || "Gratis", 60),
      safeCell(data.sector || "Bramadero", 60),
      safeCell(data.titulo, 150),
      safeCell(data.subdato, 150),
      safeCell(data.detalles, 1000),
      safeCell(data.whatsapp, 25),
      fotoUrl,
      safeCell(data.giro, 80),
      safeCell(data.sueldo, 100)
    ]);

    // Limpiar caché para que cuando se apruebe se refleje rápido
    CacheService.getScriptCache().remove(CACHE_KEY);

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      id: idUnico,
      foto: fotoUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET: Devuelve las publicaciones aprobadas en milisegundos usando CacheService
 */
function doGet(e) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return ContentService.createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ publicaciones: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = rows[0].map(h => String(h || "").trim().toLowerCase());
  const publicaciones = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = r[colIdx];
    });

    // Verificar si la fila está aprobada (busca columna 'estado' o 'aprobado' o columna C)
    const estadoVal = String(rowObj.estado || rowObj.aprobado || r[2] || "").trim().toUpperCase();
    const estaAprobado = ["APROBADO", "SI", "SÍ", "ACTIVO", "PUBLICADO", "TRUE", "1"].includes(estadoVal);
    if (!estaAprobado) continue;

    publicaciones.push({
      id: rowObj.id || rowObj.folio || r[0] || `fila_${i}`,
      fecha: rowObj.fecha || r[1] || "Reciente",
      categoria: rowObj.categoria || r[3] || "NOTICIA",
      modalidad: rowObj.modalidad || r[4] || "Gratis",
      sector: rowObj.sector || r[5] || "Bramadero",
      titulo: rowObj.titulo || r[6] || "",
      subdato: rowObj.subdato || r[7] || "",
      detalles: rowObj.detalles || r[8] || "",
      whatsapp: rowObj.whatsapp || r[9] || "",
      foto: rowObj.foto || rowObj.fotourl || r[10] || "",
      giro: rowObj.giro || r[11] || "",
      sueldo: rowObj.sueldo || r[12] || ""
    });
  }

  const responseJSON = JSON.stringify({ publicaciones: publicaciones });

  try {
    cache.put(CACHE_KEY, responseJSON, CACHE_TTL_SECONDS);
  } catch (cacheErr) {
    // Si aún quedan fotos antiguas en Base64 que superen 100KB, responde sin romper
  }

  return ContentService.createTextOutput(responseJSON)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Trigger automático: cada vez que edites la hoja (por ejemplo al cambiar PENDIENTE -> APROBADO),
 * se limpia el caché instantáneamente para que el anuncio aparezca al momento en la web.
 */
function onEdit(e) {
  CacheService.getScriptCache().remove(CACHE_KEY);
}
