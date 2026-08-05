# Test Preview Editor v9.0.2

## Viewport portrait

| Viewport | Stage | Canvas portrait | Object fit | Overflow horizontal |
|---|---:|---:|---|---:|
| 393 × 852 | 393 × 383 | 145 × 324 | contain | 0 |
| 360 × 740 | 360 × 302 | 112 × 249 | contain | 0 |
| 320 × 640 | 320 × 257 | 91 × 204 | contain | 0 |

## Viewport landscape

| Viewport | Stage | Canvas portrait | Object fit | Overflow horizontal |
|---|---:|---:|---|---:|
| 844 × 390 | 490 × 193 | 62 × 140 | contain | 0 |

Rasio sumber pengujian: 1220 × 2712. Seluruh frame tetap terlihat tanpa crop.

## Pemeriksaan teknis

- `js/v9-ui.js` lolos `node --check`.
- Preview memperbarui ukuran saat metadata, rasio, viewport, orientasi, dan keyboard berubah.
- MutationObserver hanya memantau class rasio agar tidak menimbulkan loop style.
- Video selalu menggunakan `object-fit: contain !important`.
