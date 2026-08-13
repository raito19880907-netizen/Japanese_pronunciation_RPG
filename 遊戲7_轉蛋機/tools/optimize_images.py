"""Resize the generated game art to browser-friendly dimensions in place."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "assets" / "images"
TARGETS = {
    ROOT / "gacha-machine.png": 1024,
    ROOT / "spirit-stone.png": 384,
}

for pet_image in (ROOT / "pets").glob("*.png"):
    TARGETS[pet_image] = 768

for capsule_image in (ROOT / "capsules").glob("*.png"):
    TARGETS[capsule_image] = 768


for path, max_edge in TARGETS.items():
    if not path.exists():
        continue
    with Image.open(path) as image:
        image.load()
        if max(image.size) > max_edge:
            image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        image.save(path, "PNG", optimize=True, compress_level=9)

print(f"Optimized {sum(path.exists() for path in TARGETS)} images.")
