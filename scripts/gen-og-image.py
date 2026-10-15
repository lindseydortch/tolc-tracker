#!/usr/bin/env python3
"""Generate public/og-image.png for TOLC Tracker.

Conference Badge Wall style per DESIGN.md:
- violet-black ground, one badge card one step lighter
- punched lanyard slot at the top, 💌 as the "ID photo"
- big condensed wordmark, mono handle, dashed perforation
- full-strength status ribbon across the foot (violet + sage/apricot/crimson dots)

Run from the repo root: python3 scripts/gen-og-image.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630

# DESIGN.md palette
GROUND = "#110f15"
BADGE = "#1f1b25"
BADGE_HI = "#29242f"
LINE = "#352e3d"
INK = "#efeae3"
INK_2 = "#bdb5c4"
INK_3 = "#958d9f"
VIOLET = "#5a27ba"
CRIMSON = "#c12544"
APRICOT = "#f7ab60"
SAGE = "#b0baa3"

FONT_DIRS = [
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/noto",
]


def font(name, size):
    for d in FONT_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    raise FileNotFoundError(f"font {name} not found")


def emoji_font(size=109):
    p = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
    # NotoColorEmoji is CBDT (color bitmap): PIL can only use its embedded
    # strikes, not arbitrary sizes. 109 is a native strike.
    return ImageFont.truetype(p, size, layout_engine=ImageFont.Layout.RAQM)


def rounded_rect(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def main():
    img = Image.new("RGB", (W, H), GROUND)
    draw = ImageDraw.Draw(img)

    # soft halo behind the badge (violet wash)
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse((240, 60, 960, 570), fill=(90, 39, 186, 42))
    img = Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB")
    draw = ImageDraw.Draw(img)

    # badge card
    card = (90, 95, 1110, 560)
    rounded_rect(draw, card, 26, BADGE, outline=LINE, width=2)

    # punched lanyard slot at the top
    slot = (558, 84, 642, 118)
    punched = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(punched)
    pd.rectangle((120, 100, 1080, 102), fill=(17, 15, 21, 255))
    draw.rectangle(slot, fill=GROUND)
    draw.rectangle((slot[0] + 14, slot[1] - 4, slot[2] - 14, slot[3] + 40), fill=VIOLET)
    # slot punch notch
    draw.polygon(
        [(slot[0], 118), (slot[2], 118), (slot[2] - 12, 132), (slot[0] + 12, 132)],
        fill=GROUND,
    )

    # avatar circle + 💌 ID photo
    avatar_cx, avatar_cy, avatar_r = 292, 236, 78
    draw.ellipse(
        (avatar_cx - avatar_r, avatar_cy - avatar_r, avatar_cx + avatar_r, avatar_cy + avatar_r),
        fill=BADGE_HI,
        outline=VIOLET,
        width=6,
    )
    ef = emoji_font()
    # Noto Color Emoji glyph metrics vary; draw from the glyph's own bbox
    bbox = ef.getbbox("💌")
    ew, eh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (avatar_cx - ew / 2 - bbox[0], avatar_cy - eh / 2 - bbox[1]),
        "💌",
        font=ef,
        embedded_color=True,
    )

    # wordmark (big, condensed voice)
    wf = font("DejaVuSans-Bold.ttf", 96)
    draw.text((408, 150), "TOLC", font=wf, fill=INK)
    draw.text((408, 252), "TRACKER", font=wf, fill=VIOLET)

    # mono "handle" line
    mf = font("DejaVuSansMono-Bold.ttf", 26)
    draw.text((410, 372), "the offer letter club", font=mf, fill=INK_3)

    # dashed perforation above the facts
    y = 444
    x = 120
    while x < 1080:
        draw.rectangle((x, y, x + 26, y + 4), fill=LINE)
        x += 42

    # facts row: palette dots + one-liner
    df = font("DejaVuSans.ttf", 27)
    draw.text((120, 468), "the members-only referral directory", font=df, fill=INK_2)
    dots = [(APRICOT, 730), (CRIMSON, 770), (VIOLET, 810), (SAGE, 850)]
    for color, dx in dots:
        draw.ellipse((dx, 474, dx + 18, 492), fill=color)

    # status ribbon across the foot
    ribbon_top = 508
    draw.rectangle((card[0] + 26, ribbon_top, card[2] - 26, 532), fill=VIOLET)
    rf = font("DejaVuSans-Bold.ttf", 22)
    draw.text((150, ribbon_top + 2), "THE OFFER LETTER CLUB", font=rf, fill="#ffffff")

    out = "public/og-image.png"
    os.makedirs("public", exist_ok=True)
    img.save(out, "PNG")
    print(f"wrote {out}: {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
