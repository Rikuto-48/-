# -*- coding: utf-8 -*-
"""
イクマ - 無料プレゼント(食事管理シート)訴求グラフィック
プロフィール最上部(固定投稿)用
トーン: カジュアル・友達感覚 / CTA: 保存を主役に
"""
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1350

FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

def font(path, size):
    return ImageFont.truetype(path, size)

# ---- palette (softened from harsh gold/black -> warm amber + friendly navy) ----
NAVY_TOP = (26, 29, 38)
NAVY_BOTTOM = (16, 18, 24)
AMBER = (255, 176, 59)       # soft warm amber (replaces hard gold-foil)
AMBER_DEEP = (230, 140, 30)
CREAM = (255, 248, 235)
WHITE = (255, 255, 255)
SOFT_GRAY = (198, 202, 212)
CORAL = (255, 122, 89)
MINT = (108, 214, 168)
SKY = (108, 176, 232)
CARD_BG = (250, 246, 238)
DARK_TEXT = (34, 30, 24)

img = Image.new("RGB", (W, H), NAVY_TOP)
draw = ImageDraw.Draw(img)

# vertical gradient background
for y in range(H):
    t = y / H
    r = int(NAVY_TOP[0] + (NAVY_BOTTOM[0] - NAVY_TOP[0]) * t)
    g = int(NAVY_TOP[1] + (NAVY_BOTTOM[1] - NAVY_TOP[1]) * t)
    b = int(NAVY_TOP[2] + (NAVY_BOTTOM[2] - NAVY_TOP[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# soft warm glow top-left (friendly, not aggressive gold streak)
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse([-300, -350, 700, 550], fill=(255, 176, 59, 60))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"), (0, 0))
draw = ImageDraw.Draw(img)

def rounded_rect(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def text_w(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0]

def draw_centered(d, cx, y, s, f, fill):
    w = text_w(d, s, f)
    d.text((cx - w / 2, y), s, font=f, fill=fill)
    return w

# ---------------------------------------------------------------
# 1) Top badge: "無料配布中" with simple gift icon (flat, drawn)
# ---------------------------------------------------------------
badge_x, badge_y, badge_w, badge_h = 70, 66, 340, 84
rounded_rect(draw, [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], 42, fill=AMBER)

# gift icon (simple box + ribbon), drawn flat
gx, gy = badge_x + 44, badge_y + 42
draw.rounded_rectangle([gx - 22, gy - 6, gx + 22, gy + 26], 6, fill=DARK_TEXT)
draw.rectangle([gx - 22, gy - 14, gx + 22, gy - 6], fill=DARK_TEXT)
draw.rectangle([gx - 5, gy - 14, gx + 5, gy + 26], fill=AMBER)
draw.ellipse([gx - 16, gy - 26, gx - 2, gy - 12], fill=DARK_TEXT)
draw.ellipse([gx + 2, gy - 26, gx + 16, gy - 12], fill=DARK_TEXT)

f_badge = font(FONT_BOLD, 40)
draw.text((badge_x + 82, badge_y + 20), "無料配布中", font=f_badge, fill=DARK_TEXT)

# ---------------------------------------------------------------
# 2) Headline (casual, friendly - key words highlighted in amber)
# ---------------------------------------------------------------
f_h1 = font(FONT_BOLD, 92)
f_h2 = font(FONT_BOLD, 96)

y = 200
draw.text((70, y), "太らない食べ方が", font=f_h1, fill=WHITE)
y += 118
# highlight "一目でわかる" in amber, "シート" in white
line2a = "一目でわかる"
line2b = "シート"
draw.text((70, y), line2a, font=f_h2, fill=AMBER)
w2a = text_w(draw, line2a, f_h2)
draw.text((70 + w2a, y), line2b, font=f_h2, fill=WHITE)

f_sub = font(FONT_REG, 40)
y += 128
draw.text((70, y), "「食事管理シート」を無料でプレゼント", font=f_sub, fill=SOFT_GRAY)

# ---------------------------------------------------------------
# 3) Visual mock card (flat, friendly infographic - not dark dashboard)
# ---------------------------------------------------------------
card_x0, card_y0, card_x1, card_y1 = 70, 560, 1010, 870
rounded_rect(draw, [card_x0, card_y0, card_x1, card_y1], 36, fill=CARD_BG)

# card header bar
rounded_rect(draw, [card_x0 + 24, card_y0 + 24, card_x0 + 24 + 300, card_y0 + 24 + 56], 16, fill=(34, 30, 24))
f_card_h = font(FONT_BOLD, 30)
draw.text((card_x0 + 44, card_y0 + 38), "食事管理シート", font=f_card_h, fill=CREAM)

# simple flat meal rows (colored bars = friendly, not spreadsheet-heavy)
row_colors = [CORAL, MINT, SKY]
row_labels = ["朝ごはん", "昼ごはん", "夜ごはん"]
ry = card_y0 + 108
f_row = font(FONT_REG, 26)
for i, (c, lab) in enumerate(zip(row_colors, row_labels)):
    rx0 = card_x0 + 24
    rx1 = card_x0 + 24 + 46
    rounded_rect(draw, [rx0, ry, rx1, ry + 46], 10, fill=c)
    draw.text((rx1 + 16, ry + 9), lab, font=f_row, fill=DARK_TEXT)
    bar_x0 = rx1 + 150
    bar_w = int(120 + 60 * math.sin(i * 1.7))
    rounded_rect(draw, [bar_x0, ry + 14, bar_x0 + max(60, bar_w), ry + 32], 9, fill=(225, 219, 205))
    ry += 66

# simple flat donut chart (PFC balance) on right side of the card
cx, cy, r = card_x1 - 150, card_y0 + 175, 95
donut_colors = [CORAL, MINT, SKY]
donut_vals = [0.33, 0.33, 0.34]
start = -90
for c, v in zip(donut_colors, donut_vals):
    end = start + 360 * v
    draw.pieslice([cx - r, cy - r, cx + r, cy + r], start, end, fill=c)
    start = end
draw.ellipse([cx - 46, cy - 46, cx + 46, cy + 46], fill=CARD_BG)
f_pfc = font(FONT_BOLD, 22)
draw_centered(draw, cx, cy - 16, "PFC", f_pfc, DARK_TEXT)
draw_centered(draw, cx, cy + 8, "バランス", font(FONT_REG, 18), DARK_TEXT)

# ---------------------------------------------------------------
# 4) Casual bullet list (soft, friendly - no hard-sell corporate wording)
# ---------------------------------------------------------------
bullets = [
    "「何を」「どれだけ」食べればいいかが一発でわかる",
    "カロリー管理がグッとラクになる",
    "続けやすい形だから挫折しにくい",
]
by = 918
f_bullet = font(FONT_REG, 36)
for i, b in enumerate(bullets):
    # check icon (simple flat circle + check mark)
    icx, icy = 100, by + 20
    draw.ellipse([icx - 22, icy - 22, icx + 22, icy + 22], fill=AMBER)
    draw.line([(icx - 10, icy + 2), (icx - 2, icy + 12), (icx + 14, icy - 12)], fill=DARK_TEXT, width=6, joint="curve")
    draw.text((140, by), b, font=f_bullet, fill=WHITE)
    by += 62

# ---------------------------------------------------------------
# 5) CTA banner - SAVE is the hero action (bright, high-contrast)
# ---------------------------------------------------------------
f_note = font(FONT_REG, 26)
draw_centered(draw, W / 2, 1112, "続きはハイライトや他の投稿もチェックしてね", f_note, SOFT_GRAY)

cta_y0, cta_y1 = 1156, 1324
rounded_rect(draw, [50, cta_y0, W - 50, cta_y1], 32, fill=AMBER)

# bookmark icon (flat, drawn)
bx, by2 = 150, (cta_y0 + cta_y1) / 2
draw.polygon([
    (bx - 26, by2 - 40), (bx + 26, by2 - 40),
    (bx + 26, by2 + 38), (bx, by2 + 14), (bx - 26, by2 + 38)
], fill=DARK_TEXT)

f_cta1 = font(FONT_BOLD, 48)
draw.text((200, cta_y0 + 26), "まずは保存して", font=f_cta1, fill=DARK_TEXT)
draw.text((200, cta_y0 + 90), "あとでゆっくり見返そう", font=f_cta1, fill=DARK_TEXT)

img.save("/tmp/claude-0/-home-user--/824df36a-24c4-50ee-ae8d-5bbd9b96e45c/scratchpad/freebie_pinned_v1.png")
print("done")
