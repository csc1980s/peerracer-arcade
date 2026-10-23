import os
import numpy as np
import scipy.ndimage as ndi
from PIL import Image

SRC = r"C:\Users\caldw\Downloads\Gemini_Generated_Image_29lhpz29lhpz29lh.jpg"
OUT_DIR = r"d:\solitaire\assets\images\ships"
os.makedirs(OUT_DIR, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
w, h = im.size
arr = np.array(im)
rgb = arr[:, :, :3].astype(np.float32)

# The 5 ships are cleanly in 5 vertical bands:
bands = [
    ("carrier", 50, 420),
    ("battleship", 420, 720),
    ("cruiser", 720, 960),
    ("submarine", 960, 1180),
    ("destroyer", 1180, 1500)
]

bg_ref = np.array([232, 228, 224], dtype=np.float32)

for name, y1, y2 in bands:
    band_rgb = rgb[y1:y2, :]
    band_h = y2 - y1

    # Distance from table background
    dist = np.linalg.norm(band_rgb - bg_ref, axis=2)

    # Core foreground (excluding left vignette)
    core = (dist > 38) & (band_rgb[:, :, 0] < 190) & (band_rgb[:, :, 1] < 190) & (band_rgb[:, :, 2] < 190)
    core[:, :550] = False
    core[:, 2680:] = False

    # Label connected components within this band to get ONLY the ship (largest)
    labeled, num_features = ndi.label(core)
    if num_features == 0:
        print(f"Warning: no components in band {name}")
        continue

    sizes = [np.sum(labeled == i) for i in range(1, num_features + 1)]
    best_comp = np.argmax(sizes) + 1
    ship_mask = (labeled == best_comp)

    # Dilate 3px for soft edge
    dilated = ndi.binary_dilation(ship_mask, structure=np.ones((5, 5)))

    # Compute soft alpha
    alpha = np.clip((dist - 28.0) / 22.0, 0.0, 1.0)
    alpha[~dilated] = 0.0
    alpha[ship_mask] = 1.0

    ys, xs = np.where(ship_mask)
    ymin, ymax = ys.min(), ys.max()
    xmin, xmax = xs.min(), xs.max()

    pad = 4
    cy1 = max(0, ymin - pad)
    cy2 = min(band_h, ymax + pad + 1)
    cx1 = max(0, xmin - pad)
    cx2 = min(w, xmax + pad + 1)

    crop_rgb = band_rgb[cy1:cy2, cx1:cx2]
    crop_alpha = alpha[cy1:cy2, cx1:cx2]

    res = np.zeros((cy2 - cy1, cx2 - cx1, 4), dtype=np.uint8)
    res[:, :, :3] = crop_rgb.astype(np.uint8)
    res[:, :, 3] = (crop_alpha * 255).astype(np.uint8)

    ship_img = Image.fromarray(res, "RGBA")
    bbox = ship_img.getbbox()
    if bbox:
        ship_img = ship_img.crop(bbox)

    # Save Horizontal
    h_path = os.path.join(OUT_DIR, f"{name}_h.png")
    ship_img.save(h_path, "PNG")

    # Save Vertical (rotate 270 deg clockwise: right becomes up)
    v_img = ship_img.rotate(270, expand=True)
    v_path = os.path.join(OUT_DIR, f"{name}_v.png")
    v_img.save(v_path, "PNG")

    print(f"Success: {name} -> size={ship_img.size}")

print("All 5 ships band-segmented cleanly!")
