"""Render factual launch graphics and an explicitly illustrated command demo with Pillow."""
from pathlib import Path
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "benchmarks/prompt.json").read_text())
FONT = os.environ.get("ASSET_FONT") or next((str(path) for path in [
    Path("/System/Library/Fonts/Menlo.ttc"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
    Path("C:/Windows/Fonts/consola.ttf"),
] if path.exists()), "DejaVuSansMono.ttf")
# Monochrome grayscale palette
BG, PANEL, BORDER = "#0a0a0a", "#1a1a1a", "#404040"
ACCENT, WHITE, MUTED = "#e0e0e0", "#f5f5f5", "#808080"

def font(size):
    return ImageFont.truetype(FONT, size)

def canvas():
    image = Image.new("RGB", (1280, 760), BG)
    draw = ImageDraw.Draw(image)
    draw.text((54, 36), "pi-trim", font=font(58), fill=ACCENT)
    draw.text((56, 114), "Less Pi in Pi.", font=font(25), fill=WHITE)
    return image, draw

def panel(draw, box):
    draw.rounded_rectangle(box, radius=18, fill=PANEL, outline=BORDER, width=2)

image, draw = canvas()
draw.text((970, 54), "Pi 1.0", font=font(21), fill=MUTED)
panel(draw, (54, 176, 612, 562))
panel(draw, (642, 176, 1226, 562))
draw.text((80, 202), "DEFAULT SYSTEM TEXT", font=font(18), fill=MUTED)
draw.text((668, 202), "WITH PI-TRIM", font=font(18), fill=MUTED)
draw.text((80, 246), str(DATA["beforeTokens"]), font=font(72), fill=WHITE)
draw.text((668, 246), str(DATA["afterTokens"]), font=font(72), fill=ACCENT)
draw.text((240, 300), "tokens", font=font(19), fill=MUTED)
draw.text((828, 300), "tokens", font=font(19), fill=MUTED)
before_lines = ["coding assistant + Pi identity", "<tools>    read / bash / edit / write", "<rules>    coding + PI_* hint", "<docs>     Pi docs / SDK / TUI", "<cwd>      /workspace"]
after_lines = ["coding assistant", "<tools>    read / bash / edit / write", "<rules>    coding guidance", "<cwd>      /workspace", "your context and tools stay intact"]
for index, line in enumerate(before_lines):
    draw.text((80, 370 + index * 32), line, font=font(17), fill=MUTED)
for index, line in enumerate(after_lines):
    draw.text((668, 370 + index * 32), line, font=font(17), fill=WHITE)
draw.text((54, 597), f'-{DATA["removedTokens"]} tokens  /  -{DATA["removedPercent"]}% system text', font=font(33), fill=ACCENT)
draw.text((54, 665), "o200k_base  |  normalized paths  |  no project context / skills", font=font(18), fill=MUTED)
draw.text((54, 700), "Excludes tool schemas and provider formatting. Not billing or quality evidence.", font=font(16), fill=MUTED)
image.save(ROOT / "assets/before-after.png")

frames = []
screens = [
    ["$ pi install npm:pi-trim", "", "# Start Pi, then inspect the transformation."],
    ["> /pi-trim status", "", "pi-trim active - Less Pi in Pi.", "Characters: 2,448 -> 1,248 (49.0% removed)", "Estimated tokens: ~612 -> ~312", "chars / 4 estimate; not provider billing", "", "Changed: identity / docs / environment rule"],
    ["> /pi-trim diff", "", "--- Pi identity", "- ...operating inside pi, a coding agent harness.", "+ You are an expert coding assistant.", "", "--- Pi documentation", "- Pi documentation (read only when...)", "- Main documentation / SDK / extensions / TUI"],
]
for lines in screens:
    frame, draw = canvas()
    draw.text((54, 162), "ILLUSTRATED COMMAND DEMO", font=font(17), fill=MUTED)
    panel(draw, (54, 204, 1226, 636))
    for index, line in enumerate(lines):
        draw.text((84, 233 + index * 39), line, font=font(23), fill=ACCENT if index == 0 else WHITE)
    draw.text((54, 672), "Measured fixture: 540 -> 274 tokens (o200k_base).", font=font(20), fill=ACCENT)
    draw.text((54, 712), "Pi 1.0 / no project context / excludes tool schemas", font=font(17), fill=MUTED)
    frames.append(frame)
frames[0].save(ROOT / "assets/demo.gif", save_all=True, append_images=frames[1:], duration=[2500, 6500, 4000], loop=0, optimize=True)
