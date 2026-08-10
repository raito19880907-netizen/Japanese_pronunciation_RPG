#!/usr/bin/env python3
"""Regenerate the local art set with the official OpenAI Images API.

Environment:
  OPENAI_API_KEY      required
  OPENAI_IMAGE_MODEL  optional; defaults to gpt-image-2

The browser game never imports or calls this script.
"""

from __future__ import annotations

import base64
import io
import os
import sys
import urllib.request
from pathlib import Path

try:
    from openai import OpenAI
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Missing dependency. Run: pip install openai Pillow") from exc


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "images"
MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2")
CORE_STYLE = (
    "Hand-drawn colored pencil plus delicate watercolor on warm fibrous washi paper, "
    "visible pencil and ink strokes, parchment cream, ochre, muted indigo, pine green, "
    "ink gray and restrained vermilion. A classical East Asian learning-adventure map "
    "blending wuxia, Japanese ink landscape, scroll craft and restrained ukiyo-e ornament. "
    "Soft, crisp and readable for an educational game. No watermark, no garbled writing, "
    "no modern objects, no photorealism, no 3D, no neon, no named-artist imitation. "
)


ASSETS = [
    {
        "filename": "style-guide-map.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Master style guide map with mountains, river, bridge, clouds, dojo, blank scroll, paths and route seals. No text.",
    },
    {
        "filename": "main-background.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Wide misty mountain game background with a distant dojo and subtle waves at outer lower edges. Keep central 58 percent pale and quiet. No text.",
    },
    {
        "filename": "scroll-panel.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Front-facing horizontal washi scroll panel, slim wooden rollers, delicate border motifs, very clean blank center. No text.",
    },
    {
        "filename": "title-sign.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + 'Wide title scroll. Render exactly and only this Traditional Chinese title: "五十音・墨影連連看". Large, crisp, correct order, no other text.',
    },
    {
        "filename": "kana-group-a.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Beginning-training sunrise vignette: bridge, running water, entry dojo, blank scroll, paper lanterns. No text or kana.",
    },
    {
        "filename": "kana-group-ka.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Mid-training vignette: bamboo, stone stairs, practice path, wooden bridge and empty sword-training courtyard. No text or kana.",
    },
    {
        "filename": "kana-group-sa.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Summit-training vignette: high gate, dojo above clouds, blank scroll ribbons and vermilion seal table. No text or kana.",
    },
    {
        "filename": "completion-background.webp",
        "size": "1536x1024",
        "prompt": CORE_STYLE
        + "Victorious sunrise mountaintop dojo above clouds, distant peaks, floating blank washi slips and open path. Keep central 55 percent quiet. No text.",
    },
    {
        "filename": "ukiyo-wave.png",
        "size": "1536x1024",
        "transparent": True,
        "key": (0, 255, 0),
        "prompt": CORE_STYLE
        + "Single broad horizontal ukiyo-e wave ornament in muted indigo and warm pale foam. "
        "Fully contained on a perfectly flat solid #00ff00 background. No green in subject, no shadow, no text.",
    },
    {
        "filename": "ink-mountain-left.png",
        "size": "1024x1536",
        "transparent": True,
        "key": (255, 0, 255),
        "prompt": CORE_STYLE
        + "Tall asymmetrical left-side mountain cluster with waterfall, pines and inward mist. "
        "Fully contained on a perfectly flat solid #ff00ff background. No magenta in subject, no shadow, no text.",
    },
    {
        "filename": "ink-mountain-right.png",
        "size": "1536x1024",
        "transparent": True,
        "key": (255, 0, 255),
        "prompt": CORE_STYLE
        + "Distinct low layered right-side mountain cluster with bamboo, tiny distant roof and inward mist, not mirrored. "
        "Fully contained on a perfectly flat solid #ff00ff background. No magenta in subject, no shadow, no text.",
    },
    {
        "filename": "swordsman-silhouette.png",
        "size": "1024x1536",
        "transparent": True,
        "key": (0, 255, 0),
        "prompt": CORE_STYLE
        + "Full-body calm fictional wandering swordsman silhouette, stable stance, lowered sword, charcoal robes, tiny vermilion sash. "
        "Fully contained on a perfectly flat solid #00ff00 background. No green in subject, no shadow, no text.",
    },
    {
        "filename": "stamp-match.png",
        "size": "1024x1024",
        "transparent": True,
        "key": (0, 255, 0),
        "prompt": CORE_STYLE
        + "Bold circular vermilion ink stamp with rough hand-pressed edges and crossed sword strokes, no readable characters. "
        "Fully contained on a perfectly flat solid #00ff00 background. No green in subject, no shadow, no text.",
    },
]


def response_bytes(result) -> bytes:
    item = result.data[0]
    encoded = getattr(item, "b64_json", None)
    if encoded:
        return base64.b64decode(encoded)
    url = getattr(item, "url", None)
    if url:
        with urllib.request.urlopen(url, timeout=120) as response:
            return response.read()
    raise RuntimeError("Image response contained neither b64_json nor url")


def remove_chroma(image: Image.Image, key: tuple[int, int, int]) -> Image.Image:
    source = image.convert("RGBA")
    pixels = []
    for red, green, blue, _ in source.getdata():
        distance = ((red - key[0]) ** 2 + (green - key[1]) ** 2 + (blue - key[2]) ** 2) ** 0.5
        if distance <= 24:
            alpha = 0
        elif distance >= 120:
            alpha = 255
        else:
            alpha = int(255 * (distance - 24) / 96)
        pixels.append((red, green, blue, alpha))
    source.putdata(pixels)
    return source


def save_asset(raw: bytes, spec: dict[str, object]) -> None:
    image = Image.open(io.BytesIO(raw))
    destination = OUTPUT_DIR / str(spec["filename"])
    if spec.get("transparent"):
        image = remove_chroma(image, spec["key"])
        image.save(destination, "PNG", optimize=True)
    elif destination.suffix.lower() == ".webp":
        image.convert("RGB").save(destination, "WEBP", quality=90, method=6)
    else:
        image.save(destination)


def main() -> int:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY is not set. Set it locally; never paste it into source files.", file=sys.stderr)
        return 2

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    client = OpenAI(api_key=api_key)
    print("Generating with model:", MODEL)
    for index, spec in enumerate(ASSETS, start=1):
        print("[{}/{}] {}".format(index, len(ASSETS), spec["filename"]))
        result = client.images.generate(
            model=MODEL,
            prompt=str(spec["prompt"]),
            size=str(spec["size"]),
        )
        save_asset(response_bytes(result), spec)
    print("Done. Inspect title-sign.webp character by character before publishing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
