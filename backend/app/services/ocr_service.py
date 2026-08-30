"""OCR service abstraction.

Uses PaddleOCR if available, otherwise falls back to Tesseract (pytesseract),
otherwise raises a clear error. All local, no cloud OCR.
"""
from __future__ import annotations

import logging
from pathlib import Path

from PIL import Image

logger = logging.getLogger("nexus.ocr")

_paddle = None
_try_paddle = True


def _get_paddle():
    global _paddle, _try_paddle
    if not _try_paddle:
        return None
    try:
        from paddleocr import PaddleOCR  # noqa
        _paddle = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    except Exception as e:  # noqa
        logger.warning("PaddleOCR unavailable (%s); using Tesseract", e)
        _paddle = None
        _try_paddle = False
    return _paddle


def available_engine() -> str:
    if _get_paddle() is not None:
        return "paddleocr"
    try:
        import pytesseract  # noqa
        from PIL import Image  # noqa
        return "tesseract"
    except Exception:  # noqa
        return "unavailable"


def _ocr_tesseract(image: Image.Image) -> str:
    import pytesseract
    try:
        return pytesseract.image_to_string(image)
    except Exception as e:  # noqa
        raise RuntimeError(f"Tesseract failed: {e}") from e


def _ocr_paddle(image: Image.Image) -> str:
    engine = _get_paddle()
    # save to temp and run
    tmp = Path(image.filename) if getattr(image, "filename", None) else None
    result = engine.ocr(str(image) if tmp is None else str(tmp), cls=True)
    lines = []
    if result and isinstance(result, list):
        for page in result:
            if isinstance(page, list):
                for item in page:
                    if isinstance(item, list) and len(item) >= 1:
                        lines.append(item[-1][0])
    return "\n".join(lines)


def ocr_image(image: Image.Image) -> str:
    engine = _get_paddle()
    if engine is not None:
        return _ocr_paddle(image)
    try:
        return _ocr_tesseract(image)
    except RuntimeError as e:
        raise RuntimeError(
            f"No OCR engine available. Install PaddleOCR or Tesseract. ({e})"
        ) from e


def ocr_image_confidence(image: Image.Image) -> dict:
    """Run OCR and return {text, confidence} where confidence may be None.

    Only returns a real number when the OCR engine reports it (Tesseract
    per-word confidence). Never invents a value.
    """
    # Paddle: no per-word confidence exposed via this path -> None
    engine = _get_paddle()
    if engine is not None:
        return {"text": _ocr_paddle(image), "confidence": None}
    import pytesseract
    try:
        from PIL import Image as _I
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        words = [w for w in data.get("text", []) if w and w.strip()]
        confs = [float(c) / 100.0 for c in data.get("conf", []) if c is not None and float(c) >= 0]
        conf = round(sum(confs) / len(confs), 3) if confs else None
        text = "\n".join(l.strip() for l in pytesseract.image_to_string(image).splitlines() if l.strip())
        return {"text": text, "confidence": conf}
    except Exception as e:  # noqa
        raise RuntimeError(f"Tesseract OCR failed: {e}") from e
