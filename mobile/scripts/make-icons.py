"""Generate the app icons and splash images from the website's brand logo.

Run from the repo root:  python mobile/scripts/make-icons.py   (needs Pillow)

Sources (client/public): favicon.png (the maroon rounded-square mark) and
logo-light.png / logo-dark.png (the full wordmark). Outputs go to mobile/assets.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "client" / "public"
OUT = ROOT / "mobile" / "assets"

mark = Image.open(PUBLIC / "favicon.png").convert("RGBA")
# The mark's background maroon, sampled from its top edge.
MAROON = mark.getpixel((mark.width // 2, 30))[:3]


def glyph_mask(src: Image.Image) -> Image.Image:
    """Alpha mask of the cream glyph (palm + house) inside the mark."""
    mask = Image.new("L", src.size, 0)
    px, mp = src.load(), mask.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = px[x, y]
            if a > 0 and r > 180 and g > 170:
                # Soft edge: scale by how far from maroon toward cream it is.
                mp[x, y] = min(255, int((g - MAROON[1]) / (236 - MAROON[1]) * 255))
    return mask


def fit(img: Image.Image, size: int, scale: float) -> Image.Image:
    """Centre `img` on a transparent square canvas, `scale` of its width."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    w = int(size * scale)
    h = int(img.height * w / img.width)
    img = img.resize((w, h), Image.LANCZOS)
    canvas.paste(img, ((size - w) // 2, (size - h) // 2), img)
    return canvas


mask = glyph_mask(mark)
cream = Image.new("RGBA", mark.size, (244, 239, 229, 255))
cream.putalpha(mask)
glyph = cream.crop(mask.getbbox())

# iOS / store icon: full square, opaque (no rounded corners, the OS masks it).
icon = Image.new("RGBA", (1024, 1024), MAROON + (255,))
icon.alpha_composite(fit(glyph, 1024, 0.74))
icon.convert("RGB").save(OUT / "icon.png")

# Android adaptive icon: the glyph must sit in the 66% safe zone.
Image.new("RGBA", (512, 512), MAROON + (255,)).save(OUT / "android-icon-background.png")
fit(glyph, 512, 0.56).save(OUT / "android-icon-foreground.png")
white = Image.new("RGBA", glyph.size, (255, 255, 255, 255))
white.putalpha(glyph.getchannel("A"))
fit(white, 432, 0.56).save(OUT / "android-icon-monochrome.png")

# Splash: the wordmark, light and dark variants.
for name, src in (("splash-icon.png", "logo-light.png"), ("splash-icon-dark.png", "logo-dark.png")):
    logo = Image.open(PUBLIC / src).convert("RGBA")
    logo = logo.crop(logo.getbbox())
    fit(logo, 1024, 0.9).save(OUT / name)

mark.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
print("Wrote icons and splash images to", OUT)
