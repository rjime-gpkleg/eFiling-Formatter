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

# XFA uses mm, PDF uses points (1mm = 2.8346pt)
# XFA y=0 is at top; PDF y=0 is at bottom
# Page height = 11 inches = 279.4mm = 792pt
MM_TO_PT = 2.8346
PAGE_H_MM = 279.4  # US Letter height in mm

def mm_to_pt(val_mm):
    return round(val_mm * MM_TO_PT, 1)

def parse_mm(s):
    s = s.strip()
    if s.endswith('mm'):
        return float(s[:-2])
    elif s.endswith('pt'):
        return float(s[:-2]) / MM_TO_PT
    return 0.0

# We need to find each field's absolute position considering parent subforms
# The XFA structure is nested: topmostSubform > CopyA > LeftColumn/RightColumn > fields
# We need to track cumulative x,y offsets from parent subforms

# First, let's find the CopyA subform and get its position
# Then LeftColumn, RightColumn positions
# Then each field's x,y relative to its parent

# Simpler approach: find each field and check if there's a parent offset in scope
# Let's parse the XFA XML and track the x/y context

# Find subform positions
subforms = {}
for m in re.finditer(r'<subform\s+name="([^"]+)"[^>]*>', xml):
    sname = m.group(1)
    tag = m.group(0)
    x_m = re.search(r'\bx="([^"]+)"', tag)
    y_m = re.search(r'\by="([^"]+)"', tag)
    x = parse_mm(x_m.group(1)) if x_m else 0.0
    y = parse_mm(y_m.group(1)) if y_m else 0.0
    subforms[sname] = (x, y, m.start())
    print('subform %s: x=%.2fmm y=%.2fmm' % (sname, x, y))

print()

# Now extract fields with their local positions
# Need to figure out which subform each field belongs to by position in XML
# Build list of (start_pos, name, x, y) for subforms
sf_list = [(v[2], k, v[0], v[1]) for k, v in subforms.items()]
sf_list.sort()

seen = set()
results = []
for fm in re.finditer(r'<field\s+name="(f1_\d+|c1_\d+)"([^>]*?)(?:>|/>)', xml, re.DOTALL):
    fname = fm.group(1)
    if fname in seen:
        continue
    seen.add(fname)
    attrs = fm.group(0)
    x_m = re.search(r'\bx="([^"]+)"', attrs)
    y_m = re.search(r'\by="([^"]+)"', attrs)
    w_m = re.search(r'\bw="([^"]+)"', attrs)
    h_m = re.search(r'\bh="([^"]+)"', attrs)
    local_x = parse_mm(x_m.group(1)) if x_m else 0.0
    local_y = parse_mm(y_m.group(1)) if y_m else 0.0
    w = parse_mm(w_m.group(1)) if w_m else 0.0
    h = parse_mm(h_m.group(1)) if h_m else 0.0
    
    # Find which subforms contain this field (by position in XML)
    parent_offset_x, parent_offset_y = 0.0, 0.0
    for (sf_pos, sf_name, sf_x, sf_y) in sf_list:
        if sf_pos < fm.start():
            parent_offset_x += sf_x
            parent_offset_y += sf_y
    
    # Only use innermost parent chain - let's approximate differently
    # Just print local positions, we'll handle parents separately
    results.append((fname, local_x, local_y, w, h))

for r in results:
    print('%s: x=%.2fmm y=%.2fmm w=%.2fmm h=%.2fmm' % r)
