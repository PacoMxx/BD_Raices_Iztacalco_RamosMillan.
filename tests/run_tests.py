#!/usr/bin/env python3
"""
Suite Automatizada de Pruebas — Raíces de Iztacalco (Edición Col. Gabriel Ramos Millán)
Ejecución: python3 tests/run_tests.py
"""

import json
import os
import re
import sys
import unittest
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

EXPECTED_CATEGORIES = [
    "NOTICIA",
    "FOTO_HISTORIA",
    "MASCOTA",
    "TIANGUIS",
    "OFICIO",
    "EMPLEO",
    "NEGOCIO",
]

EXPECTED_SECTORS = [
    "Bramadero",
    "Tlacotal",
    "Cuchilla",
    "Av. Té / Alcaldía",
    "Coyuya / Plutarco",
]

EXPECTED_GIROS = [
    "Comida y Antojitos",
    "Salud y Mascotas",
    "Talleres y Tlapalerías",
    "Belleza y Barberías",
]


class HTMLStructureParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.labels_for = []
        self.links = []
        self.scripts = []
        self.cat_buttons = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if "id" in attr_dict and attr_dict["id"]:
            self.ids.add(attr_dict["id"])
        if tag == "label" and "for" in attr_dict:
            self.labels_for.append(attr_dict["for"])
        if tag == "a" and "href" in attr_dict:
            self.links.append(attr_dict["href"])
        if tag == "script" and "src" in attr_dict:
            self.scripts.append(attr_dict["src"])
        if tag == "button" and "data-cat-btn" in attr_dict:
            self.cat_buttons.append(attr_dict["data-cat-btn"])


def extract_category_blocks(anunciate_html: str) -> dict:
    """Extrae el bloque renderFields de cada categoría en anunciate.html."""
    blocks = {}
    for i, cat in enumerate(EXPECTED_CATEGORIES):
        start_match = re.search(rf"\b{cat}\s*:\s*\{{", anunciate_html)
        if not start_match:
            continue
        start_idx = start_match.start()
        if i + 1 < len(EXPECTED_CATEGORIES):
            next_cat = EXPECTED_CATEGORIES[i + 1]
            end_match = re.search(rf"\b{next_cat}\s*:\s*\{{", anunciate_html[start_idx + 1 :])
            end_idx = start_idx + 1 + end_match.start() if end_match else len(anunciate_html)
        else:
            end_match = re.search(r"function\s+formHasUnsavedText", anunciate_html[start_idx:])
            end_idx = start_idx + end_match.start() if end_match else len(anunciate_html)
        blocks[cat] = anunciate_html[start_idx:end_idx]
    return blocks


class TestProyectoRaicesRegistro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app_js = (ROOT_DIR / "app.js").read_text(encoding="utf-8")
        cls.anunciate_html = (ROOT_DIR / "anunciate.html").read_text(encoding="utf-8")
        cls.gas_code = (ROOT_DIR / "google_apps_script_drive.gs").read_text(encoding="utf-8")
        cls.comercio_html = (ROOT_DIR / "comercio.html").read_text(encoding="utf-8")
        cls.tests_html = (ROOT_DIR / "tests.html").read_text(encoding="utf-8")
        cls.cat_blocks = extract_category_blocks(cls.anunciate_html)

    def test_01_all_html_pages_exist_and_link_app_js_and_manifest(self):
        """Verifica que todas las páginas HTML existan, carguen app.js y enlacen manifest.json."""
        pages = [
            "index.html",
            "anunciate.html",
            "noticias.html",
            "cronicas.html",
            "comercio.html",
            "tianguis.html",
            "mascotas.html",
            "oficios.html",
            "empleos.html",
            "guia.html",
            "comunidad.html",
            "tests.html",
        ]
        for page in pages:
            path = ROOT_DIR / page
            self.assertTrue(path.exists(), f"Falta el archivo {page}")
            content = path.read_text(encoding="utf-8")
            parser = HTMLStructureParser()
            parser.feed(content)
            self.assertIn("app.js", parser.scripts, f"{page} debe incluir <script src='app.js'>")
            self.assertIn('rel="manifest"', content, f"{page} debe enlazar manifest.json")
            self.assertIn("shared-header", parser.ids, f"{page} debe tener #shared-header")
            self.assertIn("shared-footer", parser.ids, f"{page} debe tener #shared-footer")

    def test_02_anunciate_base_structure_and_honeypot(self):
        """Verifica que anunciate.html tenga los 7 botones de categoría, honeypot y contenedores de estado."""
        parser = HTMLStructureParser()
        parser.feed(self.anunciate_html)

        self.assertEqual(
            parser.cat_buttons,
            EXPECTED_CATEGORIES,
            "Los 7 botones selectores de categoría deben coincidir en orden y clave",
        )
        required_ids = {
            "dynamic-form",
            "website_url_trap",
            "dynamic-fields-container",
            "form-error-box",
            "photo-upload-section",
            "f-photo-input",
            "photo-error-msg",
            "photo-preview-box",
            "photo-preview-img",
            "btn-submit-dynamic",
            "result-box",
            "mis-registros-section",
            "mis-registros-list",
        }
        for req_id in required_ids:
            self.assertIn(req_id, parser.ids, f"Falta el elemento #{req_id} en anunciate.html")

    def test_03_all_seven_categories_fields_and_accessibility_labels(self):
        """Verifica que las 7 categorías en anunciate.html tengan todos los campos e IDs vinculados a sus <label for>."""
        self.assertEqual(
            set(self.cat_blocks.keys()),
            set(EXPECTED_CATEGORIES),
            "CONFIG_CATEGORIAS debe definir las 7 categorías",
        )

        common_required_inputs = {"f-modalidad", "f-titulo", "f-sector", "f-subdato", "f-detalles", "f-wa"}

        for cat, block in self.cat_blocks.items():
            parser = HTMLStructureParser()
            parser.feed(block)

            for field_id in common_required_inputs:
                self.assertIn(
                    field_id,
                    parser.ids,
                    f"La categoría {cat} debe incluir el campo #{field_id}",
                )

            if cat == "NEGOCIO":
                self.assertIn("f-giro", parser.ids, "NEGOCIO debe incluir el selector #f-giro")
                for giro in EXPECTED_GIROS:
                    self.assertIn(
                        f'value="{giro}"',
                        block,
                        f"NEGOCIO debe incluir la opción de giro '{giro}'",
                    )

            if cat == "EMPLEO":
                self.assertIn("f-sueldo", parser.ids, "EMPLEO debe incluir el campo #f-sueldo")

            for sector in EXPECTED_SECTORS:
                self.assertIn(
                    f'value="{sector}"',
                    block,
                    f"La categoría {cat} debe incluir el sector '{sector}'",
                )

            for label_target in parser.labels_for:
                self.assertIn(
                    label_target,
                    parser.ids,
                    f"En {cat}, <label for='{label_target}'> no tiene un input con id='{label_target}'",
                )

    def test_04_photo_compression_respects_google_sheets_cell_limit(self):
        """Verifica que la compresión de fotos en anunciate.html garantice <= 47,000 caracteres por celda."""
        self.assertIn("compressImageToSafeBase64", self.anunciate_html)
        self.assertIn("MAX_SHEETS_CELL_CHARS", self.app_js)
        match = re.search(r"MAX_SHEETS_CELL_CHARS\s*=\s*(\d+)", self.app_js)
        self.assertIsNotNone(match, "MAX_SHEETS_CELL_CHARS debe estar definido numéricamente")
        max_chars = int(match.group(1))
        self.assertLess(
            max_chars,
            50000,
            "MAX_SHEETS_CELL_CHARS debe ser estrictamente menor al límite de 50,000 caracteres de Google Sheets",
        )

    def test_05_app_js_registration_validation_and_persistence_functions(self):
        """Verifica que app.js implemente validación, normalización telefónica, persistencia local y envío CORS-safe."""
        required_functions = [
            "normalizePhoneMX",
            "getMercadoPagoPlanForModalidad",
            "validateRegistrationPayload",
            "getLocalRegistrations",
            "saveLocalRegistration",
            "removeLocalRegistration",
            "clearLocalRegistrations",
            "sendPayloadToGoogleSheets",
            "registrarPublicacion",
            "applyPublicacionesToDB",
        ]
        for fn_name in required_functions:
            self.assertRegex(
                self.app_js,
                rf"function\s+{fn_name}\s*\(",
                f"app.js debe definir la función {fn_name}()",
            )

        # Verificar que sendPayloadToGoogleSheets use text/plain;charset=utf-8 para evitar bloqueo por preflight OPTIONS
        self.assertIn(
            "text/plain;charset=utf-8",
            self.app_js,
            "sendPayloadToGoogleSheets debe usar Content-Type: text/plain;charset=utf-8 para petición CORS simple",
        )

        # Verificar deduplicación entre registros remotos y locales en applyPublicacionesToDB
        self.assertIn("const localList = getLocalRegistrations();", self.app_js)
        self.assertIn("seenIds.has(key)", self.app_js)

    def test_06_form_resets_after_both_free_and_paid_submissions(self):
        """Verifica que submitDynamicForm limpie el formulario antes de retornar en planes de pago y gratuitos."""
        submit_idx = self.anunciate_html.find("async function submitDynamicForm")
        self.assertGreater(submit_idx, 0)
        submit_body = self.anunciate_html[submit_idx:]

        reset_idx = submit_body.find("e.target.reset()")
        mp_branch_idx = submit_body.find("if (mpPlan)")
        self.assertGreater(reset_idx, 0, "submitDynamicForm debe llamar a e.target.reset()")
        self.assertGreater(mp_branch_idx, 0, "submitDynamicForm debe manejar mpPlan")
        self.assertLess(
            reset_idx,
            mp_branch_idx,
            "e.target.reset() debe ejecutarse antes del retorno de mpPlan para evitar reenvíos duplicados",
        )

    def test_07_google_apps_script_drive_fallback_and_cell_safety(self):
        """Verifica que google_apps_script_drive.gs tenga try/catch en DriveApp y límite seguro por celda."""
        self.assertIn("function doPost(e)", self.gas_code)
        self.assertIn("function doGet(e)", self.gas_code)
        self.assertIn("function guardarFotoEnDrive(", self.gas_code)
        self.assertIn("catch (driveErr)", self.gas_code, "doPost debe capturar errores de DriveApp con fallback")
        self.assertIn("49000", self.gas_code, "doPost debe proteger el límite de 50,000 caracteres por celda")
        self.assertIn("safeCell(", self.gas_code, "doPost debe sanitizar celdas contra inyección de fórmulas")

    def test_08_live_google_sheets_webapp_endpoint_connectivity_and_honeypot(self):
        """Prueba en vivo (sin ensuciar la hoja) contra el endpoint de Google Apps Script configurado."""
        match = re.search(r'GOOGLE_SHEETS_WEBAPP_URL\s*=\s*"([^"]+)"', self.app_js)
        self.assertIsNotNone(match, "GOOGLE_SHEETS_WEBAPP_URL debe estar configurado en app.js")
        webapp_url = match.group(1)

        try:
            # 1. Prueba GET de publicaciones aprobadas
            req_get = urllib.request.Request(f"{webapp_url}?t=test_suite", method="GET")
            with urllib.request.urlopen(req_get, timeout=10) as resp:
                self.assertEqual(resp.status, 200)
                body = json.loads(resp.read().decode("utf-8"))
                self.assertIn("publicaciones", body)
                self.assertIsInstance(body["publicaciones"], list)

            # 2. Prueba POST con honeypot activo (verifica que el endpoint reciba JSON text/plain y responda ok:true sin insertar basura)
            probe_payload = json.dumps({"website_url_trap": "qa_test_runner_probe"}).encode("utf-8")
            req_post = urllib.request.Request(
                webapp_url,
                data=probe_payload,
                headers={"Content-Type": "text/plain;charset=utf-8"},
                method="POST",
            )
            with urllib.request.urlopen(req_post, timeout=10) as resp_post:
                self.assertEqual(resp_post.status, 200)
                post_body = json.loads(resp_post.read().decode("utf-8"))
                self.assertEqual(post_body.get("ok"), True)
        except urllib.error.URLError as net_err:
            self.skipTest(f"Sin conexión de red al endpoint externo: {net_err}")


if __name__ == "__main__":
    print("=" * 72)
    print("🧪 EJECUTANDO SUITE DE PRUEBAS: RAÍCES DE IZTACALCO (REGISTRO Y QA)")
    print("=" * 72)
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestProyectoRaicesRegistro)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
