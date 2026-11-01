# NMO Contract Maker

A local website for creating Arabic and English employee contracts without AI. Enter the details yourself or import selected columns from a spreadsheet, confirm the fields, and export Word documents. The interface uses NMO turquoise and charcoal, with a complete Arabic/English language switch.

This is a separate application from the AI-assisted Contract-Maker project. It has its own source, application name, browser session, workspace and history. It contains no AI engine, language model, OCR or existing-contract review feature.

**This repository contains cleaned source only.** Private templates, personal rules, employee documents, databases, outputs, local runtime tools and built applications are excluded from Git. They remain on the computer. A fresh clone needs its own templates. LibreOffice is optional for reference-document and template page previews.

## Open the prepared Mac app

Double-click **NMO Contract Maker.app** or **Start Contract Maker.command**. The interface opens at **http://127.0.0.1:8770/** on this computer. Normal launches reuse this address and an existing instance; a stale address file does not force another port. Keep the app, `data` and `runtime` folders together. No AI download, internet connection or account is needed to create contracts.

If you open `web/index.html` directly, use the shown app link after starting **NMO Contract Maker.app**. The source HTML file alone cannot run the local application.

## Interface language

Use **English / عربي** in the top bar. First use opens in Arabic; the choice is remembered in this browser on this local address. Arabic uses a complete right-to-left layout, translated controls and validation messages, and bundled Noto Sans Arabic fonts. English uses left-to-right layout. Font files and their OFL license are included under `web/fonts`; no online font or translation service is used.

Switching languages preserves unsaved form values, confirmations, spreadsheet selection and template mapping entries. English text fields, document numbers and dates stay left to right; Arabic text fields stay right to left. Language switching affects the interface only: employee values, evidence, private templates and existing bilingual Word files are not translated or modified.

## Create a contract

1. Select **Create a contract**, then employment, service or extension.
2. Enter the employee details in both languages. You can optionally add an offer, ID/passport or previous contract under **Documents** to inspect beside the form. These documents are references; their information is not automatically extracted.
3. Check each value against the records and mark it as checked. Dates and salary wording are calculated from the entered values. The period summary counts calendar days including both endpoints.
4. Run **Field checks**. Missing or invalid fields are marked in red with a message beside the input; entered values are also checked during saving. Expiry and date warnings need a separate acknowledgement.
5. Select **Create Word**. Inspect the Word document’s Arabic/English text, wrapping, page breaks and signature area. Previous Word revisions remain saved. Internal records are retained locally; no JSON or PDF file is shown or included in downloads.

Employment contracts use a job title without its project name and a reporting-manager title without their personal name. Service contracts retain the relevant project and manager details. Issuing authority uses the city only. Leading zeros are kept, and filled fields are bold in both scripts. Saved individual role instructions, when configured locally, are checked before generation.

## Identity document types

The document selector includes ID cards, national-number IDs, passports, refugee cards, asylum-seeker cards and residence cards. Choose **Add my own document type** in the selector to save a bilingual label and its Arabic/English grammar choices. Custom types stay in the local `data/identity-types.json` file and are available for future contracts. Selecting a document type does not infer an employee’s nationality.

## Completed contracts

**Completed contracts** keeps every Word export. Search by employee or file name, filter by contract type, download the latest Word, or choose **Edit saved details** to change the form and export a new revision. Older Word revisions remain under the contract’s **Your files** tab. Changes to an exported contract’s form are marked as a saved draft until a new Word revision is created.

Use **Add existing Word file** to store an earlier contract unchanged. **Save edited Word** keeps a file edited outside the app as another revision, without rewriting its contents. Such uploads do not automatically populate or synchronize the form. Files added without saved form data offer file viewing and revision uploads.

Templates/rules, spreadsheet import and **About & storage** are available through small **More (⋯)** menus. This simplifies the interface; it does not add password-based access controls.

## Import an employee spreadsheet

Use the small **More (⋯)** menu to choose **Import spreadsheet**, or use the small contract-tools menu inside a contract. Spreadsheet import is no longer a main navigation item or large action card. XLSX, ODS and UTF-8 CSV files are supported. Select the worksheet, header row and exact employee row, then map each source column to a contract field. Exact field keys and exact displayed labels can suggest a mapping; the app does not infer unfamiliar headings or choose an employee for you.

Select **Import selected row**. Existing filled fields are kept unless you explicitly check **Replace fields that already have values**. A conflicting employee name is blocked unless replacement is selected. Imported values stay unconfirmed until you check them. Formula cells use their saved results without recalculation. Missing formula results, spreadsheet errors and ambiguous dates are left for manual entry. Numeric identity cells carry a reminder to verify leading zeros against the original document.

For predictable imports, use text cells for names and identity numbers, plain salary amounts, and dates in `YYYY-MM-DD` format. Both Arabic and English values must be supplied; the app does not translate them.

## Change templates

From **More (⋯) → Templates & rules**, download the current Word template, edit its wording or layout in Word, and keep its `{{field_tags}}`. Choose **Replace template** to open the new file as a local draft. Use the mapper to mark any additional changing text, including each repeated signature name/date. Only document-body fields are supported; changing values in headers and footers are not filled.

Preview the pages locally, check the wording and fields, then select **Use this template**. Earlier versions remain available under **Previous versions → Restore as draft**. Changing a template affects future generation; existing output files remain saved.

## Local privacy

- Runtime Python requests can connect only to loopback. The frontend has no remote assets, analytics or online dependencies.
- On macOS, PDF conversion additionally runs under an operating-system rule denying outbound connections. External Word relationships are removed from a disposable rendering copy.
- Templates, reference files, previews, fields, row mappings and history stay under `data`. No AI engine is contacted.
- Keep the app outside synced folders such as iCloud, Dropbox and OneDrive. The app cannot control other programs, browser extensions or operating-system backups.
- The database is not independently encrypted. Protect the computer account and keep private backups of `data` and `runtime`.

This app checks entered information and fills marked fields. It does not establish that source records are true, interpret contract wording, translate text or guarantee identical pagination for every field length. Inspect the final Word document before using a contract.

## Source setup and development

Use Python 3.12:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python run.py
```

Dependencies are installed as a software-setup step. Normal use requires no internet. Word generation does not require LibreOffice. Optional page previews for templates and Word references use locally installed LibreOffice or the prepared `runtime/office` directory. No OCR or model software is needed. Load your private Word templates using **Templates & rules**; they are not included in GitHub.

Run `.venv/bin/python -m pytest -q tests` for automated checks and `node tools/check_language.cjs` for UI translation invariants. Run `.venv/bin/python tools/check_app.py` for the fictional browser/create/export workflow in a separate temporary workspace. This also exercises optional template previews and needs LibreOffice, local Node.js, Playwright and Chromium; `CONTRACTS_BROWSER` selects the browser executable. The three optional private-template tests skip on a clean source clone.

Build the Mac app with `.venv/bin/python tools/build_mac.py`, then test the packaged app using `.venv/bin/python tools/check_app.py --app`. Rebuild after source edits. A Windows package and verified Windows outbound restrictions remain separate work; the Mac app is not a Windows executable.

Do not commit employee records or private templates. `.gitignore` covers local documents, scans, databases, rules, applications, caches and test screenshots. Review the staged diff before publishing changes.
