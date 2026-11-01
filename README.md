# NMO Contract Maker

A local website for creating Arabic and English employee contracts without AI. Enter the details yourself or import selected columns from a spreadsheet, confirm the fields, and export Word and PDF. The interface uses NMO turquoise and charcoal.

This is a separate application from the AI-assisted Contract-Maker project. It has its own source, application name, browser session, workspace and history. It contains no AI engine, language model, OCR or existing-contract review feature.

**This repository contains cleaned source only.** Private templates, personal rules, employee documents, databases, outputs, local runtime tools and built applications are excluded from Git. They remain on the computer. A fresh clone needs its own templates and local PDF converter.

## Open the prepared Mac app

Double-click **NMO Contract Maker.app** or **Start Contract Maker.command**. The interface opens at a `http://127.0.0.1:` address on this computer. Keep the app, `data` and `runtime` folders together. No AI download, internet connection or account is needed to create contracts.

## Create a contract

1. Select **Create a contract**, then employment, service or extension.
2. Enter the employee details in both languages. You can optionally add an offer, ID/passport or previous contract under **Documents** to inspect beside the form. These documents are references; their information is not automatically extracted.
3. Check each value against the records and mark it as checked. Dates and salary wording are calculated from the entered values. The period summary counts calendar days including both endpoints.
4. Run **Field checks**. Resolve missing information and inconsistent values. Expiry and date warnings need a separate acknowledgement.
5. Select **Create Word & PDF**. Inspect the PDF’s Arabic/English text, wrapping, page breaks and signature area. Each generation retains previous revisions and saves a local evidence record.

Employment contracts use a job title without its project name and a reporting-manager title without their personal name. Service contracts retain the relevant project and manager details. Issuing authority uses the city only. Leading zeros are kept, and filled fields are bold in both scripts. Saved individual role instructions, when configured locally, are checked before generation.

## Import an employee spreadsheet

Choose **Import from a spreadsheet**, or **Import spreadsheet row** inside a contract. XLSX, ODS and UTF-8 CSV files are supported. Select the worksheet, header row and exact employee row, then map each source column to a contract field. Exact field keys and exact displayed labels can suggest a mapping; the app does not infer unfamiliar headings or choose an employee for you.

Select **Import selected row**. Existing filled fields are kept unless you explicitly check **Replace fields that already have values**. A conflicting employee name is blocked unless replacement is selected. Imported values stay unconfirmed until you check them. Formula cells use their saved results without recalculation. Missing formula results, spreadsheet errors and ambiguous dates are left for manual entry. Numeric identity cells carry a reminder to verify leading zeros against the original document.

For predictable imports, use text cells for names and identity numbers, plain salary amounts, and dates in `YYYY-MM-DD` format. Both Arabic and English values must be supplied; the app does not translate them.

## Change templates

Under **Templates & rules**, download the current Word template, edit its wording or layout in Word, and keep its `{{field_tags}}`. Choose **Replace template** to open the new file as a local draft. Use the mapper to mark any additional changing text, including each repeated signature name/date. Only document-body fields are supported; changing values in headers and footers are not filled.

Preview the pages locally, check the wording and fields, then select **Use this template**. Earlier versions remain available under **Previous versions → Restore as draft**. Changing a template affects future generation; existing output files remain saved.

## Local privacy

- Runtime Python requests can connect only to loopback. The frontend has no remote assets, analytics or online dependencies.
- On macOS, PDF conversion additionally runs under an operating-system rule denying outbound connections. External Word relationships are removed from a disposable rendering copy.
- Templates, reference files, previews, fields, row mappings and history stay under `data`. No AI engine is contacted.
- Keep the app outside synced folders such as iCloud, Dropbox and OneDrive. The app cannot control other programs, browser extensions or operating-system backups.
- The database is not independently encrypted. Protect the computer account and keep private backups of `data` and `runtime`.

This app checks entered information and fills marked fields. It does not establish that source records are true, interpret contract wording, translate text or guarantee identical pagination for every field length. Inspect the final PDF before using a contract.

## Source setup and development

Use Python 3.12:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python run.py
```

Dependencies are installed as a software-setup step. Normal use requires no internet. For PDF export, install LibreOffice locally or provide the prepared `runtime/office` directory. No OCR or model software is needed. Load your private Word templates using **Templates & rules**; they are not included in GitHub.

Run `.venv/bin/python -m pytest -q tests` for automated checks. Run `.venv/bin/python tools/check_app.py` for the fictional browser/create/export workflow in a separate temporary workspace. This needs local Node.js, Playwright and Chromium; `CONTRACTS_BROWSER` selects the browser executable. The three optional private-template tests skip on a clean source clone.

Build the Mac app with `.venv/bin/python tools/build_mac.py`, then test the packaged app using `.venv/bin/python tools/check_app.py --app`. Rebuild after source edits. A Windows package and verified Windows outbound restrictions remain separate work; the Mac app is not a Windows executable.

Do not commit employee records or private templates. `.gitignore` covers local documents, scans, databases, rules, applications, caches and test screenshots. Review the staged diff before publishing changes.
