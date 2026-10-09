# -*- coding: utf-8 -*-
"""
イクマ - 無料プレゼント(食事管理シート)訴求グラフィック
プロフィール最上部(固定投稿)用
トーン: カジュアル・友達感覚 / CTA: 保存を主役に

use: python3 make_design.py
  4:5 (1080x1350) と 正方形 (1080x1080) の両方を書き出す。
"""
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

def font(path, size):
    return ImageFont.truetype(path, size)

# ---- palette (softened from harsh gold/black -> warm amber + friendly navy) ----
NAVY_TOP = (26, 29, 38)
NAVY_BOTTOM = (16, 18, 24)
AMBER = (255, 176, 59)       # soft warm amber (replaces hard gold-foil)
CREAM = (255, 248, 235)
WHITE = (255, 255, 255)
SOFT_GRAY = (198, 202, 212)
CORAL = (255, 122, 89)
MINT = (108, 214, 168)
SKY = (108, 176, 232)
CARD_BG = (250, 246, 238)
DARK_TEXT = (34, 30, 24)

def rounded_rect(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def text_w(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0]

def draw_centered(d, cx, y, s, f, fill):
    w = text_w(d, s, f)
    d.text((cx - w / 2, y), s, font=f, fill=fill)
    return w

def draw_gift_icon(draw, gx, gy):
    draw.rounded_rectangle([gx - 22, gy - 6, gx + 22, gy + 26], 6, fill=DARK_TEXT)
    draw.rectangle([gx - 22, gy - 14, gx + 22, gy - 6], fill=DARK_TEXT)
    draw.rectangle([gx - 5, gy - 14, gx + 5, gy + 26], fill=AMBER)
    draw.ellipse([gx - 16, gy - 26, gx - 2, gy - 12], fill=DARK_TEXT)
    draw.ellipse([gx + 2, gy - 26, gx + 16, gy - 12], fill=DARK_TEXT)

def draw_bookmark_icon(draw, bx, by2, w=26, h_top=40, h_bottom=38, notch=14):
    draw.polygon([
        (bx - w, by2 - h_top), (bx + w, by2 - h_top),
        (bx + w, by2 + h_bottom), (bx, by2 + notch), (bx - w, by2 + h_bottom)
    ], fill=DARK_TEXT)

def draw_meal_card(draw, card_x0, card_y0, card_x1, card_y1,
                    header_font_size, row_font_size, row_h, row_gap_top,
                    donut_r, pfc_font_size, pfc_sub_font_size):
    rounded_rect(draw, [card_x0, card_y0, card_x1, card_y1], 32, fill=CARD_BG)

    header_w = int((card_x1 - card_x0) * 0.42)
    rounded_rect(draw, [card_x0 + 20, card_y0 + 18, card_x0 + 20 + header_w, card_y0 + 18 + header_font_size + 26],
                 14, fill=(34, 30, 24))
    f_card_h = font(FONT_BOLD, header_font_size)
    draw.text((card_x0 + 38, card_y0 + 30), "食事管理シート", font=f_card_h, fill=CREAM)

    row_colors = [CORAL, MINT, SKY]
    row_labels = ["朝ごはん", "昼ごはん", "夜ごはん"]
    ry = card_y0 + row_gap_top
    f_row = font(FONT_REG, row_font_size)
    swatch = row_h
    for i, (c, lab) in enumerate(zip(row_colors, row_labels)):
        rx0 = card_x0 + 20
        rx1 = rx0 + swatch
        rounded_rect(draw, [rx0, ry, rx1, ry + swatch], 8, fill=c)
        draw.text((rx1 + 14, ry + swatch * 0.15), lab, font=f_row, fill=DARK_TEXT)
        bar_x0 = rx1 + int(row_font_size * 5.6)
        bar_w = int(row_font_size * 3.2 + row_font_size * 1.6 * math.sin(i * 1.7))
        rounded_rect(draw, [bar_x0, ry + swatch * 0.28, bar_x0 + max(row_font_size * 2, bar_w), ry + swatch * 0.72],
                     8, fill=(225, 219, 205))
        ry += swatch + row_gap_top * 0.28

    cx, cy, r = card_x1 - int((card_x1 - card_x0) * 0.19), card_y0 + int((card_y1 - card_y0) * 0.56), donut_r
    donut_colors = [CORAL, MINT, SKY]
    donut_vals = [0.33, 0.33, 0.34]
    start = -90
    for c, v in zip(donut_colors, donut_vals):
        end = start + 360 * v
        draw.pieslice([cx - r, cy - r, cx + r, cy + r], start, end, fill=c)
        start = end
    inner = int(r * 0.48)
    draw.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=CARD_BG)
    f_pfc = font(FONT_BOLD, pfc_font_size)
    draw_centered(draw, cx, cy - pfc_font_size * 0.75, "PFC", f_pfc, DARK_TEXT)
    draw_centered(draw, cx, cy + pfc_font_size * 0.15, "バランス", font(FONT_REG, pfc_sub_font_size), DARK_TEXT)

def base_canvas(W, H):
    img = Image.new("RGB", (W, H), NAVY_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(NAVY_TOP[0] + (NAVY_BOTTOM[0] - NAVY_TOP[0]) * t)
        g = int(NAVY_TOP[1] + (NAVY_BOTTOM[1] - NAVY_TOP[1]) * t)
        b = int(NAVY_TOP[2] + (NAVY_BOTTOM[2] - NAVY_TOP[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([-300, -350, W * 0.65, H * 0.4], fill=(255, 176, 59, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"), (0, 0))
    return img, ImageDraw.Draw(img)

def build_4x5(out_path):
    """1080x1350 - Instagram 4:5"""
    W, H = 1080, 1350
    img, draw = base_canvas(W, H)

    # 1) badge
    badge_x, badge_y, badge_w, badge_h = 70, 66, 340, 84
    rounded_rect(draw, [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], 42, fill=AMBER)
    draw_gift_icon(draw, badge_x + 44, badge_y + 42)
    draw.text((badge_x + 82, badge_y + 20), "無料配布中", font=font(FONT_BOLD, 40), fill=DARK_TEXT)

    # 2) headline
    f_h1 = font(FONT_BOLD, 92)
    f_h2 = font(FONT_BOLD, 96)
    y = 200
    draw.text((70, y), "太らない食べ方が", font=f_h1, fill=WHITE)
    y += 118
    line2a, line2b = "一目でわかる", "シート"
    draw.text((70, y), line2a, font=f_h2, fill=AMBER)
    draw.text((70 + text_w(draw, line2a, f_h2), y), line2b, font=f_h2, fill=WHITE)
    y += 128
    draw.text((70, y), "「食事管理シート」を無料でプレゼント", font=font(FONT_REG, 40), fill=SOFT_GRAY)

    # 3) card
    draw_meal_card(draw, 70, 560, 1010, 870,
                    header_font_size=30, row_font_size=26, row_h=46, row_gap_top=66,
                    donut_r=95, pfc_font_size=22, pfc_sub_font_size=18)

    # 4) bullets
    bullets = [
        "「何を」「どれだけ」食べればいいかが一発でわかる",
        "カロリー管理がグッとラクになる",
        "続けやすい形だから挫折しにくい",
    ]
    by = 918
    f_bullet = font(FONT_REG, 36)
    for b in bullets:
        icx, icy = 100, by + 20
        draw.ellipse([icx - 22, icy - 22, icx + 22, icy + 22], fill=AMBER)
        draw.line([(icx - 10, icy + 2), (icx - 2, icy + 12), (icx + 14, icy - 12)], fill=DARK_TEXT, width=6, joint="curve")
        draw.text((140, by), b, font=f_bullet, fill=WHITE)
        by += 62

    # 5) CTA
    draw_centered(draw, W / 2, 1112, "続きはハイライトや他の投稿もチェックしてね", font(FONT_REG, 26), SOFT_GRAY)
    cta_y0, cta_y1 = 1156, 1324
    rounded_rect(draw, [50, cta_y0, W - 50, cta_y1], 32, fill=AMBER)
    draw_bookmark_icon(draw, 150, (cta_y0 + cta_y1) / 2)
    f_cta1 = font(FONT_BOLD, 48)
    draw.text((200, cta_y0 + 26), "まずは保存して", font=f_cta1, fill=DARK_TEXT)
    draw.text((200, cta_y0 + 90), "あとでゆっくり見返そう", font=f_cta1, fill=DARK_TEXT)

    img.save(out_path)

def build_square(out_path):
    """1080x1080 - Instagram square. レイアウトを詰め、文字サイズを一段階小さくして正方形に収める。"""
    W, H = 1080, 1080
    img, draw = base_canvas(W, H)

    # 1) badge (小さめ)
    badge_x, badge_y, badge_w, badge_h = 60, 44, 296, 70
    rounded_rect(draw, [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], 35, fill=AMBER)
    draw_gift_icon(draw, badge_x + 38, badge_y + 35)
    draw.text((badge_x + 70, badge_y + 15), "無料配布中", font=font(FONT_BOLD, 34), fill=DARK_TEXT)

    # 2) headline (2行に圧縮、フォント少し小さく、行間も詰める)
    f_h1 = font(FONT_BOLD, 70)
    f_h2 = font(FONT_BOLD, 74)
    y = 136
    draw.text((60, y), "太らない食べ方が", font=f_h1, fill=WHITE)
    y += 88
    line2a, line2b = "一目でわかる", "シート"
    draw.text((60, y), line2a, font=f_h2, fill=AMBER)
    draw.text((60 + text_w(draw, line2a, f_h2), y), line2b, font=f_h2, fill=WHITE)
    y += 82
    draw.text((60, y), "「食事管理シート」を無料でプレゼント", font=font(FONT_REG, 30), fill=SOFT_GRAY)

    # 3) card (少しコンパクトに)
    card_y0, card_y1 = 366, 578
    draw_meal_card(draw, 60, card_y0, 1020, card_y1,
                    header_font_size=24, row_font_size=21, row_h=36, row_gap_top=50,
                    donut_r=74, pfc_font_size=18, pfc_sub_font_size=14)

    # 4) bullets (行間・フォントを詰める)
    bullets = [
        "「何を」「どれだけ」食べればいいかが一発でわかる",
        "カロリー管理がグッとラクになる",
        "続けやすい形だから挫折しにくい",
    ]
    by = 612
    f_bullet = font(FONT_REG, 27)
    for b in bullets:
        icx, icy = 82, by + 15
        draw.ellipse([icx - 17, icy - 17, icx + 17, icy + 17], fill=AMBER)
        draw.line([(icx - 8, icy + 1), (icx - 2, icy + 9), (icx + 11, icy - 9)], fill=DARK_TEXT, width=5, joint="curve")
        draw.text((114, by), b, font=f_bullet, fill=WHITE)
        by += 46

    # 5) CTA (下端まで詰めて配置、余白は最小限に)
    draw_centered(draw, W / 2, 784, "続きはハイライトや他の投稿もチェックしてね", font(FONT_REG, 20), SOFT_GRAY)
    cta_y0, cta_y1 = 818, 1058
    rounded_rect(draw, [50, cta_y0, W - 50, cta_y1], 28, fill=AMBER)
    draw_bookmark_icon(draw, 138, (cta_y0 + cta_y1) / 2, w=22, h_top=34, h_bottom=32, notch=12)
    f_cta1 = font(FONT_BOLD, 40)
    draw.text((182, cta_y0 + 34), "まずは保存して", font=f_cta1, fill=DARK_TEXT)
    draw.text((182, cta_y0 + 88), "あとでゆっくり見返そう", font=f_cta1, fill=DARK_TEXT)

    img.save(out_path)

if __name__ == "__main__":
    import os
    out_dir = os.path.dirname(os.path.abspath(__file__))
    build_4x5(os.path.join(out_dir, "freebie-pinned-post.png"))
    build_square(os.path.join(out_dir, "freebie-pinned-post-square.png"))
    print("done")
