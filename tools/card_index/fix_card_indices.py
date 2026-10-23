#!/usr/bin/env python3
"""
Resize the corner indices (rank + suit) of every deck in decks/ to the
"Digital UI Optimized" profile from "Playing Card Index Proportions.md".

Source  : decks/<deck>/<R><S>.png      e.g. JH.png, 10C.png   (original art, small index)
Output  : decks/<deck>/<R>_<suit>.png  e.g. J_hearts.png      (the files the game loads)

For each card it:
  1. erases the old small index (top-left and bottom-right),
  2. if a framed art panel (court cards, inner pip frames) would sit under the
     new index, cuts a rounded notch into the panel corner and re-draws the
     frame along the notch using the frame's own colours,
  3. draws the new index: rank 12.45% of card height, gap 1.22%, pip 7.96%,
     5.14% / 4.08% margins, rotated copy in the bottom-right corner.

Usage
  python fix_card_indices.py DECKS_DIR                 # preview -> DECKS_DIR/../decks_index_preview/
  python fix_card_indices.py DECKS_DIR --deck botanical_garden --card JH
  python fix_card_indices.py DECKS_DIR --apply         # write into the decks (old files go to _index_backup/)

Needs Python 3 with Pillow and numpy. Fonts live in fonts/ next to this script.
"""
import argparse, math, os, shutil, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_SANS = os.path.join(HERE, 'fonts', 'Inter-Bold.otf')
FONT_SERIF = os.path.join(HERE, 'fonts', 'LiberationSerif-Bold.ttf')
SERIF_DECKS = {'classic_standard', 'royal_cats', 'victorian_christmas', 'wild_west_frontier'}
# cards the script cannot handle cleanly yet (art-style aces, soft-vignette courts, oversized old indices);
# they are left untouched unless named explicitly with --card/--deck and --force
SKIP_CARDS = {'royal_cats': {'AS', 'KS', 'QS'}, 'classic_standard': {'KS', 'QS', 'JS'},
              'victorian_christmas': {'KS', 'QS', 'JS', 'KH', 'QH', 'JH', 'KD', 'QD', 'JD', 'KC', 'QC', 'JC'}}
SKIP_DECKS = {'classic_standard_backup_v1', 'royal_cats_waistup', 'authentic_cards'}

RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
SUITS = {'S': 'spades', 'H': 'hearts', 'D': 'diamonds', 'C': 'clubs'}

# Digital UI Optimized profile, written for a 350 x 490 card
SPEC = dict(mx=18, my=20, box_w=56, rank_h=61, gap=6, pip_h=39)


# ----------------------------------------------------------------------------- helpers
def components(mask):
    """4-connected components -> list of (x0, y0, x1, y1, pixel list)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    out = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        q = deque([(y, x)]); seen[y, x] = True; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        p = np.array(pts)
        out.append((p[:, 1].min(), p[:, 0].min(), p[:, 1].max(), p[:, 0].max(), p))
    return out


def dilate(mask, r):
    im = Image.fromarray(mask.astype(np.uint8) * 255)
    return np.array(im.filter(ImageFilter.MaxFilter(2 * r + 1))) > 0


def smooth(e0, e1, x):
    return np.clip((x - e0) / (e1 - e0), 0, 1)


def rbox_sdf(xs, ys, cx, cy, hx, hy, r):
    qx = np.abs(xs - cx) - hx + r
    qy = np.abs(ys - cy) - hy + r
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def round_intersect(d1, d2, r):
    return np.minimum(-r, np.maximum(d1, d2)) + np.hypot(np.maximum(r + d1, 0), np.maximum(r + d2, 0))


# ----------------------------------------------------------------------------- suit shapes
def heart_pts(cx, top, h):
    pts = []
    for i in range(360):
        t = 2 * math.pi * i / 360
        pts.append((16 * math.sin(t) ** 3,
                    -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))))
    y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
    k = h / (y1 - y0)
    return [(cx + x * k, top + (y - y0) * k) for x, y in pts]


def draw_suit(dr, suit, cx, top, h, color):
    if suit == 'hearts':
        dr.polygon(heart_pts(cx, top, h), fill=color)
    elif suit == 'diamonds':
        w = h * 0.78; pts = []
        for i in range(4):  # slightly concave sides
            a = [(cx, top), (cx + w / 2, top + h / 2), (cx, top + h), (cx - w / 2, top + h / 2)]
            p0, p1 = a[i], a[(i + 1) % 4]
            for s in range(20):
                t = s / 20
                x = p0[0] + (p1[0] - p0[0]) * t; y = p0[1] + (p1[1] - p0[1]) * t
                bow = math.sin(math.pi * t) * h * 0.035
                pts.append((x + (cx - x) * bow / (w / 2) * 0.9, y + (top + h / 2 - y) * bow / (h / 2)))
        dr.polygon(pts, fill=color)
    elif suit == 'spades':
        body_h = h * 0.80
        pts = [(x, 2 * (top) + body_h - y) for x, y in heart_pts(cx, top, body_h)]  # upside-down heart
        dr.polygon(pts, fill=color)
        stem(dr, cx, top + body_h * 0.62, top + h, h, color)
    elif suit == 'clubs':
        r = h * 0.215
        for ox, oy in ((0, top + r), (-r * 1.12, top + r * 2.45), (r * 1.12, top + r * 2.45)):
            dr.ellipse((cx + ox - r, oy - r, cx + ox + r, oy + r), fill=color)
        dr.ellipse((cx - r * 0.6, top + r * 1.5, cx + r * 0.6, top + r * 2.9), fill=color)
        stem(dr, cx, top + r * 2.2, top + h, h, color)


def stem(dr, cx, y0, y1, h, color):
    pts = []
    for i in range(21):  # flared foot with curved sides
        t = i / 20
        y = y0 + (y1 - y0) * t
        half = h * (0.035 + 0.17 * t ** 2.2)
        pts.append((cx - half, y))
    for i in range(20, -1, -1):
        t = i / 20
        y = y0 + (y1 - y0) * t
        half = h * (0.035 + 0.17 * t ** 2.2)
        pts.append((cx + half, y))
    dr.polygon(pts, fill=color)


# ----------------------------------------------------------------------------- per-corner work
class Skip(Exception):
    pass


def find_old_index(a, bg):
    """Locate the old index in the top-left corner. Returns (rank_comp, pip_comp, other_comps)."""
    x0, y0, x1, y1 = 28, 28, 125, 200
    win = a[y0:y1, x0:x1, :3]
    m = np.abs(win - bg).sum(2) > 90
    found = []
    for c in components(m):
        cx0, cy0, cx1, cy1, p = c
        if len(p) < 30 or cx0 == 0 or cy0 == 0 or cx1 >= x1 - x0 - 1 or cy1 >= y1 - y0 - 1:
            continue  # noise, or something running out of the window (border lines, art)
        found.append((cx0 + x0, cy0 + y0, cx1 + x0, cy1 + y0, p + [y0, x0]))
    if not found:
        raise Skip('no old index found')
    glyphs = [c for c in found if not (c[2] < 52 and c[3] < 52)]  # tiny corner bits decided later
    if len(glyphs) < 2:
        raise Skip('old index not recognised')
    glyphs.sort(key=lambda c: c[1])
    pip = glyphs[-1]
    rank = [c for c in glyphs[:-1] if c[3] < pip[1] + 4]
    if not rank:
        raise Skip('old rank not recognised')
    small = [c for c in found if c[2] < 52 and c[3] < 52]
    return rank, pip, glyphs, small


def ink_colours(a, bg, rank, pip):
    px = np.concatenate([a[c[4][:, 0], c[4][:, 1], :3] for c in rank])
    d = np.abs(px - bg).sum(1)
    ink = np.median(px[d >= np.percentile(d, 70)], 0)
    pp = a[pip[4][:, 0], pip[4][:, 1], :3]
    # accent dot = pixels that are neither ink, background, nor a blend of the two
    seg = bg - ink
    t = np.clip(((pp - ink) @ seg) / max(seg @ seg, 1), 0, 1)
    off_blend = np.abs(pp - (ink + t[:, None] * seg)).sum(1)
    accent = pp[(off_blend > 110) & (np.abs(pp - ink).sum(1) > 120) & (np.abs(pp - bg).sum(1) > 120)]
    dot = tuple(int(v) for v in np.median(accent, 0)) if len(accent) >= 15 else None
    return tuple(int(v) for v in ink), dot


def erase(a, glyphs, bg):
    h, w = a.shape[:2]
    for c in glyphs:
        x0, y0, x1, y1, p = c
        bx0, by0, bx1, by1 = max(x0 - 6, 0), max(y0 - 6, 0), min(x1 + 7, w), min(y1 + 7, h)
        m = np.zeros((by1 - by0, bx1 - bx0), bool)
        m[p[:, 0] - by0, p[:, 1] - bx0] = True
        m = dilate(m, 2)
        sub = a[by0:by1, bx0:bx1]
        ring = sub[~m]
        fill = np.median(ring, 0) if len(ring) else np.append(bg, 255)
        sub[m] = fill


def find_panel(a, bg, W, H):
    """Hard-edged panel/frame whose top-left corner would sit under the new index."""
    rows = np.arange(int(H * 0.3), int(H * 0.7), 4)
    cols = np.arange(int(W * 0.3), int(W * 0.7), 4)
    def first_edge(line_of):  # first offset where >=85% of samples leave the background
        for t in range(36, 220):
            dev = np.abs(line_of(t) - bg).sum(1) > 24
            if dev.mean() > 0.85:
                return t
        return None
    xp = first_edge(lambda x: a[rows, x, :3])
    yp = first_edge(lambda y: a[y, cols, :3])
    if xp is None or yp is None:
        return None
    # edge must be sharp: background a few px before, clearly different 2 px after
    row = a[rows, :, :3]
    before = np.abs(row[:, xp - 3] - bg).sum(1).mean()
    d1 = np.abs(row[:, xp + 1] - bg).sum(1).mean()
    d8 = np.abs(row[:, xp + 8] - bg).sum(1).mean()
    if before > 12 or d1 < 40 or d1 < 0.5 * d8:  # soft vignettes are not frames
        return None
    return xp, yp


def box_blur(a, r):
    """Separable box blur (edge-replicated), approximates a gaussian after a couple of passes."""
    k = 2 * r + 1
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        hi = np.take(c, np.arange(k, c.shape[axis]), axis=axis)
        lo = np.take(c, np.arange(0, c.shape[axis] - k), axis=axis)
        a = (hi - lo) / k
    return a


def smooth_fill(img, mask, radius=10):
    """Fill masked pixels from their surroundings (normalised blur), so a gradient background stays smooth."""
    out = img.copy()
    todo = mask.copy()
    known = (~mask).astype(np.float64)
    for r in (radius, radius * 3, radius * 9):
        if not todo.any():
            break
        kw = box_blur(box_blur(known, r), r)
        num = box_blur(box_blur(img[..., :3] * known[..., None], r), r)
        ok = todo & (kw > 0.08)
        out[..., :3][ok] = num[ok] / kw[ok][:, None]
        todo &= ~(kw > 0.08)
    return out


def reddish(c):
    c = np.asarray(c, float)
    return c[0] - max(c[1], c[2]) > 50


RED_INK = (190, 28, 36)


def fallback_erase(a, bg, panel, cached, suit=None):
    """Old index touches a border or the art: erase pixels in the ink colour inside the
    corner area only (stopping short of the panel and the outer border lines)."""
    x1 = min(125, panel[0] - 3) if panel else 150
    y1 = min(200, panel[1] - 3) if panel else 250
    x0 = y0 = 31
    sub = a[y0:y1, x0:x1]
    diff = np.abs(sub[..., :3] - bg).sum(2)
    if cached:
        ink = np.array(cached[0], float)
    else:
        core = sub[5:45, 5:60, :3].reshape(-1, 3)
        dd = np.abs(core - bg).sum(1)
        if (dd > 150).sum() < 40:
            raise Skip('old index not recognised')
        ink = np.median(core[dd > np.percentile(dd, 85)], 0)
    near = (np.abs(sub[..., :3] - ink).sum(2) < 150) & (diff > 90)
    if suit in ('hearts', 'diamonds'):  # old index may mix a black rank with a red pip: take both
        red = (sub[..., 0] - np.maximum(sub[..., 1], sub[..., 2]) > 45) & (diff > 60)
        near |= red
        if red.sum() > 30:
            ink = np.median(sub[red][:, :3], 0)
    if near.sum() < 200:
        raise Skip('old index not recognised')
    m = dilate(near, 3) & (diff > 12)
    sub[:] = smooth_fill(sub, m)
    return (tuple(int(v) for v in ink), cached[1] if cached else None)


def process_corner(a, bg, rank, suit, font_path, W, H, notes, cache):
    """Fix the top-left corner of `a` (float RGBA array) in place."""
    S = W / 350.0
    mx, my = SPEC['mx'] * S, SPEC['my'] * S
    box_w, rank_h, gap, pip_h = SPEC['box_w'] * S, SPEC['rank_h'] * S, SPEC['gap'] * S, SPEC['pip_h'] * S
    xc = mx + box_w / 2
    panel = find_panel(a, bg, W, H)
    colour_key = 'red' if suit in ('hearts', 'diamonds') else 'black'
    try:
        old_rank, old_pip, glyphs, small = find_old_index(a, bg)
        ink, dot = ink_colours(a, bg, old_rank, old_pip)
        # tiny corner pieces in the ink colour are bits of the old index; other colours are ornaments
        glyphs += [c for c in small
                   if np.abs(np.median(a[c[4][:, 0], c[4][:, 1], :3], 0) - np.array(ink)).sum() < 120]
        erase(a, glyphs, bg)
        cache.setdefault(colour_key, (ink, dot))
    except Skip:
        ink, dot = fallback_erase(a, bg, panel, cache.get(colour_key), suit)
        notes.add('fallback erase')

    # one colour for the whole index: red suits get a red rank, black suits a black one
    if suit in ('hearts', 'diamonds') and not reddish(ink):
        ink = RED_INK
    if suit in ('spades', 'clubs') and reddish(ink):
        ink = (24, 24, 27)

    # notch a framed panel out of the way
    if panel:
        xp, yp = panel
        nx, ny = mx + box_w + 6, my + rank_h + gap + pip_h + 8
        if xp < nx and yp < ny:
            # frame cross-section, averaged over many rows; the frame ends where the
            # rows start to disagree (that is the art)
            rows = np.arange(int(H * 0.3), int(H * 0.7), 3)
            strip = a[rows, xp - 4:xp + 22, :]
            spread = np.abs(strip[..., :3] - np.median(strip[..., :3], 0)).sum(2).mean(0)
            prof_depth = 22
            for k in range(6, strip.shape[1]):
                if spread[k] > 18:
                    prof_depth = k - 4
                    break
            prof = np.median(strip, 0)[:prof_depth + 4]
            CW, CH = int(W * 0.4), int(H * 0.4)  # only the corner can change
            ys, xs = np.mgrid[0:CH, 0:CW].astype(float) + 0.5
            pr = 12
            pan = rbox_sdf(xs, ys, W / 2, H / 2, W / 2 - xp, H / 2 - yp, pr)
            notch = rbox_sdf(xs, ys, nx - 2000, ny - 2000, 2000, 2000, 20)
            d = round_intersect(pan, -notch, 12)
            idx = np.clip(4 - d, 0, len(prof) - 1)  # profile index: 0 = 4 px outside the edge
            i0 = np.floor(idx).astype(int); fr = (idx - i0)[..., None]
            gen = prof[i0] * (1 - fr) + prof[np.minimum(i0 + 1, len(prof) - 1)] * fr
            outside = d > 4
            gen[outside] = np.append(bg, 255)
            c = a[:CH, :CW]
            deep = d < -(prof_depth - 1)
            gen[deep] = c[deep]
            wgt = (smooth(0.0, 1.0, d - pan) * smooth(1.0, 0.0, pan))[..., None]
            # pip cards: never repaint ink (pips) that sits inside the panel next to the notch
            inner = c[int(H * 0.2):int(H * 0.4), int(xp + 30):int(W * 0.4), :3]
            if np.abs(inner - bg).sum(2).mean() < 25:
                keep = ((np.abs(c[..., :3] - bg).sum(2) > 60) & (d < -3.0))[..., None]
                wgt = wgt * (~keep)
            c[:] = c * (1 - wgt) + gen * wgt
            notes.add('notched art panel')

    # new index, supersampled
    SS = 4
    CW, CH = int(W * 0.4), int(H * 0.4)
    lay = Image.new('RGBA', (CW * SS, CH * SS), (0, 0, 0, 0))
    dr = ImageDraw.Draw(lay)
    target = rank_h * SS
    size = int(target)
    for _ in range(6):
        f = ImageFont.truetype(font_path, size)
        l, t, r, b = f.getbbox(rank)
        size = max(8, int(size * target / (b - t)))
    f = ImageFont.truetype(font_path, size)
    if rank == '10':
        # condensed pair with tight tracking, fitted to the index box
        g1, g0 = f.getbbox('1'), f.getbbox('0')
        track = -0.04 * size
        tw = (g1[2] - g1[0]) + track + (g0[2] - g0[0])
        tmp = Image.new('L', (int(tw + 20), int(target * 1.6)), 0)
        td = ImageDraw.Draw(tmp)
        top = f.getbbox('10')[1]
        td.text((10 - g1[0], -top + 4), '1', font=f, fill=255)
        td.text((10 + (g1[2] - g1[0]) + track - g0[0], -top + 4), '0', font=f, fill=255)
        tmp = tmp.crop(tmp.getbbox())
        maxw = box_w * SS * 0.98
        cw = min(tmp.width * 0.82, maxw) if tmp.width * 0.82 > maxw * 0.7 else tmp.width
        tmp = tmp.resize((int(cw), int(target)), Image.LANCZOS)
        solid = Image.new('RGBA', tmp.size, ink + (255,))
        lay.paste(solid, (int(xc * SS - tmp.width / 2), int(my * SS)), tmp)
    else:
        l, t, r, b = f.getbbox(rank)
        dr.text((xc * SS - (r - l) / 2 - l, my * SS - t), rank, font=f, fill=ink)
    pip_top = (my + rank_h + gap) * SS
    draw_suit(dr, suit, xc * SS, pip_top, pip_h * SS, ink)
    if dot and suit in ('hearts', 'spades', 'diamonds'):
        cy = pip_top + pip_h * SS * (0.42 if suit != 'spades' else 0.5)
        rr = pip_h * SS * 0.075
        dr.ellipse((xc * SS - rr, cy - rr, xc * SS + rr, cy + rr), fill=dot)
    lay = lay.resize((CW, CH), Image.LANCZOS)

    # soft background halo so the index stays readable over faded / vignette art
    alpha = np.array(lay.getchannel('A'))
    halo = Image.fromarray(alpha).filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(5))
    hw = (np.array(halo).astype(float) / 255.0)[..., None]
    c = a[:CH, :CW]
    flat = (np.abs(c[..., :3] - bg).sum(2) < 45)[..., None]  # never wipe out art with the halo
    hw = hw * flat
    region = np.abs(c[50:250, 40:200, :3] - bg).sum(2)
    if (region < 14).mean() > 0.6:  # flat paper: plain background colour
        soft = np.broadcast_to(np.append(bg, 255), c.shape)
    else:  # gradient background (art-style cards): fill from the surroundings
        soft = smooth_fill(c, (hw[..., 0] > 0.02) | (alpha > 0))
    c[:] = c * (1 - hw) + soft * hw
    la = np.array(lay).astype(float)
    al = la[..., 3:4] / 255.0
    c[..., :3] = c[..., :3] * (1 - al) + la[..., :3] * al


def fix_card(path, rank, suit, font_path, cache):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    alpha = im.getchannel('A')
    a = np.array(im).astype(float)
    # card background: the strip between the outer border and any art panel
    bg = np.median(a[int(H * 0.2):int(H * 0.8), 36:44, :3].reshape(-1, 3), 0)
    notes = set()
    process_corner(a, bg, rank, suit, font_path, W, H, notes, cache)
    a = a[::-1, ::-1].copy()
    process_corner(a, bg, rank, suit, font_path, W, H, notes, cache)
    a = a[::-1, ::-1]
    out = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), 'RGBA')
    out.putalpha(alpha)
    return out, notes


# ----------------------------------------------------------------------------- driver
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('decks_dir')
    ap.add_argument('--deck', action='append')
    ap.add_argument('--card', action='append', help='source code like JH, 10C')
    ap.add_argument('--force', action='store_true', help='also process SKIP_CARDS')
    ap.add_argument('--apply', action='store_true', help='write into the deck folders (backs up first)')
    ap.add_argument('--out', help='preview folder (default: <decks_dir>/../decks_index_preview)')
    args = ap.parse_args()

    decks_dir = os.path.abspath(args.decks_dir)
    out_root = args.out or os.path.join(os.path.dirname(decks_dir), 'decks_index_preview')
    decks = args.deck or sorted(d for d in os.listdir(decks_dir)
                                if os.path.isdir(os.path.join(decks_dir, d)) and d not in SKIP_DECKS)
    done, skipped = 0, []
    for deck in decks:
        ddir = os.path.join(decks_dir, deck)
        font = FONT_SERIF if deck in SERIF_DECKS else FONT_SANS
        cache = {}  # ink / accent colours per suit colour, reused when a card's old index is hard to read
        for r in RANKS:
            for s, suit in SUITS.items():
                code = r + s
                if args.card and code not in args.card:
                    continue
                if code in SKIP_CARDS.get(deck, ()) and not args.force:
                    skipped.append(f'{deck}/{code}: known problem card, left unchanged')
                    continue
                src = os.path.join(ddir, code + '.png')
                if not os.path.exists(src):
                    continue
                name = f'{r}_{suit}.png'
                try:
                    img, notes = fix_card(src, r, suit, font, cache)
                except Skip as e:
                    skipped.append(f'{deck}/{code}: {e}')
                    continue
                if args.apply:
                    dst = os.path.join(ddir, name)
                    if os.path.exists(dst):
                        bdir = os.path.join(ddir, '_index_backup')
                        os.makedirs(bdir, exist_ok=True)
                        if not os.path.exists(os.path.join(bdir, name)):
                            shutil.copy2(dst, os.path.join(bdir, name))
                else:
                    os.makedirs(os.path.join(out_root, deck), exist_ok=True)
                    dst = os.path.join(out_root, deck, name)
                img.save(dst, optimize=True)
                done += 1
                print(f'{deck}/{name}' + (f'  ({", ".join(sorted(notes))})' if notes else ''), flush=True)
    print(f'\n{done} cards written to {"the deck folders" if args.apply else out_root}')
    if skipped:
        print(f'{len(skipped)} skipped (left unchanged):')
        for s in skipped:
            print('  ' + s)


if __name__ == '__main__':
    main()
