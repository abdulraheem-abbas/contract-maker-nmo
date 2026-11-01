"""Generate fictional records against the privately configured local templates."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
from tests.helpers import fields
from contract_maker.config import initialize
from contract_maker.templates import registry,generate
from contract_maker.office import to_pdf
from contract_maker.readers import pdf_pages,page_image

initialize();results=ROOT/'test-results/template-exports';results.mkdir(parents=True,exist_ok=True)
report={}
for kind,entry in registry().items():
    folder=results/kind;folder.mkdir(exist_ok=True)
    output=folder/'Fictional contract.docx'
    verification=generate(entry['path'],fields(kind),output)
    pdf=to_pdf(output,folder);pages=pdf_pages(pdf)
    picture=page_image({'pages':pages},len(pages)-1,1800)
    (folder/'last-page.jpg').write_bytes(picture)
    report[kind]={'pdf_pages':len(pages),'nearly_empty_pages':[p['number'] for p in pages if len(p['text'].strip())<12],**{k:verification[k] for k in ['template_text_preserved','other_package_parts_unchanged','filled_occurrences']}}
assert set(report)=={'employment','service','extension'},'Configure all three private local templates first.'
assert all(not entry['nearly_empty_pages'] for entry in report.values())
(results/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
