import os
import base64

OUT_DIR = r"d:\solitaire\assets\images\ships"
ships = ["carrier", "battleship", "cruiser", "destroyer", "submarine"]

js_code = "/** Pre-loaded base64 3D miniature ship sprites */\nexport const SHIP_SPRITE_DATA = {\n"

for name in ships:
    for orient in ["h", "v"]:
        p = os.path.join(OUT_DIR, f"{name}_{orient}.png")
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        js_code += f'  "{name}_{orient}": "data:image/png;base64,{b64}",\n'

js_code += "};\n"

dest = r"d:\solitaire\src\renderer\naval\ShipSpriteAssets.js"
with open(dest, "w", encoding="utf-8") as f:
    f.write(js_code)

print("Generated ShipSpriteAssets.js successfully, size:", len(js_code))
