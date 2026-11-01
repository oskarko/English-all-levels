# Usage: python contact.py out.png img1.png img2.png ... (grid 2 columns)
import sys, fitz
out, imgs = sys.argv[1], sys.argv[2:]
cols = 2; W, H = 842, 595
rows = (len(imgs) + cols - 1) // cols
doc = fitz.open(); page = doc.new_page(width=W * cols, height=H * rows)
for i, p in enumerate(imgs):
    r, c = divmod(i, cols)
    page.insert_image(fitz.Rect(c * W + 4, r * H + 4, (c + 1) * W - 4, (r + 1) * H - 4), filename=p)
page.get_pixmap(dpi=62).save(out)
