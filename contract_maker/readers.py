from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import threading
import hashlib
import re
import subprocess
from lxml import etree
from PIL import Image, ImageOps
from .config import DATA
from .office import to_pdf

PDF_RENDER_LOCK = threading.Lock()

XML_PARSER = etree.XMLParser(resolve_entities=False, no_network=True)
NS = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def checked_zip(path):
    z = ZipFile(path)
    if sum(i.file_size for i in z.infolist()) > 180*1024*1024:
        z.close()
        raise ValueError('This compressed document is too large to open safely.')
    return z

def pdf_pages(path):
    import pdfplumber
    pages=[]
    with pdfplumber.open(path) as document:
        if len(document.pages)>120:
            raise ValueError('Please split documents longer than 120 pages before importing.')
        for index,page in enumerate(document.pages):
            text=page.extract_text(layout=False) or ''
            pages.append({'number':index+1,'text':text,'image':True,'kind':'pdf','pdf':str(path),'scanned':len(text.strip())<40})
    return pages

def docx_paragraphs(path):
    with checked_zip(path) as z:
        root=etree.fromstring(z.read('word/document.xml'),parser=XML_PARSER)
    return [''.join(p.xpath('.//w:t/text()',namespaces=NS)) for p in root.xpath('/w:document/w:body//w:p',namespaces=NS)]

def read_file(path):
    path=Path(path)
    suffix=path.suffix.lower()
    if suffix=='.pdf':
        return pdf_pages(path)
    if suffix=='.docx':
        digest=hashlib.sha256(path.read_bytes()).hexdigest()[:20]
        target=DATA/'cache'/digest
        try:
            pdf=to_pdf(path,target)
            return pdf_pages(pdf)
        except (ValueError,subprocess.TimeoutExpired):
            text='\n'.join(docx_paragraphs(path))
            return [{'number':1,'text':text,'kind':'text','image':False,'location_note':'Word text; page numbers unavailable until PDF rendering succeeds.'}]
    if suffix in {'.ods','.xlsx','.csv'}:
        from .spreadsheets import read_workbook
        sheets=read_workbook(path)
        return [{'number':index+1,'title':sheet['name'],'text':'\n'.join('Row '+str(row['number'])+': '+' | '.join(column+'='+item['value'] for column,item in row['cells'].items()) for row in sheet['rows']),'kind':'text','image':False} for index,sheet in enumerate(sheets)]
    if suffix in {'.jpg','.jpeg','.png'}:
        with Image.open(path) as image:
            if image.width*image.height>70_000_000:
                raise ValueError('This image is too large. Please use a smaller scan.')
        return [{'number':1,'text':'','kind':'image','image':True,'path':str(path),'scanned':True}]
    if suffix=='.txt':
        return [{'number':1,'text':path.read_text(encoding='utf-8-sig'),'kind':'text','image':False}]
    raise ValueError('Unsupported file type.')

def page_image(source, page_index, max_side=1600):
    page=source['pages'][page_index]
    if page['kind']=='pdf':
        import pypdfium2 as pdfium
        with PDF_RENDER_LOCK:
            document=pdfium.PdfDocument(page['pdf'])
            pdf_page=document[page_index]
            width,height=pdf_page.get_size()
            bitmap=pdf_page.render(scale=min(2.0,max_side/max(width,height)))
            image=bitmap.to_pil().copy()
            bitmap.close();pdf_page.close();document.close()
    elif page['kind']=='image':
        with Image.open(page['path']) as raw:
            image=ImageOps.exif_transpose(raw).convert('RGB')
    else:
        return None
    image.thumbnail((max_side,max_side))
    output=BytesIO();image.convert('RGB').save(output,format='JPEG',quality=90)
    return output.getvalue()
