"""Allège un .docx python-docx : retire les parties inutiles (vignette, styles
dupliqués, styles latents) sans toucher au contenu."""
import sys, zipfile, re
src, dst = sys.argv[1], sys.argv[2]
DROP = {'word/stylesWithEffects.xml', 'word/webSettings.xml', 'docProps/thumbnail.jpeg',
        'customXml/item1.xml', 'customXml/_rels/item1.xml.rels', 'customXml/itemProps1.xml'}
zin = zipfile.ZipFile(src)
zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED, compresslevel=9)
for item in zin.infolist():
    if item.filename in DROP:
        continue
    data = zin.read(item.filename)
    if item.filename == '[Content_Types].xml':
        s = data.decode()
        for part in DROP:
            s = re.sub(r'<Override PartName="/%s"[^>]*/>' % re.escape(part), '', s)
        s = re.sub(r'<Default Extension="jpeg"[^>]*/>', '', s)
        data = s.encode()
    elif item.filename.endswith('.rels'):
        s = data.decode()
        s = re.sub(r'<Relationship [^>]*Target="[^"]*(stylesWithEffects|webSettings|thumbnail|customXml|item1)[^"]*"[^>]*/>', '', s)
        data = s.encode()
    elif item.filename == 'word/styles.xml':
        s = data.decode()
        s = re.sub(r'<w:latentStyles.*?</w:latentStyles>', '', s, flags=re.S)
        doc = zin.read('word/document.xml').decode()
        used = set(re.findall(r'<w:(?:pStyle|rStyle|tblStyle) w:val="([^"]+)"', doc))
        used |= {'Normal', 'DefaultParagraphFont', 'TableNormal', 'NoList'}
        blocks = re.findall(r'<w:style\b.*?</w:style>', s, flags=re.S)
        by_id = {re.search(r'w:styleId="([^"]+)"', b).group(1): b for b in blocks}
        changed = True
        while changed:
            changed = False
            for sid in list(used):
                b = by_id.get(sid, '')
                for dep in re.findall(r'<w:(?:basedOn|link|next) w:val="([^"]+)"', b):
                    if dep not in used:
                        used.add(dep); changed = True
        for sid, b in by_id.items():
            if sid not in used:
                s = s.replace(b, '')
        data = s.encode()
    zout.writestr(item.filename, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
zout.close()
