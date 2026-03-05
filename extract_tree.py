import zlib, re, sys

with open('pdfs/f1042s.pdf', 'rb') as f:
    data = f.read()

xml = None
for m in re.finditer(b'stream\r\n', data):
    start = m.end()
    end_m = re.search(b'\r\nendstream', data[start:start+2000000])
    if not end_m:
        continue
    raw = data[start:start+end_m.start()]
    try:
        dec = zlib.decompress(raw, 15)
        if len(dec) > 50000:
            xml = dec.decode('utf-8', errors='replace')
            break
    except Exception:
        pass

# Find LeftColumn and RightColumn subforms with their positions
for m in re.finditer(r'<subform\s+name="(LeftColumn|RightColumn|PgHeader|Body|CopyA|topmostSubform)"([^>]*?)(?:>|/>)', xml, re.DOTALL):
    sname = m.group(1)
    attrs = m.group(0)
    x_m = re.search(r'\bx="([^"]+)"', attrs)
    y_m = re.search(r'\by="([^"]+)"', attrs)
    w_m = re.search(r'\bw="([^"]+)"', attrs)
    h_m = re.search(r'\bh="([^"]+)"', attrs)
    print('subform %s: x=%s y=%s w=%s h=%s at pos=%d' % (
        sname,
        x_m.group(1) if x_m else '?',
        y_m.group(1) if y_m else '?',
        w_m.group(1) if w_m else '?',
        h_m.group(1) if h_m else '?',
        m.start()
    ))
