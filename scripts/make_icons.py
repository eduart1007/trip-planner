import math
import struct
import zlib
from pathlib import Path

BLUE = (37, 99, 235)
WHITE = (255, 255, 255)


def in_triangle(px, py, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    d1 = sign((px, py), a, b)
    d2 = sign((px, py), b, c)
    d3 = sign((px, py), c, a)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


def color_at(u, v, scale):
    # Scale the pin around the middle of the icon (smaller = more empty border)
    x = (u - 0.5) / scale + 0.5
    y = (v - 0.5) / scale + 0.5
    cx, cy, r, tip_y = 0.5, 0.40, 0.19, 0.80

    if (x - cx) ** 2 + (y - cy) ** 2 <= 0.075**2:
        return BLUE  # the hole in the pin
    if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
        return WHITE
    beta = math.acos(r / (tip_y - cy))
    a = (cx - r * math.sin(beta), cy + r * math.cos(beta))
    b = (cx + r * math.sin(beta), cy + r * math.cos(beta))
    if in_triangle(x, y, (cx, tip_y), a, b):
        return WHITE
    return BLUE


def render(size, scale):
    samples = 3  # smooth edges: 3 x 3 samples per pixel
    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            r = g = b = 0
            for sy in range(samples):
                for sx in range(samples):
                    u = (px + (sx + 0.5) / samples) / size
                    v = (py + (sy + 0.5) / samples) / size
                    cr, cg, cb = color_at(u, v, scale)
                    r += cr
                    g += cg
                    b += cb
            n = samples * samples
            row.append((round(r / n), round(g / n), round(b / n)))
        rows.append(row)
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in rows)

    def chunk(tag, data):
        body = struct.pack(">I", len(data)) + tag + data
        return body + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(png)
    print("Created", path)


write_png("public/icons/icon-192.png", 192, render(192, 1.0))
write_png("public/icons/icon-512.png", 512, render(512, 1.0))
write_png("public/icons/maskable-512.png", 512, render(512, 0.8))  # safe zone for round icons
write_png("app/apple-icon.png", 180, render(180, 1.0))
write_png("app/icon.png", 512, render(512, 1.0))
