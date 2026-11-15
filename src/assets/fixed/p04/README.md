# P-04 inspector model — measured derivative

The story uses a derivative of the NASA Perseverance GLB for the monitor's
inspector. The original file is never modified and stays where the book scene
already uses it.

| | Original | Inspector derivative |
| --- | --- | --- |
| Path | `src/assets/3d-models/25042_Perseverance.glb` | `src/assets/fixed/p04/percy-inspector.glb` |
| File size | 11.15 MB | 1.49 MB |
| Triangles | 199,309 | 184,114 |
| Meshes | 65 | 20 |
| Materials | 48 | 30 |
| Images | 24 | 23 |
| Extensions | — | `EXT_texture_webp`, `KHR_draco_mesh_compression` |

Regenerated with gltf-transform 4.5.1:

```sh
npx @gltf-transform/cli optimize \
  src/assets/3d-models/25042_Perseverance.glb \
  src/assets/fixed/p04/percy-inspector.glb \
  --compress draco --texture-compress webp --texture-size 1024
```

## Why a derivative

`INSPECTOR_LOAD_DEADLINE_MS` is 10 s. In a software-rendered headless Chrome the
original file did not finish parsing inside that budget, so the monitor fell
back to the still picture. The derivative parses in well under a second there.

Draco decoding uses `public/draco`, which the book already ships; WebP textures
are supported by every browser the story targets (the in-app copy has no
requirement for older engines).

## Texture budget

23 WebP images at no more than 1024 px on their longest side. At 4 bytes per
pixel plus a third for the mip chain that is roughly 40 MB of GPU memory if
every image is 1024×1024 RGBA; in practice most are smaller. The monitor is
about 900 CSS px wide, so 1024 px textures are already at the edge of useful
detail. Re-measure here before raising the size.

## Not verified

- Real GPU draw calls and frame time (the browser checks ran on SwiftShader).
- Whether the reduced mesh count drops any visually important detail; the
  anchor calibration pass in Task 5 is where that gets compared.
