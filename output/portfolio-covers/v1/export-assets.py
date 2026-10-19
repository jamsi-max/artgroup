"""Export web derivatives and a review contact sheet; PNG masters stay intact."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'prompts-and-manifest.json').read_text())
projects = manifest['projects']
assert len(projects) == 11
font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font = lambda n: ImageFont.truetype(font_path, n)
reports = []

for project in projects:
    master = ROOT / project['master']
    with Image.open(master) as source:
        source.load()
        assert source.size == (1536, 1024), (master, source.size)
        image = source.convert('RGB')
        image.save(ROOT / project['web'], 'WEBP', quality=88, method=6)
        image.resize((960, 640), Image.Resampling.LANCZOS).save(
            ROOT / project['responsive'], 'WEBP', quality=86, method=6)
    for key, size in [('web', (1536, 1024)), ('responsive', (960, 640))]:
        with Image.open(ROOT / project[key]) as exported:
            exported.load()
            assert exported.size == size
    reports.append({
        'id': project['id'], 'master': master.name,
        'dimensions': [1536, 1024], 'png_bytes': master.stat().st_size,
        'webp_bytes': (ROOT / project['web']).stat().st_size,
        'webp_960_bytes': (ROOT / project['responsive']).stat().st_size,
    })

# Review montage only. This does not crop, retouch or recolor the deliverables.
W, margin, gap, tile_w, tile_h, label_h = 1920, 36, 24, 600, 400, 90
sheet = Image.new('RGB', (W, 150 + 4 * (tile_h + label_h + gap) + 20), '#252525')
draw = ImageDraw.Draw(sheet)
draw.text((margin, 32), 'ART GROUP / ARCHITECTURAL COVER STUDIES', font=font(30), fill='#f2eee8')
draw.text((margin, 78), '11 projects / 3:2 / v1', font=font(20), fill='#c5bfb7')
draw.line((margin, 120, W-margin, 120), fill='#921c12', width=3)

def wrap(text, max_width):
    lines = []
    for word in text.split():
        if not lines or draw.textbbox((0, 0), lines[-1]+' '+word, font=font(22))[2] > max_width:
            lines.append(word)
        else:
            lines[-1] += ' ' + word
    return lines

for i, project in enumerate(projects):
    x = margin + (i % 3) * (tile_w + gap)
    y = 150 + (i // 3) * (tile_h + label_h + gap)
    with Image.open(ROOT / project['master']) as image:
        sheet.paste(image.convert('RGB').resize((tile_w, tile_h), Image.Resampling.LANCZOS), (x, y))
    draw.text((x, y+tile_h+12), project['id'], font=font(22), fill='#d9907a')
    for line, text in enumerate(wrap(project['title']['ru'], tile_w-52)):
        draw.text((x+45, y+tile_h+12+line*28), text, font=font(22), fill='#f2eee8')

sheet.save(ROOT / 'contact-sheet.jpg', 'JPEG', quality=94, subsampling=0)
(ROOT / 'asset-validation.json').write_text(json.dumps({
    'selected_covers': len(reports), 'generation': 'Built-in image_gen',
    'export': 'PNG masters preserved; WebP compression and Lanczos downscaling only',
    'total_webp_bytes': sum(r['webp_bytes'] for r in reports),
    'total_webp_960_bytes': sum(r['webp_960_bytes'] for r in reports),
    'images': reports,
}, indent=2)+'\n')
print(json.dumps({'covers':len(reports), 'master_sizes': '1536x1024',
 'webp_total_kb':round(sum(r['webp_bytes'] for r in reports)/1024),
 'webp_960_total_kb':round(sum(r['webp_960_bytes'] for r in reports)/1024)}))
