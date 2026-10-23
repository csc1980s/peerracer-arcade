# HDRI Environment Setup Guide - Phase 4

## Free HDRI Resources (CC0 License)

### Recommended HDRI for Tank Minefield

**Primary Choice**: Overcast/Battlefield Atmospheres
- **Source**: [Poly Haven](https://polyhaven.com/hdris)
- **License**: CC0 (Public Domain - Free for any use)
- **No Attribution Required**

## Step-by-Step Download Instructions

### Option 1: Poly Haven (Recommended)

1. **Visit Poly Haven HDRI Library**
   ```
   https://polyhaven.com/hdris
   ```

2. **Search for Battlefield-Appropriate HDRIs**
   Recommended searches:
   - "overcast"
   - "soil"
   - "industrial"
   - "wasteland"
   - "military"

3. **Recommended HDRI Downloads**

   **Best Match - Overcast Soil Pure Sky**
   ```
   URL: https://polyhaven.com/a/overcast_soil_puresky
   Resolution: 4K (4096×2048)
   Format: HDR (32-bit float .hdr or .exr)
   File Size: ~15-25 MB
   ```

   **Alternative - Kloofendal Misty Morning**
   ```
   URL: https://polyhaven.com/a/kloofendal_misty_morning_puresky
   Resolution: 4K
   File Size: ~20 MB
   ```

4. **Download Settings**
   - Resolution: **4K** (best quality/performance balance)
   - Format: **HDR** (.hdr format preferred over .exr)
   - Type: **Pure Sky** version (no ground plate)

5. **Save Location**
   ```
   D:\solitaire\assets\env\overcast_soil_4k.hdr
   ```

### Option 2: HDRI Haven (Same as Poly Haven)

Poly Haven is the successor to HDRI Haven - same site!

### Option 3: HDRIHaven.com Archive

If Poly Haven is unavailable, use the Internet Archive:
```
https://web.archive.org/web/*/hdrihaven.com
```

## File Organization

```
D:\solitaire\assets\env\
├── HDRI_SETUP_GUIDE.md (this file)
├── overcast_soil_4k.hdr (Primary HDRI - 4096×2048)
├── kloofendal_4k.hdr (Alternative HDRI)
├── night_sky_4k.hdr (Optional - Night missions)
└── README.txt
```

## Quick Download Commands (Windows PowerShell)

```powershell
# Create assets/env directory
New-Item -Path "D:\solitaire\assets\env" -ItemType Directory -Force

# Download using PowerShell (if direct link available)
# Note: Poly Haven requires browser download with CAPTCHA

# After manual download, move file:
Move-Item -Path "$env:USERPROFILE\Downloads\overcast_soil_puresky_4k.hdr" -Destination "D:\solitaire\assets\env\overcast_soil_4k.hdr"
```

## Manual Download Steps

1. **Open Browser** → Navigate to: https://polyhaven.com/a/overcast_soil_puresky

2. **Click Download Button** → Select:
   - Resolution: 4K
   - Format: HDR
   - Click "Download HDR"

3. **Wait for Download** (15-25 MB file)

4. **Move File**:
   - From: `C:\Users\[YourName]\Downloads\overcast_soil_puresky_4k.hdr`
   - To: `D:\solitaire\assets\env\overcast_soil_4k.hdr`

5. **Rename** (if needed):
   ```
   Rename to: overcast_soil_4k.hdr
   ```

## Verify Installation

Check that file exists and is correct format:

**Windows Command Prompt:**
```cmd
dir "D:\solitaire\assets\env\overcast_soil_4k.hdr"
```

**Expected Output:**
```
Volume in drive D is DATA
Directory of D:\solitaire\assets\env

overcast_soil_4k.hdr    20,485,632 bytes
```

**File size should be**: 15-30 MB (compressed HDR data)

## Testing HDRI in Application

Once downloaded, the EnvironmentManager will automatically load it:

**JavaScript (automatic loading):**
```javascript
import { EnvironmentManager } from './renderer/EnvironmentManager.js';

const envManager = new EnvironmentManager(scene, renderer, {
  enableHDRI: true, // Set to true to use HDRI
  enableMountains: true,
  enableFog: true
});

// Wait for HDRI to load
setTimeout(() => {
  if (envManager.isHDRILoaded()) {
    console.log('✓ HDRI Loaded Successfully!');
  } else {
    console.warn('⚠ HDRI not loaded, using fallback sky');
  }
}, 3000);
```

## Troubleshooting

### Issue: HDRI File Not Found

**Error Message:**
```
HDRI not found, using fallback sky: Error loading assets/env/overcast_soil_4k.hdr
```

**Solutions:**
1. Verify file exists at exact path: `D:\solitaire\assets\env\overcast_soil_4k.hdr`
2. Check file extension is `.hdr` (not `.HDR` or `.hdr.txt`)
3. File size should be 15-30 MB (not 0 KB)
4. Try alternative HDRI from Poly Haven

### Issue: Slow Loading

HDR files are large (15-30 MB). Loading may take 2-5 seconds.

**Solution**: Show loading indicator during HDRI load:
```javascript
statusElement.textContent = 'Loading environment...';
envManager.load().then(() => {
  statusElement.textContent = 'Environment loaded!';
});
```

### Issue: Low FPS After HDRI Load

HDR environment mapping requires GPU power.

**Solutions:**
1. Reduce HDRI resolution to 2K (2048×1024)
2. Disable real-time reflections on mobile:
   ```javascript
   if (isMobileDevice()) {
     scene.environment = null; // Disable IBL
     scene.background = envMap; // Keep skybox only
   }
   ```

## Alternative: Procedural Sky (No Download Needed)

If HDRI download is not possible, the system uses a procedural gradient sky:

**Features:**
- No external files required
- Lightweight (< 1 KB shader)
- Dynamic time-of-day (dawn, noon, twilight, night)
- Atmospheric gradient

**Usage:**
```javascript
const envManager = new EnvironmentManager(scene, renderer, {
  enableHDRI: false, // Use procedural sky
  timeOfDay: 'twilight' // 'dawn' | 'noon' | 'twilight' | 'night'
});

// Change time dynamically
envManager.setTimeOfDay('night');
```

## Performance Comparison

| Environment Type | File Size | Load Time | GPU Memory | FPS Impact |
|------------------|-----------|-----------|------------|------------|
| HDRI 4K | 20 MB | 2-4 sec | 24 MB | -5 FPS |
| HDRI 2K | 8 MB | 1-2 sec | 8 MB | -2 FPS |
| Procedural Sky | 0 KB | Instant | < 1 MB | 0 FPS |

## Recommended Settings

### Desktop (High-End)
```javascript
{
  enableHDRI: true,
  hdriResolution: '4k',
  enableMountains: true,
  fogDensity: 0.008
}
```

### Desktop (Mid-Range)
```javascript
{
  enableHDRI: true,
  hdriResolution: '2k',
  enableMountains: true,
  fogDensity: 0.010
}
```

### Mobile/Tablet
```javascript
{
  enableHDRI: false, // Use procedural
  enableMountains: true,
  fogDensity: 0.012
}
```

## Advanced: Converting EXR to HDR

If you download .exr format instead of .hdr:

**Option 1: Use ImageMagick (Free)**
```bash
# Install ImageMagick: https://imagemagick.org/
magick convert input.exr output.hdr
```

**Option 2: Use HDRI Tools**
- Software: Luminance HDR (Free)
- URL: http://qtpfsgui.sourceforge.net/
- Process: Open .exr → Export as .hdr

## License Confirmation

All HDRIs from Poly Haven are **CC0 Licensed**:
- ✅ Free for commercial use
- ✅ No attribution required
- ✅ Modify freely
- ✅ Redistribute allowed

**Source**: https://polyhaven.com/license

---

## Quick Start Summary

1. Visit: https://polyhaven.com/a/overcast_soil_puresky
2. Click "Download HDR" → Select 4K
3. Save as: `D:\solitaire\assets\env\overcast_soil_4k.hdr`
4. Restart application
5. Verify HDRI loaded in console

**Total Time**: 2-5 minutes
**Cost**: $0 (Free, CC0 license)

---

**Last Updated**: 2026-10-18
**Version**: 1.0
**Phase**: 4 - Environmental Atmosphere
