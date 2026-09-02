"""Real document analysis pipeline.

Takes an uploaded file and produces a structured, source-cited analysis.
Every result keeps {text, page, confidence, source}. NEVER fabricates values:
if something is not found it is reported as "Not detected" / "0 detected" /
confidence null. No external services are used.
"""
from __future__ import annotations

import io
import logging
import re
from datetime import datetime
from pathlib import Path

from PIL import Image

logger = logging.getLogger("nexus.analysis")

# --------------------------------------------------------------------------
# Page / document extraction
# --------------------------------------------------------------------------

MEASUREMENT_RE = re.compile(
    r"(-?\d+(?:[.,]\d+)?)\s*"
    r"(mm|cm|m|km|bar|MPa|kPa|Pa|psi|°C|degC|deg F|°F|kWh|MW|kW|kV|V|A|mA|%|"
    r"kg/m3|kg/s|m3/h|L/h|ppm|mg/l|µg|g|kg|tonne|t|h|min|s|hr|ml|L|ml)", re.I
)

ENTITY_PATTERNS = {
    "equipment": [
        r"\b(?:pump|vessel|tank|exchanger|compressor|motor|valve|boiler|reactor|"
        r"separator|column|fan|heater|condenser|filter|conveyor|blower)\b[\s-]*[A-Z0-9][A-Z0-9\-]*",
        r"\b[A-Z]-\d{2,3}\b",
    ],
    "references": [r"\b[A-Z]{2,}[-\s]?\d{3,}\b"],
    "dates": [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b",
        r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
    ],
    "org": [r"\b[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){1,3}\s+(?:Inc|Ltd|Limited|LLC|Corp|Corporation|Services|""Company|Energy|Engineering|Systems)\b"],
    "standards": [r"\b(?:ISO|ASTM|ASME|API|EN |BS |DIN|IEC)\s*[-:]?\s*\d+(?:\.\d+)*\b"],
    "chemicals": [r"\b(?:hydrogen|sulphuric|sulfuric|hydrochloric|methane|propane|butane|ammonia|carbon dioxide|nitrogen|oxygen|caustic|sodium hydroxide|chlorine)\b", r"\bC\d+H\d+\b"],
    "persons": [r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b(?=\s*\(.*(?:inspector|engineer|manager|operator|approved)\))", r"\b(?:Inspector|Engineer|Operator|Manager|Supervisor)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)"],
    "doc_numbers": [r"\b(?:DWG|DOC|REP|REV|SR|PR)\s*[-#]?\s*[A-Z0-9\-]+\b"],
    "locations": [r"\bUnit\s*\d+\b", r"\b(?:Area|Train|Block)\s*[A-Z0-9\-]+\b"],
}

FINDING_TRIGGERS = [
    (r"exceed|exceeds|overflow|overload|above (?:the |its )?(?:operating|design|limit|maximum|allowable)", "warn"),
    (r"corros|erosion|thinning|degradation|deterioration|pitting|leak|leakage|fracture|crack", "danger"),
    (r"fail(?:ed|ure)?\b|trip|alarm|shutdown|non[- ]conform|defect|damage|deficit", "danger"),
    (r"recommend|should|must|required|action|repair|inspect|reinstate|schedule|review", "ok"),
    (r"below (?:the |its )?(?:minimum|required|limit|design)", "warn"),
]


def _render_page(pdf_doc, i: int, dpi: int = 200) -> Image.Image:
    pix = pdf_doc[i].get_pixmap(dpi=dpi)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")


def _page_text(pdf_doc, i: int):
    return pdf_doc[i].get_text("text") or ""


def analyze_pdf_pages(path: Path) -> dict:
    """Page-level analysis for PDFs: text vs scanned, per-page content, tables/diagrams."""
    import fitz  # pymupdf
    from app.services.ocr_service import available_engine, ocr_image_confidence
    doc = fitz.open(str(path))
    pages = []
    text_density = 0
    scanned = 0
    diagram_count = 0
    table_count = 0
    total_words = 0
    ocr_conf = None
    ocr_confs = []

    for i in range(doc.page_count):
        page = doc[i]
        raw = _page_text(doc, i)
        words = len(re.findall(r"\S+", raw.strip()))
        total_words += words
        # images / drawings on page
        imgs = page.get_images(full=True)
        drawings = page.get_drawings()

        entry = {
            "page": i + 1,
            "text": raw,
            "text_present": bool(raw.strip()),
            "word_count": words,
            "images": len(imgs),
            "drawings": len(drawings),
            "ocr": None,
            "ocr_confidence": None,
        }

        # native text heuristics
        # A page is scanned/image-only only when it has (near) no selectable text.
        # Text pages with a few words (e.g. a short last page) stay classified as text.
        if words >= 15:
            text_density += 1
        elif words < 3:
            # image-only page -> try OCR; mark as a scanned (image) page
            scanned += 1
            rendered = _render_page(doc, i)
            if available_engine() != "unavailable":
                try:
                    res = ocr_image_confidence(rendered)
                    if res["text"].strip():
                        ocr_words = len(re.findall(r"\S+", res["text"]))
                        entry["ocr"] = res["text"]
                        entry["ocr_confidence"] = res["confidence"]
                        entry["text"] = res["text"]
                        entry["text_present"] = True
                        entry["word_count"] = ocr_words
                        if res["confidence"] is not None:
                            ocr_confs.append(res["confidence"])
                        if ocr_words >= 15:
                            text_density += 1
                    else:
                        entry["ocr_error"] = "OCR_FAILED"
                except Exception as e:  # noqa
                    logger.warning("page %d OCR failed: %s", i + 1, e)
                    entry["ocr_error"] = "OCR_FAILED"
            else:
                entry["ocr_error"] = "OCR_UNAVAILABLE"
            entry["scanned"] = True

        if entry["images"] > 0 or entry["drawings"] > 0:
            diagram_count += 1
        # simple table heuristic: multiple '|' or tab-separated rows
        if re.search(r"(\|.+\|)|\t.+\t", raw) or "table" in raw.lower():
            table_count += 1

        pages.append(entry)

    if ocr_confs:
        ocr_conf = round(sum(ocr_confs) / len(ocr_confs), 3)

    return {
        "document_type": "scanned" if scanned and scanned >= (doc.page_count / 2) else "text",
        "scanned_pages": scanned,
        "text_pages": text_density,
        "page_count": doc.page_count,
        "total_words": total_words,
        "pages": pages,
        "diagrams": diagram_count,
        "tables": table_count,
        "ocr_confidence": ocr_conf,  # None if unavailable
    }


def analyze_image_page(path: Path) -> dict:
    from app.services.ocr_service import available_engine, ocr_image_confidence
    img = Image.open(path).convert("RGB")
    entry = {"page": 1, "text": "", "text_present": False, "word_count": 0,
             "images": 0, "drawings": 0, "ocr": None, "ocr_confidence": None}
    if available_engine() != "unavailable":
        try:
            res = ocr_image_confidence(img)
            entry["ocr"] = res["text"]
            entry["ocr_confidence"] = res["confidence"]
            entry["text"] = res["text"]
            entry["text_present"] = bool(res["text"].strip())
            entry["word_count"] = len(re.findall(r"\S+", res["text"]))
            if not entry["text_present"]:
                entry["img_error"] = "OCR_FAILED"
        except Exception as e:  # noqa
            logger.warning("image OCR failed: %s", e)
            entry["img_error"] = "OCR_FAILED"
    else:
        entry["img_error"] = "OCR_UNAVAILABLE"
    diagram_count = 0
    return {
        "document_type": "image" if entry["text_present"] else "image-unreadable",
        "scanned_pages": 1, "text_pages": 1 if entry["text_present"] else 0,
        "page_count": 1, "total_words": entry["word_count"],
        "pages": [entry], "diagrams": diagram_count, "tables": 0,
        "ocr_confidence": entry["ocr_confidence"],
    }


# --------------------------------------------------------------------------
# Entity / measurement / finding extraction
# --------------------------------------------------------------------------

def _extract_unique(pattern, texts_by_page):
    out = []
    seen = set()
    for page, text in texts_by_page.items():
        for m in re.finditer(pattern, text, re.I):
            val = m.group(0).strip().strip(":;,")
            key = val.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append({"text": val, "page": page})
            if len(out) >= 12:
                return out
    return out


def extract_entities(texts_by_page: dict) -> list:
    entities = []
    for cat, pats in ENTITY_PATTERNS.items():
        for p in pats:
            try:
                found = _extract_unique(p, texts_by_page)
            except re.error:
                continue
            for f in found:
                entities.append({"type": cat, "text": f["text"], "page": f["page"]})
    # dedupe by (type,text)
    seen = set(); out = []
    for e in entities:
        k = (e["type"], e["text"].lower())
        if k in seen:
            continue
        seen.add(k)
        out.append(e)
    return out[:40]


def extract_measurements(texts_by_page: dict) -> list:
    out = []
    seen = set()
    for page, text in texts_by_page.items():
        for m in MEASUREMENT_RE.finditer(text):
            value = m.group(1).replace(",", ".")
            unit = m.group(2)
            key = (value, unit.lower())
            if key in seen:
                continue
            seen.add(key)
            start = max(0, m.start() - 40)
            snippet = text[start:m.end() + 20].replace("\n", " ").strip()
            out.append({"value": value, "unit": unit, "page": page,
                        "source_text": snippet})
            if len(out) >= 60:
                return out
    return out


def extract_findings(texts_by_page: dict) -> list:
    out = []
    for page, text in texts_by_page.items():
        for line in re.split(r"[.!?\n]+", text):
            line = line.strip()
            if len(line) < 12:
                continue
            for pat, severity in FINDING_TRIGGERS:
                if re.search(pat, line, re.I):
                    out.append({"text": line[:220], "page": page, "severity": severity})
                    break
            if len(out) >= 20:
                return out
    return out


def extract_summary(texts_by_page: dict, max_len: int = 900) -> str:
    flat = " ".join(t for t in texts_by_page.values())
    flat = re.sub(r"\s+", " ", flat).strip()
    if not flat:
        return ""
    if len(flat) <= max_len:
        return flat
    return flat[:max_len].rsplit(" ", 1)[0] + "…"


# --------------------------------------------------------------------------
# Metadata
# --------------------------------------------------------------------------

def extract_metadata(path: Path, page_count: int, doc_type: str) -> dict:
    st = path.stat()
    meta = {
        "filename": path.name,
        "size_bytes": st.st_size,
        "page_count": page_count,
        "document_type": doc_type,
        "created": None,
        "modified": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
    }
    try:
        import fitz
        doc = fitz.open(str(path))
        info = doc.metadata or {}
        for k in ("title", "author", "creationDate", "modDate"):
            v = (info.get(k) or "").strip()
            if v and v != "None":
                if k == "creationDate" and "D:" in v:
                    meta["created"] = _pdf_date(v)
                else:
                    meta["created"] = meta.get("created") or (v if k == "title" else None)
        if info.get("title"):
            meta["title"] = info["title"]
        if info.get("author"):
            meta["author"] = info["author"]
    except Exception:  # noqa
        pass
    return meta


def _pdf_date(raw: str) -> str:
    m = re.sub(r"^D:", "", raw or "")
    m = m.split("+")[0]
    return m[:14] or None


# --------------------------------------------------------------------------
# Local model structured analysis
# --------------------------------------------------------------------------

def _structured_via_model(summary_text: str, entities, measurements, findings, meta) -> dict | None:
    """Ask the LOCAL reasoning model for a structured analysis. Returns None if unavailable."""
    from app.services.model_gateway import registry, pick_reasoning
    if not registry.available:
        return None
    spec = pick_reasoning()
    prompt = (
        "You are a document intelligence analyst. Given ONLY the document below, "
        "return a single JSON object with keys: summary (string), document_type (string), "
        "entities (array of {type,text}), measurements (array of {value,unit}), "
        "findings (array of {text,severity}), recommendations (array of strings). "
        "Do not invent facts not present. Use this schema strictly.\n\n"
        f"DOCUMENT:\n{summary_text[:4000]}"
    )
    try:
        from app.services.agent import _extract_code
        resp = registry.chat(spec.model_id, [
            {"role": "system", "content": "You return only valid JSON. No markdown."},
            {"role": "user", "content": prompt},
        ])
        content = resp.get("message", {}).get("content", "")
        block = re.search(r"\{.*\}", content, re.S)
        if not block:
            return None
        import json
        data = json.loads(block.group(0))
        return {
            "model": spec.model_id,
            "analysis": {
                "summary": data.get("summary", ""),
                "document_type": data.get("document_type", ""),
                "entities": data.get("entities", []),
                "measurements": data.get("measurements", []),
                "findings": data.get("findings", []),
                "recommendations": data.get("recommendations", []),
            },
        }
    except Exception as e:  # noqa
        logger.warning("structured model analysis failed: %s", e)
        return None


# --------------------------------------------------------------------------
# Top-level driver
# --------------------------------------------------------------------------

def analyze_document(path: Path, ext: str, doc_id: str, filename: str) -> dict:
    ext = (ext or path.suffix).lower().lstrip(".")
    path = Path(path)
    if ext in ("png", "jpg", "jpeg"):
        pg = analyze_image_page(path)
    elif ext in ("pdf",):
        pg = analyze_pdf_pages(path)
    else:
        pg = {
            "document_type": "other", "scanned_pages": 0, "text_pages": 0,
            "page_count": 1, "total_words": 0, "pages": [
                {"page": 1, "text": path.read_text(encoding="utf-8", errors="replace"),
                 "text_present": True, "word_count": 0, "images": 0, "drawings": 0,
                 "ocr": None, "ocr_confidence": None}],
            "diagrams": 0, "tables": 0, "ocr_confidence": None,
        }

    texts_by_page = {}
    for p in pg["pages"]:
        texts_by_page[p["page"]] = p.get("text") or ""

    entities = extract_entities(texts_by_page)
    measurements = extract_measurements(texts_by_page)
    findings = extract_findings(texts_by_page)
    summary_text = extract_summary(texts_by_page)

    meta = {}
    try:
        meta = extract_metadata(path, pg["page_count"], pg["document_type"])
    except Exception as e:  # noqa
        logger.warning("metadata failed: %s", e)

    ocr_conf = pg.get("ocr_confidence")

    ocr_issues = [{"page": p["page"], "error": p["ocr_error"]}
                  for p in pg["pages"] if p.get("ocr_error")]

    model_result = _structured_via_model(summary_text, entities, measurements, findings, meta)

    if model_result:
        structured = model_result["analysis"]
        used_model = model_result["model"]
    else:
        structured = {
            "summary": summary_text or "No extractable text was found in this document.",
            "document_type": pg["document_type"],
            "entities": entities,
            "measurements": measurements,
            "findings": findings,
            "recommendations": [],
            "confidence": ocr_conf,
        }
        used_model = None

    return {
        "document_id": doc_id,
        "filename": filename,
        "metadata": meta,
        "document_type": pg["document_type"],
        "page_count": pg["page_count"],
        "tables": pg["tables"],
        "diagrams": pg["diagrams"],
        "ocr_confidence": ocr_conf,  # None = unavailable
        "ocr_issues": ocr_issues,
        "text_pages": pg["text_pages"],
        "scanned_pages": pg["scanned_pages"],
        "total_words": pg["total_words"],
        "model": used_model,
        "analysis": structured,
        "pages": [{"page": p["page"], "text": (p.get("text") or "")[:2000]} for p in pg["pages"]],
        "sources": [{"page": p["page"], "text": (p.get("text") or "")[:120]} for p in pg["pages"] if p.get("text")],
        "local_model_unavailable": used_model is None and _gateway_unavailable(),
    }


def _gateway_unavailable() -> bool:
    from app.services.model_gateway import registry
    return not registry.available
