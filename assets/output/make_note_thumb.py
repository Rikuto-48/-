# -*- coding: utf-8 -*-
"""
イクマ note有料記事サムネイル
「【完全版】筋トレしてるのに痩せない人へ。お酒との正しい距離感、全部教えます」
ダーク×ゴールド(Instagramと同系統のアンバー×ネイビー)、カジュアル・友達感覚トーン
"""
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 670

FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

def font(path, size):
    return ImageFont.truetype(path, size)

NAVY_TOP = (24, 27, 36)
NAVY_BOTTOM = (14, 16, 22)
AMBER = (255, 181, 69)
AMBER_DEEP = (235, 150, 40)
CREAM = (255, 248, 235)
WHITE = (255, 255, 255)
SOFT_GRAY = (188, 193, 205)
DARK_TEXT = (28, 24, 18)

def rounded_rect(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def text_w(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0]

img = Image.new("RGB", (W, H), NAVY_TOP)
draw = ImageDraw.Draw(img)
for y in range(H):
    t = y / H
    r = int(NAVY_TOP[0] + (NAVY_BOTTOM[0] - NAVY_TOP[0]) * t)
    g = int(NAVY_TOP[1] + (NAVY_BOTTOM[1] - NAVY_TOP[1]) * t)
    b = int(NAVY_TOP[2] + (NAVY_BOTTOM[2] - NAVY_TOP[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# warm glow behind the icon area (right side)
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse([W * 0.55, -150, W + 250, H + 150], fill=(255, 176, 59, 55))
glow = glow.filter(ImageFilter.GaussianBlur(110))
img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
draw = ImageDraw.Draw(img)

# thin amber rule accent top-left
draw.rectangle([0, 0, 10, H], fill=AMBER)

# ---------------------------------------------------------------
# Right side: flat icon motif (dumbbell x beer mug) instead of a
# low-res cropped photo — keeps quality high at this canvas size.
# ---------------------------------------------------------------
icx, icy = int(W * 0.82), int(H * 0.52)

# dumbbell (amber, flat)
bar_w, bar_h = 150, 16
draw.rounded_rectangle([icx - bar_w / 2, icy - bar_h / 2, icx + bar_w / 2, icy + bar_h / 2], 8, fill=AMBER)
for side in (-1, 1):
    cx_plate = icx + side * (bar_w / 2 + 2)
    draw.rounded_rectangle([cx_plate - 14, icy - 46, cx_plate + 14, icy + 46], 10, fill=AMBER)
    draw.rounded_rectangle([cx_plate - 22, icy - 30, cx_plate + 22, icy + 30], 10, fill=AMBER)

# small "×" between dumbbell and mug
draw.text((icx - 14, icy + 70), "×", font=font(FONT_BOLD, 40), fill=SOFT_GRAY)

# simple beer mug (flat, cream outline) below-right of dumbbell
mx, my = icx + 70, icy + 160
draw.rounded_rectangle([mx - 36, my - 50, mx + 36, my + 50], 10, outline=CREAM, width=7)
draw.rounded_rectangle([mx + 36, my - 30, mx + 62, my + 20], 14, outline=CREAM, width=7)
draw.ellipse([mx - 36, my - 62, mx + 36, my - 38], fill=CREAM)

# ---------------------------------------------------------------
# Left text block
# ---------------------------------------------------------------
left_x = 64

f_eyebrow = font(FONT_BOLD, 30)
draw.text((left_x, 56), "筋トレしてるのに痩せない人へ【完全版】", font=f_eyebrow, fill=SOFT_GRAY)

f_h = font(FONT_BOLD, 92)
y = 134
draw.text((left_x, y), "お酒との", font=f_h, fill=WHITE)
y += 112
draw.text((left_x, y), "正しい距離感、", font=f_h, fill=AMBER)
y += 112
draw.text((left_x, y), "全部教えます", font=f_h, fill=WHITE)

f_sub = font(FONT_REG, 30)
draw.text((left_x, y + 128), "筋トレ×お酒の付き合い方 / 実践ルールを解説", font=f_sub, fill=SOFT_GRAY)

img.save("/tmp/claude-0/-home-user--/824df36a-24c4-50ee-ae8d-5bbd9b96e45c/scratchpad/note_thumb_v1.png")
print("done")
