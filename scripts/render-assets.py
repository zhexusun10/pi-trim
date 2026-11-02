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
    draw.text((970, 54), f'Pi {DATA["piVersion"]}', font=font(21), fill=MUTED)
    return image, draw

def panel(draw, box):
    draw.rounded_rectangle(box, radius=18, fill=PANEL, outline=BORDER, width=2)

image, draw = canvas()
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
before_chars, after_chars = DATA["beforeCharacters"], DATA["afterCharacters"]
chars_removed = (before_chars - after_chars) / before_chars * 100 if before_chars else 0
screens = [
    ["$ pi install git:github.com/zhexusun10/pi-trim", "", "# Pi 1.5.0 support is available on GitHub.", "# Start Pi, then inspect the transformation."],
    ["> /pi-trim status", "", "pi-trim active - Less Pi in Pi.",
     f"Characters: {before_chars:,} -> {after_chars:,} ({chars_removed:.1f}% removed)",
     f"Estimated tokens: ~{(before_chars + 3) // 4:,} -> ~{(after_chars + 3) // 4:,}",
     "chars / 4 estimate; not provider billing", "", "Changed sections:",
     " / ".join(DATA["changedSections"])],
    ["> /pi-trim diff", "", "--- Pi identity",
     "- You are a coding assistant running inside pi, a coding agent harness.",
     "+ You are a coding assistant.", "", "... Pi environment rule and documentation removed."],
]
for lines in screens:
    frame, draw = canvas()
    draw.text((54, 162), "ILLUSTRATED COMMAND DEMO", font=font(17), fill=MUTED)
    panel(draw, (54, 204, 1226, 636))
    for index, line in enumerate(lines):
        draw.text((84, 233 + index * 39), line, font=font(23), fill=ACCENT if index == 0 else WHITE)
    draw.text((54, 672), f'Measured fixture: {DATA["beforeTokens"]} -> {DATA["afterTokens"]} tokens (o200k_base).', font=font(20), fill=ACCENT)
    draw.text((54, 712), f'Pi {DATA["piVersion"]} / no project context / excludes tool schemas', font=font(17), fill=MUTED)
    frames.append(frame)
frames[0].save(ROOT / "assets/demo.gif", save_all=True, append_images=frames[1:], duration=[2500, 6500, 4000], loop=0, optimize=True)

import shutil
import subprocess

if shutil.which("ffmpeg"):
    gif_path = ROOT / "assets/demo.gif"
    mp4_path = ROOT / "assets/demo.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(gif_path),
        "-movflags", "faststart",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        str(mp4_path)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

