/* UI translations only. Employee values, evidence and Word templates are never translated. */
'use strict';
window.NMOI18n=(()=>{
 const storageKey='nmo-contract-maker-language';
 let language='ar';try{if(localStorage.getItem(storageKey)==='en')language='en';}catch{}
 const entries=`
NMO Contract Maker|صانع العقود · NMO
Contract Maker|صانع العقود
NMO WORKSPACE|مساحة عمل NMO
My workspace|مساحة العمل
My workspace / Contract details|مساحة العمل / بيانات العقد
Completed contracts|العقود المكتملة
On your computer|على جهازك
Documents, rules and history|المستندات والقواعد والسجل
stay in your local workspace.|محفوظة على جهازك.
Quit app|إغلاق التطبيق
CONTRACT MAKER · 1.3|صانع العقود · 1.3
Local processing|معالجة محلية
Word contracts|عقود Word
Templates & rules|القوالب والقواعد
Import spreadsheet|استيراد جدول بيانات
About & storage|حول التطبيق والتخزين
Working locally|جارٍ العمل على جهازك
Stop after this step|إيقاف بعد هذه الخطوة
YOUR PRIVATE WORKSPACE|مساحة عملك الخاصة
Create employee|أنشئ عقود
contracts.|الموظفين.
Your approved templates. The details you check.|قوالبك المعتمدة، وبيانات تراجعها بنفسك.
Ready in Word, saved on this computer.|عقود Word جاهزة ومحفوظة على جهازك.
Create a contract|إنشاء عقد
Enter employee details in both languages,|أدخل بيانات الموظف باللغتين،
then create your Word contract.|ثم أنشئ العقد بصيغة Word.
Start a new contract|ابدأ عقدًا جديدًا
Find your Word contracts, edit saved details,|ابحث عن عقودك وعدّل بياناتها،
and keep earlier revisions.|مع الاحتفاظ بالنسخ السابقة.
Open completed contracts|عرض العقود المكتملة
Drafts in progress|مسودات قيد العمل
Saved on this computer|محفوظ على هذا الجهاز
Your workspace is ready|مساحة عملك جاهزة
Start a contract above. Your saved work will appear here.|ابدأ عقدًا جديدًا، وستظهر أعمالك المحفوظة هنا.
Enter or import details|أدخل البيانات أو استوردها
Check and confirm fields|راجع الحقول وأكّدها
Create and export files|أنشئ ملف Word
← Back to workspace|→ العودة لمساحة العمل
EMPLOYMENT CONTRACT|عقد عمل
New contract|عقد جديد
Changes are saved locally.|تُحفظ التغييرات على جهازك.
Save work|حفظ العمل
Create Word|إنشاء Word
Documents|المستندات
Employee details|بيانات الموظف
Field checks|مراجعة الحقول
Your files|ملفاتك
Reference documents · optional|المستندات المرجعية · اختياري
View an offer or ID beside your form. Spreadsheets can fill the columns you choose.|اعرض العرض الوظيفي أو وثيقة الهوية بجانب النموذج، واستورد من الجدول الأعمدة التي تختارها.
Enter employee details →|إدخال بيانات الموظف ←
Enter information from your documents in|أدخل معلومات مستنداتك في
. Uploaded offers and scans are for you to read; the app does not interpret them.|. يمكنك قراءة العروض والصور المرفوعة بنفسك؛ لا يستخرج التطبيق بياناتها تلقائيًا.
Enter and check the employee details|أدخل بيانات الموظف وراجعها
Use both languages. Mark each field as checked after comparing it with your records.|أدخل البيانات باللغتين، وأكّد كل حقل بعد مطابقته بمستنداتك.
Confirm filled fields|تأكيد الحقول المعبأة
Import spreadsheet row|استيراد صف من الجدول
Reference document|المستند المرجعي
Open original ↗|فتح الأصل ↖
Page 1|الصفحة 1
Select a field’s source to inspect|اختر مصدر الحقل لعرض
the original page here.|الصفحة الأصلية هنا.
Check details before creating|راجع البيانات قبل إنشاء العقد
Find missing values, inconsistent dates and anything that conflicts with your saved rules.|تحقق من البيانات الناقصة والتواريخ المتعارضة وما يخالف قواعدك المحفوظة.
Run field checks|مراجعة الحقول
Your Word files stay here. Each export keeps the previous revision.|ملفات Word محفوظة هنا، وتبقى النسخ السابقة عند كل تصدير.
Completed contracts ↗|العقود المكتملة ↖
Open the Word file and check Arabic and English text, page breaks and signature space before using it.|افتح ملف Word وراجع النص باللغتين وفواصل الصفحات ومساحة التوقيع قبل استخدامه.
YOUR SAVED WORD CONTRACTS|عقود WORD المحفوظة
Download a Word file, reopen its saved details,|نزّل ملف Word، أو عدّل بياناته المحفوظة،
or keep a copy you edited in Word.|أو احفظ نسخة عدّلتها في Word.
Add existing Word file ＋|إضافة ملف Word موجود ＋
Find a contract|البحث عن عقد
Contract type|نوع العقد
All contract types|كل أنواع العقود
Employment|عقد عمل
Service|عقد خدمة
Extension|خطاب تمديد
Saved details can be edited and exported as a new Word revision. Changes made directly in Word can be kept using “Save edited Word”; they do not automatically update the form.|يمكن تعديل البيانات المحفوظة وتصدير نسخة Word جديدة. لحفظ تعديلاتك داخل Word، اختر «حفظ Word المعدّل»؛ هذه التعديلات لا تحدّث بيانات النموذج تلقائيًا.
YOUR DOCUMENT STANDARDS|قوالبك وقواعدك المعتمدة
Update your Word templates whenever you need to.|حدّث قوالب Word وقتما تحتاج.
Preview changes and keep previous versions on this computer.|عاين التغييرات واحتفظ بالنسخ السابقة على جهازك.
Edit in Word|تعديل في Word
Download a template and change its wording or layout. Keep the field tags.|نزّل القالب وعدّل النص أو التنسيق، مع إبقاء علامات الحقول.
Choose the updated file|اختيار الملف المعدّل
Add a .docx, check its fields and preview the pages locally.|أضف ملف .docx وراجع حقوله وعاين صفحاته على جهازك.
Use the new version|اعتماد النسخة الجديدة
Activate it for future contracts. Previous outputs stay saved.|اعتمدها للعقود القادمة؛ تبقى الملفات السابقة محفوظة.
Your saved contract rules|قواعد العقود المحفوظة
Applied in both languages|تُطبّق باللغتين
Employment contracts|عقود العمل
Job title without the project name. Reporting manager’s title without their personal name.|المسمى الوظيفي دون اسم المشروع، ومسمى المدير المباشر دون اسمه الشخصي.
Service contracts|عقود الخدمة
Keep the project and manager details. Retain the original clauses and signature areas.|تُحفظ بيانات المشروع والمدير، مع الإبقاء على البنود الأصلية ومساحات التوقيع.
Identity and formatting|الهوية والتنسيق
Issuing city only. Keep leading zeros. Bold filled fields. Keep Arabic right to left and English left to right.|مدينة الإصدار فقط، مع حفظ الأصفار في بداية الأرقام وإبراز الحقول المعبأة بالخط العريض. العربية من اليمين والإنجليزية من اليسار.
Specific job-title instructions|تعليمات خاصة بالمسميات الوظيفية
THIS COMPUTER|هذا الجهاز
Manual entry and spreadsheet imports.|إدخال يدوي واستيراد من الجداول.
Everything works on this computer.|كل العمل يتم على هذا الجهاز.
What stays local|ما يُحفظ على جهازك
Templates, reference documents, employee details, contract history and outputs stay in this app’s own data folder. No AI engine, model download, account or online processing is required.|تُحفظ القوالب والمستندات وبيانات الموظفين وسجل العقود والملفات في مجلد بيانات التطبيق على جهازك. لا تحتاج إلى ذكاء اصطناعي أو حساب أو معالجة عبر الإنترنت.
Keep the app’s folder outside iCloud, OneDrive, Dropbox and other synced folders. Local storage is protected by your computer account; the database is not independently encrypted. Keep a private backup of the data and runtime folders.|احتفظ بمجلد التطبيق خارج مجلدات المزامنة مثل iCloud وOneDrive وDropbox. يحمي حساب جهازك الملفات المحلية، وقاعدة البيانات ليست مشفّرة بشكل مستقل. احتفظ بنسخة احتياطية خاصة من مجلدي data وruntime.
NMO CONTRACT MAKER|صانع العقود · NMO
Arabic & English · Local workspace|العربية والإنجليزية · محفوظ على جهازك
NEW CONTRACT|عقد جديد
START FROM A SPREADSHEET|إنشاء عقد من جدول بيانات
Start with your contract type.|اختر نوع العقد
Enter details yourself, or import selected columns from an employee spreadsheet.|أدخل البيانات بنفسك أو استورد أعمدة تختارها من جدول الموظفين.
Employment contract · عقد عمل|عقد عمل
Service contract · عقد خدمة|عقد خدمة
Extension letter · خطاب تمديد|خطاب تمديد
Employment · عقد عمل|عقد عمل
Service · عقد خدمة|عقد خدمة
Extension · خطاب تمديد|خطاب تمديد
Continue →|متابعة ←
CHECK BEFORE CREATING|مراجعة قبل الإنشاء
These details need your decision.|هذه البيانات تحتاج إلى تأكيدك
I checked these points and want to use the confirmed details as entered.|راجعت هذه النقاط وأوافق على استخدام البيانات كما أُدخلت.
Go back|رجوع
Create contract|إنشاء العقد
IMPORT FROM YOUR SPREADSHEET|استيراد من جدول البيانات
Choose the employee. Match the columns.|اختر الموظف وحدّد الأعمدة
Only the fields you map will be copied. Imported values still need checking.|تُنسخ الحقول التي تحددها فقط، وتحتاج البيانات المستوردة إلى مراجعتك.
YOUR IDENTITY DOCUMENT TYPES|أنواع وثائق الهوية
Add a document type|إضافة نوع وثيقة
Use the document’s name in both languages. This choice will be available for future contracts.|أدخل اسم الوثيقة باللغتين ليكون متاحًا في العقود القادمة.
Document name · Arabic|اسم الوثيقة بالعربية
Document name · English|اسم الوثيقة بالإنجليزية
Arabic wording|الصياغة العربية
English article|أداة التنكير بالإنجليزية
No article|بدون أداة
Save document type|حفظ نوع الوثيقة
COMPLETED CONTRACTS|العقود المكتملة
Add an existing Word contract|إضافة عقد Word موجود
The file will be kept exactly as uploaded. Previous Word revisions remain saved.|يُحفظ الملف كما رفعته تمامًا، وتبقى نسخ Word السابقة محفوظة.
Contract name|اسم العقد
Choose Word file ＋|اختيار ملف Word ＋
No file selected|لم يُحدد ملف
Save Word revision|حفظ نسخة Word
More tools|المزيد من الأدوات
More contract tools|المزيد من أدوات العقد
Main navigation|القائمة الرئيسية
Source document|المستند المرجعي
Previous page|الصفحة السابقة
Next page|الصفحة التالية
Previous template page|صفحة القالب السابقة
Next template page|صفحة القالب التالية
Local template page preview|معاينة صفحة القالب على جهازك
Choose a replacement Word template|اختيار قالب Word بديل
Search by employee or file name|ابحث باسم الموظف أو الملف
Search the row text|ابحث في بيانات الصف
Close|إغلاق
Cancel|إلغاء
No unfinished drafts|لا توجد مسودات قيد العمل
Start a new contract, or open Completed contracts to edit saved work.|ابدأ عقدًا جديدًا أو افتح العقود المكتملة لتعديل عمل محفوظ.
Saved locally|محفوظ على الجهاز
Continue work|متابعة العمل
Job offer|العرض الوظيفي
Open the offer and enter its dates, role and salary.|راجع العرض وأدخل التواريخ والمسمى والأجر.
ID or passport|الهوية أو جواز السفر
Inspect the full name, number and issuing details.|راجع الاسم الكامل ورقم الوثيقة وبيانات إصدارها.
Employee spreadsheet|جدول الموظفين
Choose a row and map the columns you want to import.|اختر صف الموظف والأعمدة التي تريد استيرادها.
Add another file|إضافة ملف آخر
Choose file|اختيار ملف
page|صفحة
pages|صفحات
· local copy|· نسخة محلية
Import employee row ↗|استيراد صف الموظف ↖
Contract & identity|العقد والهوية
Dates & pay|التواريخ والأجر
Role & workplace|الوظيفة ومكان العمل
Reporting & project|الإشراف والمشروع
Not supplied|غير محدد
Male · ذكر|ذكر
Female · أنثى|أنثى
Choose document type|اختر نوع الوثيقة
＋ Add my own document type…|＋ إضافة نوع وثيقة…
Checked|تمت المراجعة
· inspect image|· راجع الصورة
Enter or read from a source|أدخل القيمة من مستنداتك
entered by you|أدخلتها بنفسك
chosen by you|اخترتها بنفسك
empty|بانتظار الإدخال
Reference files are optional.|المستندات المرجعية اختيارية.
Add one in Documents to inspect it here.|أضف مستندًا من تبويب المستندات لعرضه هنا.
No reference file|لا يوجد مستند مرجعي
Quoted evidence:|النص المرجعي:
Needs correction|يحتاج إلى تصحيح
Needs your review|يحتاج إلى مراجعتك
Matching checks|فحوصات مطابقة
Document|المستند
Check field|راجع الحقل
Expected:|القيمة المطلوبة:
No field issues found|لم تُكتشف أخطاء في الحقول
No checks run yet|لم تُراجع الحقول بعد
Check and confirm the details, then create the Word file and check its pages.|راجع البيانات وأكّدها، ثم أنشئ ملف Word وراجع صفحاته.
Complete the employee details, then run the field checks.|أكمل بيانات الموظف ثم شغّل مراجعة الحقول.
Latest Word revision|أحدث نسخة Word
Previous Word revision · kept locally|نسخة Word سابقة · محفوظة على الجهاز
Download Word ↓|تنزيل Word ↓
Your Word contract will appear here|سيظهر عقد Word هنا
Check the details, then choose Create Word.|راجع البيانات ثم اختر «إنشاء Word».
Employment contract|عقد عمل
Service contract|عقد خدمة
Extension letter|خطاب تمديد
Choose your Word template|اختر قالب Word
Download to edit ↓|تنزيل للتعديل ↓
Replace template|استبدال القالب
Choose template|اختيار قالب
Fields, preview & previous versions ↗|الحقول والمعاينة والنسخ السابقة ↖
No individual overrides saved.|لا توجد تعليمات خاصة محفوظة.
Contract date · Arabic|تاريخ العقد بالعربية
Contract date · English|تاريخ العقد بالإنجليزية
Start date · Arabic|تاريخ البدء بالعربية
Start date · English|تاريخ البدء بالإنجليزية
End date · Arabic|تاريخ الانتهاء بالعربية
End date · English|تاريخ الانتهاء بالإنجليزية
ID / passport details · Arabic|بيانات الهوية أو الجواز بالعربية
ID / passport details · English|بيانات الهوية أو الجواز بالإنجليزية
Salary in words · Arabic|الأجر كتابةً بالعربية
Salary in words · English|الأجر كتابةً بالإنجليزية
Contract weekday · Arabic|يوم إبرام العقد بالعربية
Contract weekday · English|يوم إبرام العقد بالإنجليزية
Original contract date · Arabic|تاريخ العقد الأصلي بالعربية
Original contract date · English|تاريخ العقد الأصلي بالإنجليزية
NEW VERSION · DRAFT|نسخة جديدة · مسودة
CURRENT TEMPLATE|القالب المعتمد
Your active template stays in use until you activate this draft.|يظل القالب الحالي معتمدًا حتى تعتمد هذه المسودة.
Download this Word file to change wording or layout. Keep tags such as {{name_ar}} and {{name_en}}, or use the mapper below to mark changing text.|نزّل ملف Word لتعديل النص أو التنسيق. أبقِ علامات مثل {{name_ar}} و{{name_en}}، أو حدّد النصوص المتغيرة من أداة ربط الحقول أدناه.
Download|تنزيل
Draft download ↓|تنزيل المسودة ↓
Download to edit ↓|تنزيل للتعديل ↓
Preview pages|معاينة الصفحات
Choose another Word file ＋|اختيار ملف Word آخر ＋
field types found|نوع حقل موجود
I checked the wording, Arabic and English layout, and all changing fields, including repeated names, dates and signature details.|راجعت النص والتنسيق باللغتين وكل الحقول المتغيرة، بما فيها الأسماء المكررة والتواريخ وبيانات التوقيع.
Use this template →|اعتماد هذا القالب ←
Previous versions are kept locally. Existing contract files remain saved.|تُحفظ النسخ السابقة على جهازك، وتبقى ملفات العقود الحالية محفوظة.
Map the text that should change for each employee|ربط النصوص التي تتغير لكل موظف
Select text in a paragraph below, then choose the field it represents. Map each repeated occurrence separately. Fixed wording and formatting are retained.|حدّد نصًا من الفقرات أدناه ثم اختر الحقل الذي يمثّله. اربط كل تكرار على حدة؛ يُحفظ النص الثابت والتنسيق.
Paragraph|الفقرة
Exact text to replace|النص المراد استبداله كما هو
Fill with field|الحقل البديل
Save to draft|حفظ في المسودة
Previous versions (|النسخ السابقة (
Restore opens a draft for you to check before using it.|يفتح الاسترجاع نسخة مسودة لمراجعتها قبل اعتمادها.
Previous template|قالب سابق
Restore as draft ↗|استرجاع كمسودة ↖
Your first previous version will appear after replacing this template.|ستظهر أول نسخة سابقة بعد استبدال هذا القالب.
Ready|جاهز
Local storage|تخزين محلي
Your saved work|أعمالك المحفوظة
Works offline|يعمل دون إنترنت
On this computer|على هذا الجهاز
Generation fills your approved Word templates. Each export is saved as a separate revision in Completed contracts.|يُعبّئ التطبيق قوالب Word المعتمدة، ويُحفظ كل تصدير كنسخة مستقلة في العقود المكتملة.
Keep a private backup of this app’s data folder. Word files, editable details, source records and template history are stored there.|احتفظ بنسخة احتياطية خاصة من مجلد بيانات التطبيق؛ فهو يحتوي على ملفات Word والبيانات القابلة للتعديل والمستندات وسجل القوالب.
No AI model or online account is needed. Spreadsheet imports and template controls are available in the small More menu.|لا تحتاج إلى نموذج ذكاء اصطناعي أو حساب عبر الإنترنت. ستجد استيراد الجداول وإدارة القوالب في قائمة المزيد الصغيرة.
Contract weekday|يوم إبرام العقد
Contract period|مدة العقد
calendar days|يومًا تقويميًا
Includes the start and end dates.|تشمل يومي البداية والنهاية.
Salary in words|الأجر كتابةً
Calculated for you|حسابات تلقائية
Enter dates and salary to see the weekday, contract period and salary wording.|أدخل التواريخ والأجر لعرض يوم الإبرام ومدة العقد والأجر كتابةً.
Check the fields marked in red.|راجع الحقول المحددة بالأحمر.
Go to first error ↓|الانتقال لأول خطأ ↓
View saved files|عرض الملفات المحفوظة
Edit saved details|تعديل البيانات المحفوظة
Save edited Word ↥|حفظ Word المعدّل ↥
No completed contracts here yet|لا توجد عقود مكتملة بعد
Create a Word contract, or add an existing Word file above.|أنشئ عقد Word أو أضف ملف Word موجودًا من الزر أعلاه.
Save a Word revision|حفظ نسخة Word
Worksheet|ورقة العمل
Header row|صف العناوين
Find an employee in this sheet|البحث عن موظف في هذا الجدول
Employee row|صف الموظف
Column|العمود
Heading|العنوان
Selected row value|قيمة الصف المختار
Use as contract field|استخدامه كحقل في العقد
Replace fields that already have values. Leave unchecked to keep them.|استبدال الحقول المعبأة. اتركه دون تحديد للاحتفاظ بقيمها.
Dates must be clear. Ambiguous dates and spreadsheet errors are left for manual entry. Formulas use their saved results and are not recalculated.|يجب أن تكون التواريخ واضحة. تُترك التواريخ الملتبسة وأخطاء الجدول للإدخال اليدوي. تُستخدم نتائج المعادلات المحفوظة دون إعادة حسابها.
Import selected row →|استيراد الصف المختار ←
Do not import|عدم الاستيراد
Saved formula result|نتيجة المعادلة المحفوظة
NMO Contract Maker is closed.|تم إغلاق صانع العقود.
Your work is saved on this Mac. You can close this tab and reopen the app whenever you need it.|عملك محفوظ على هذا الجهاز. يمكنك إغلاق النافذة وإعادة فتح التطبيق وقتما تحتاج.
Open Contract Maker|فتح صانع العقود
Open|افتح
first, then use the local website below.|أولًا، ثم افتح الموقع المحلي أدناه.
Open Contract Maker →|فتح صانع العقود ←
The local app is starting|جارٍ تشغيل التطبيق المحلي
Reload this window in a moment. Your files remain on this computer.|أعد تحميل النافذة بعد قليل. ملفاتك محفوظة على هذا الجهاز.
This action could not finish.|تعذّر إتمام هذه الخطوة.
The action could not finish.|تعذّر إتمام هذه الخطوة.
The local app restarted. Your saved work is safe.|أُعيد تشغيل التطبيق المحلي. عملك المحفوظ آمن.
Wait for the current step to finish.|انتظر حتى تنتهي الخطوة الحالية.
Wait for the current task to finish first.|انتظر حتى تنتهي العملية الحالية.
Word file saved as uploaded.|حُفظ ملف Word كما رُفع.
Latest Word file was uploaded. These form details have not been updated from that file.|أحدث ملف Word مرفوع يدويًا، ولم تُحدّث بيانات النموذج من محتواه.
Your work is saved locally.|حُفظ عملك على هذا الجهاز.
Saving locally…|جارٍ الحفظ على جهازك…
Choose a file up to 25 MB.|اختر ملفًا لا يتجاوز حجمه 25 ميغابايت.
Document added to this local workspace.|أُضيف المستند إلى مساحة العمل على جهازك.
Complete the missing or invalid fields first.|أكمل الحقول الناقصة أو غير الصحيحة أولًا.
Your Word contract is ready. It is also saved in Completed contracts.|عقد Word جاهز ومحفوظ أيضًا في العقود المكتملة.
The new template is active. Its previous version is saved locally.|اعتُمد القالب الجديد وحُفظت نسخته السابقة على جهازك.
Field mapping saved to a draft. Check it before activating.|حُفظ ربط الحقول في مسودة. راجعها قبل اعتمادها.
Previous version opened as a draft. Check it, then activate it.|فُتحت النسخة السابقة كمسودة. راجعها ثم اعتمدها.
Wait for the current template operation to finish.|انتظر حتى تنتهي العملية الحالية على القالب.
Choose a .docx Word template.|اختر قالب Word بصيغة .docx.
Choose a Word template up to 25 MB.|اختر قالب Word لا يتجاوز حجمه 25 ميغابايت.
Template added as a local draft. Check the fields and pages before using it.|أُضيف القالب كمسودة محلية. راجع الحقول والصفحات قبل اعتماده.
· Draft changes saved; export to update Word|· حُفظت تعديلات المسودة؛ صدّر لتحديث Word
Choose the employee row below the headings.|اختر صف الموظف الموجود أسفل العناوين.
Choose a Word .docx file up to 25 MB.|اختر ملف Word بصيغة .docx لا يتجاوز حجمه 25 ميغابايت.
Word revision saved in Completed contracts.|حُفظت نسخة Word في العقود المكتملة.
Document type saved. It is available for future contracts.|حُفظ نوع الوثيقة وأصبح متاحًا للعقود القادمة.
Filled fields marked as checked. You can uncheck any field that needs another look.|أُكّدت الحقول المعبأة. يمكنك إلغاء التأكيد عن أي حقل يحتاج إلى مراجعة أخرى.
Stopping after the current step; completed files stay saved.|سيتوقف بعد الخطوة الحالية؛ تبقى الملفات المكتملة محفوظة.

Page {page} of {pages}|الصفحة {page} من {pages}
Source document page {page}|صفحة المستند {page}
{count} saved workspaces|مساحات العمل المحفوظة: {count}
{count} contracts|عدد العقود: {count}
{count} saved Word revisions|نسخ Word المحفوظة: {count}
{count} fields · Active locally|عدد الحقول: {count} · معتمد على الجهاز
{count} fields need correction.|حقول تحتاج إلى تصحيح: {count}.
Check and confirm the {count} remaining filled fields first.|راجع الحقول المعبأة المتبقية وأكّدها أولًا. عددها: {count}.
{count} fields imported. {kept}Check the imported details against the row.|تم استيراد {count} حقلًا. {kept}طابق البيانات المستوردة مع الصف.
{count} existing fields kept.|تم الاحتفاظ بـ {count} حقلًا معبأً.
Row {row} · {text}|الصف {row} · {text}
Paragraph {number}|الفقرة {number}
Contract field for column {column}|حقل العقد للعمود {column}
A local source copy changed after import. Re-import that document and confirm its fields again.|تغيّرت نسخة المستند بعد استيرادها. أعد استيراده وأكّد حقوله مجددًا.
A request from outside this local app was refused.|رُفض طلب من خارج هذا التطبيق المحلي.
Acknowledge the flagged dates or expiry before creating this contract.|أكّد موافقتك على ملاحظات التواريخ أو انتهاء الوثيقة قبل إنشاء العقد.
Choose a PDF, Word document, image, ODS, XLSX, CSV or text file.|اختر ملف PDF أو Word أو صورة أو جدول ODS أو XLSX أو CSV أو ملفًا نصيًا.
Choose a Word .docx contract.|اختر عقد Word بصيغة .docx.
Choose a Word file up to 25 MB.|اختر ملف Word لا يتجاوز حجمه 25 ميغابايت.
Choose a contract type.|اختر نوع العقد.
Choose a spreadsheet from this workspace.|اختر جدول بيانات من مساحة العمل هذه.
Choose a supported contract type.|اختر نوع عقد متاحًا.
Choose an existing worksheet.|اختر ورقة عمل موجودة.
Choose files up to 25 MB each.|اختر ملفات لا يتجاوز حجم الواحد منها 25 ميغابايت.
Choose the document role.|حدّد نوع المستند المرجعي.
Complete and confirm the required fields first.|أكمل الحقول المطلوبة وأكّدها أولًا.
Create the template preview first.|أنشئ معاينة القالب أولًا.
Creating contract|جارٍ إنشاء العقد
Creating template preview|جارٍ إنشاء معاينة القالب
Filling the approved Word template|جارٍ تعبئة قالب Word المعتمد
Importing document|جارٍ استيراد المستند
Invalid request.|الطلب غير صالح.
Only the local app address is accepted.|يُسمح بعنوان التطبيق المحلي فقط.
Open NMO Contract Maker in its own window first.|افتح صانع العقود في نافذته أولًا.
Prepare this template in Templates before generating a contract.|جهّز هذا القالب في صفحة القوالب قبل إنشاء العقد.
Source not found in this workspace.|لم يُعثر على المستند في مساحة العمل هذه.
Template page not found.|لم يُعثر على صفحة القالب.
The spreadsheet copy changed. Import it again before using a row.|تغيّرت نسخة الجدول. أعد استيرادها قبل استخدام أي صف.
The template has changed outside the app. Re-import it before generation.|تغيّر القالب خارج التطبيق. أعد استيراده قبل إنشاء العقد.
This action could not finish. Your originals were preserved.|تعذّر إتمام الخطوة. حُفظت ملفاتك الأصلية.
This app creates contracts only.|هذا التطبيق مخصص لإنشاء العقود.
This file could not be read as a Word contract.|تعذّرت قراءة الملف كعقد Word.
This operation could not finish. Your originals were preserved.|تعذّر إتمام العملية. حُفظت ملفاتك الأصلية.
This row names a different employee. Choose the matching row, or check Replace filled fields after verifying it.|هذا الصف يخص موظفًا آخر. اختر الصف الصحيح، أو فعّل استبدال الحقول المعبأة بعد التحقق منها.
This workspace already has an operation running. Wait for it to finish.|توجد عملية جارية في مساحة العمل هذه. انتظر حتى تنتهي.
Wait for the current operation to finish before quitting.|انتظر انتهاء العملية الحالية قبل إغلاق التطبيق.
Wait for this workspace operation to finish before changing its details.|انتظر انتهاء العملية الجارية قبل تعديل بيانات مساحة العمل.
Word output not found.|لم يُعثر على ملف Word.
Reading your selected file locally|جارٍ قراءة الملف المختار على جهازك
Complete|اكتملت العملية
Cancelled|أُلغيت العملية
Choose the contract type.|اختر نوع العقد.
Use an unambiguous date in YYYY-MM-DD format.|أدخل تاريخًا واضحًا بصيغة YYYY-MM-DD.
The contract end precedes the start date.|تاريخ انتهاء العقد يسبق تاريخ بدايته.
Signature date is later than work start. Confirm that this is intended.|تاريخ التوقيع بعد بدء العمل. تأكّد من أن ذلك مقصود.
Identity expiry precedes its issue date.|تاريخ انتهاء الوثيقة يسبق تاريخ إصدارها.
The identity document was issued after the contract date. Check that this is the intended document.|أُصدرت وثيقة الهوية بعد تاريخ العقد. تأكّد من أنها الوثيقة المقصودة.
This identity document expired before the contract date. Explicitly confirm using these supplied details.|انتهت صلاحية الوثيقة قبل تاريخ العقد. أكّد صراحةً اعتماد بياناتها المرفقة.
This identity document expires during the contract period.|تنتهي صلاحية الوثيقة خلال مدة العقد.
Enter the gross salary as a number, such as 825.69.|أدخل الأجر الشامل كرقم، مثل 825.69.
Salary must be positive, with at most two decimal places.|يجب أن يكون الأجر أكبر من صفر وبمنزلتين عشريتين كحد أقصى.
Identity numbers must contain only letters, digits, spaces, slashes or hyphens. Leading zeros are retained.|يُسمح في رقم الوثيقة بالحروف والأرقام والمسافات والشرطة والشرطة المائلة فقط. تُحفظ الأصفار في بداية الرقم.
Employment contracts use the job title only. Remove the project phrase from this field.|اكتب المسمى الوظيفي فقط في عقد العمل، واحذف اسم المشروع من هذا الحقل.
Employment contracts use the reporting manager title only. Remove the personal name from this field.|اكتب مسمى المدير المباشر فقط في عقد العمل، واحذف اسمه الشخصي من هذا الحقل.
Enter the issuing city only, without a centre or complex name.|أدخل مدينة الإصدار فقط، دون اسم المركز أو المجمع.
Enter the issuing city only, without a centre number.|أدخل مدينة الإصدار فقط، دون رقم المركز.
Enter the issuing city in both languages, or leave both empty if it is not stated.|أدخل مدينة الإصدار باللغتين، أو اترك الحقلين فارغين إذا لم تُذكر.
The issuing city does not match between Arabic and English.|مدينة الإصدار بالعربية لا تطابق الإنجليزية.
Use a document label between 1 and 120 characters, without field tags or control characters.|اكتب اسم الوثيقة من 1 إلى 120 حرفًا، دون علامات حقول أو رموز تحكم.
The local identity-type list could not be read.|تعذّرت قراءة قائمة أنواع الوثائق المحفوظة.
A local identity-type entry is invalid.|يوجد نوع وثيقة محفوظ غير صالح.
A local identity-type entry has invalid grammar choices.|خيارات الصياغة لأحد أنواع الوثائق غير صالحة.
Choose an available identity document type.|اختر نوع وثيقة هوية متاحًا.
Enter the Arabic document name in Arabic.|أدخل اسم الوثيقة العربية بحروف عربية.
Enter the English document name in English.|أدخل اسم الوثيقة الإنجليزية بحروف إنجليزية.
Choose valid Arabic and English grammar options.|اختر صياغة صحيحة بالعربية والإنجليزية.
Accept or reject tracked changes in Word before importing this template.|اقبل التغييرات المتعقبة في Word أو ارفضها قبل استيراد القالب.
An incomplete field tag was found. Use the field mapper to replace it.|توجد علامة حقل غير مكتملة. استبدلها باستخدام أداة ربط الحقول.
Check that every employee-specific value is a field tag, including repeated names, document numbers, dates and signature details in both languages.|تأكّد من ربط كل بيانات الموظف بعلامات حقول، بما فيها الأسماء المكررة وأرقام الوثائق والتواريخ وبيانات التوقيع باللغتين.
Check the template wording and all changing fields before activating it.|راجع نص القالب وكل الحقول المتغيرة قبل اعتماده.
Choose a Word template for this contract type first.|اختر قالب Word لهذا النوع من العقود أولًا.
Choose a supported field and paragraph.|اختر حقلًا وفقرة متاحين.
Choose a valid .docx Word document.|اختر مستند Word صالحًا بصيغة .docx.
Choose an unencrypted Word document without duplicate parts.|اختر مستند Word غير مشفّر ولا يحتوي على أجزاء مكررة.
Choose text and a field to map.|حدّد النص والحقل الذي يمثّله.
Create the local preview first.|أنشئ المعاينة المحلية أولًا.
Embed linked images or other linked content in Word before importing it.|ضمّن الصور والمحتوى المرتبط داخل ملف Word قبل استيراده.
Field tags in headers, footers or other Word parts are not supported. Put changing fields in the document body.|ضع الحقول المتغيرة في متن المستند؛ لا تُدعم علامات الحقول في الترويسات أو التذييلات أو الأجزاء الأخرى.
Please use a template with at most 120 pages.|استخدم قالبًا لا يتجاوز 120 صفحة.
Remove macros and embedded files from the Word template first.|احذف وحدات الماكرو والملفات المضمّنة من القالب أولًا.
Select the exact text to replace.|حدّد النص المراد استبداله بدقة.
The active template changed in another window. Reload Templates and check the new version.|تغيّر القالب المعتمد في نافذة أخرى. أعد تحميل القوالب وراجع النسخة الجديدة.
The active template changed since this draft was started. Import the draft again against the new version.|تغيّر القالب المعتمد بعد بدء المسودة. أعد استيراد المسودة استنادًا إلى النسخة الجديدة.
The active template changed. Reload Templates before replacing it.|تغيّر القالب المعتمد. أعد تحميل القوالب قبل استبداله.
The draft changed outside the app. Import it again.|تغيّرت المسودة خارج التطبيق. أعد استيرادها.
The draft changed. Check its fields again before activating it.|تغيّرت المسودة. راجع حقولها مجددًا قبل اعتمادها.
The template changed outside the app. Replace it in Templates before continuing.|تغيّر القالب خارج التطبيق. استبدله من صفحة القوالب قبل المتابعة.
The template changed. Reload its fields and preview before continuing.|تغيّر القالب. أعد تحميل حقوله ومعاينته قبل المتابعة.
This Word document contains an unsupported XML declaration.|يحتوي مستند Word على تعريف XML غير مدعوم.
This Word package contains an invalid part name.|يحتوي ملف Word على اسم جزء غير صالح.
This Word template is too large to open.|حجم قالب Word أكبر من الحد المسموح لفتحه.
This draft changed in another window. Reload its fields before editing.|تغيّرت المسودة في نافذة أخرى. أعد تحميل حقولها قبل التعديل.
This draft could not be found. Choose the Word file again.|لم يُعثر على المسودة. اختر ملف Word مجددًا.
This file could not be read as a .docx Word document.|تعذّرت قراءة الملف كمستند Word بصيغة .docx.
This previous template version could not be found.|لم يُعثر على نسخة القالب السابقة.
This saved template version could not be found.|لم يُعثر على نسخة القالب المحفوظة.
This saved version changed outside the app.|تغيّرت النسخة المحفوظة خارج التطبيق.
This template version could not be found.|لم يُعثر على نسخة القالب هذه.
A configured template field no longer matches its approved reference. Re-import the template.|أحد حقول القالب لا يطابق المرجع المعتمد. أعد استيراد القالب.
A template binding is ambiguous. Use a more specific field mapping.|ربط أحد الحقول غير واضح. حدّد النص المرتبط بدقة أكبر.
An empty template binding was refused.|لا يمكن حفظ ربط حقل فارغ.
Invalid template field boundary.|حدود حقل القالب غير صالحة.
The final Word text failed the template-preservation check.|لم يجتز نص Word النهائي فحص الحفاظ على نص القالب.
Choose a supported contract field.|اختر حقل عقد متاحًا.
Choose a valid spreadsheet column.|اختر عمودًا صالحًا من الجدول.
Choose an XLSX, ODS or CSV spreadsheet.|اختر جدولًا بصيغة XLSX أو ODS أو CSV.
Choose an existing spreadsheet row.|اختر صفًا موجودًا في الجدول.
Each contract field can be mapped to only one column.|يمكن ربط كل حقل في العقد بعمود واحد فقط.
Excel serial 60 is not a real calendar date.|القيمة 60 في نظام تواريخ Excel ليست تاريخًا تقويميًا صالحًا.
Import a spreadsheet with at most 10,000 rows.|استورد جدولًا لا يتجاوز 10,000 صف.
Import a spreadsheet with at most 120 columns.|استورد جدولًا لا يتجاوز 120 عمودًا.
Import a spreadsheet with at most 120 non-empty columns.|استورد جدولًا لا يتجاوز 120 عمودًا غير فارغ.
Import at most 10,000 non-empty rows per sheet.|استورد 10,000 صف غير فارغ كحد أقصى لكل ورقة.
Invalid spreadsheet column repetition.|تكرار أعمدة الجدول غير صالح.
Invalid spreadsheet date.|تاريخ الجدول غير صالح.
Invalid spreadsheet row repetition.|تكرار صفوف الجدول غير صالح.
Map at least one spreadsheet column to a contract field.|اربط عمودًا واحدًا على الأقل بحقل في العقد.
Save this spreadsheet as CSV UTF-8, XLSX or ODS and choose it again.|احفظ الجدول بصيغة CSV UTF-8 أو XLSX أو ODS ثم اختره مجددًا.
The selected contract type differs from this spreadsheet row. Choose the correct contract type first.|نوع العقد المختار يختلف عن الصف. اختر نوع العقد الصحيح أولًا.
The spreadsheet date is invalid.|التاريخ في الجدول غير صالح.
This identity number is stored as a spreadsheet number. Compare every digit and any leading zeros with the identity document.|رقم الهوية مخزّن كرقم في الجدول. طابق كل أرقامه وأصفاره الأولى مع وثيقة الهوية.
This spreadsheet has no readable rows.|لا توجد صفوف قابلة للقراءة في الجدول.
This workbook contains an unsupported sheet link.|يحتوي الملف على رابط ورقة عمل غير مدعوم.
This workbook has an invalid cell address.|يحتوي الملف على عنوان خلية غير صالح.
Use one of the first 120 spreadsheet columns.|اختر عمودًا من أول 120 عمودًا في الجدول.
Please split documents longer than 120 pages before importing.|قسّم المستندات التي تتجاوز 120 صفحة قبل استيرادها.
This compressed document is too large to open safely.|حجم المستند المضغوط أكبر من الحد المسموح لفتحه.
This image is too large. Please use a smaller scan.|الصورة كبيرة جدًا. استخدم نسخة أصغر.
Unsupported file type.|نوع الملف غير مدعوم.
Word text; page numbers unavailable until PDF rendering succeeds.|نص Word؛ تتوفر أرقام الصفحات بعد نجاح المعاينة المحلية.
LibreOffice is needed for PDF export. The Word file is still available.|يلزم LibreOffice للمعاينة. ملف Word ما زال متاحًا.
PDF export did not complete. The Word file was preserved.|لم تكتمل المعاينة. حُفظ ملف Word.
Not entered yet.|بانتظار الإدخال.
Changes not saved yet.|تغييرات بانتظار الحفظ.
Changes could not be saved. Keep this page open and choose Save work to retry.|تعذّر حفظ التغييرات. أبقِ الصفحة مفتوحة واختر «حفظ العمل» للمحاولة مجددًا.
Failed to fetch|تعذّر الاتصال بالتطبيق المحلي. تأكّد من أنه يعمل ثم حاول مجددًا.
Load failed|تعذّر الاتصال بالتطبيق المحلي. تأكّد من أنه يعمل ثم حاول مجددًا.
This workspace was not found.|لم يُعثر على مساحة العمل هذه.
Source not found.|لم يُعثر على المستند المرجعي.
Tags|الوسوم
All tags|كل الوسوم
Untagged|بدون وسوم
Sort by|الترتيب حسب
Recently updated|آخر تحديث
Created · newest first|تاريخ الإنشاء · الأحدث أولًا
Created · oldest first|تاريخ الإنشاء · الأقدم أولًا
Name · A–Z|الاسم · تصاعدي
Name · Z–A|الاسم · تنازلي
Manage tags|إدارة الوسوم
Edit tags|تعديل الوسوم
CONTRACT HISTORY|سجل نسخ العقد
Contract history|سجل نسخ العقد
← Completed contracts|→ العقود المكتملة
Duplicate latest version|نسخ أحدث نسخة
Choose a saved version to download, edit or duplicate. Each version keeps its own saved details.|اختر نسخة محفوظة لتنزيلها أو تعديلها أو نسخها. لكل نسخة بياناتها المحفوظة.
COPY A SAVED VERSION|نسخ عقد محفوظ
Duplicate this version|إنشاء نسخة من هذا العقد
Where should the copy go?|أين تريد حفظ النسخة؟
Inside this person’s history|داخل سجل الشخص نفسه
Separate editable copy|نسخة مستقلة قابلة للتعديل
Only the selected version is copied, with its dates, supervisor and other saved details. Review the name and identity details when using it for another employee.|تُنسخ النسخة المختارة فقط بتواريخها وبيانات المشرف وبقية بياناتها المحفوظة. راجع الاسم وبيانات الهوية عند استخدامها لموظف آخر.
Duplicate and edit|نسخ وتعديل
EDIT A SAVED VERSION|تعديل نسخة محفوظة
How should these edits be saved?|كيف تريد حفظ التعديلات؟
Save edits|حفظ التعديلات
As a new copy inside this person’s history|كنسخة جديدة داخل سجل الشخص نفسه
Update this version|تحديث هذه النسخة
Updating keeps the version’s creation date. Saving a copy keeps the original unchanged.|يحافظ التحديث على تاريخ إنشاء النسخة، وتبقى النسخة الأصلية كما هي عند الحفظ كنسخة جديدة.
Continue to edit|متابعة التعديل
Move this version to trash?|نقل هذه النسخة إلى المحذوفات؟
You can undo this or restore it from Trash. Other versions stay saved.|يمكنك التراجع أو استعادة النسخة من المحذوفات. تبقى بقية النسخ محفوظة.
Move to trash|نقل إلى المحذوفات
ORGANIZE YOUR CONTRACTS|تنظيم عقودك
Named color tags|وسوم بأسماء وألوان
Give each tag a name and color. Use tags to organize, filter and sort your contracts.|اختر اسمًا ولونًا لكل وسم، واستخدم الوسوم لتنظيم عقودك وتصفيتها وترتيبها.
Tag name|اسم الوسم
Color|اللون
Save tag|حفظ الوسم
New tag|وسم جديد
Apply tags|تطبيق الوسوم
Delete this tag?|حذف هذا الوسم؟
The tag will be removed from your contracts. Contract files and versions stay saved.|سيُزال الوسم من عقودك. تبقى ملفات العقود ونسخها محفوظة.
Delete tag|حذف الوسم
Double-click to open version history|انقر مرتين لفتح سجل النسخ
Created: {date}|تاريخ الإنشاء: {date}
Edited: {date}|آخر تعديل: {date}
Creation time unavailable|وقت الإنشاء غير متاح
File creation time|وقت إنشاء الملف
Draft changes saved|تعديلات المسودة محفوظة
No matching contracts|لا توجد عقود مطابقة
Try another name, tag or contract type.|جرّب اسمًا أو وسمًا أو نوع عقد آخر.
Edit|تعديل
Versions|النسخ
Duplicate|نسخ
Delete|حذف
Version {number}|النسخة {number}
Version {number} · {date}|النسخة {number} · {date}
Latest version|أحدث نسخة
Copied version|نسخة منسوخة
Restore|استعادة
Trash|المحذوفات
Trash ({count})|المحذوفات ({count})
No active versions|لا توجد نسخ محفوظة حاليًا
You can restore versions from Trash below.|يمكنك استعادة النسخ من المحذوفات أدناه.
Version moved to trash.|نُقلت النسخة إلى المحذوفات.
Undo|تراجع
Version restored.|استُعيدت النسخة.
Version duplicated. Review the copied details before saving.|أُنشئت النسخة. راجع البيانات المنسوخة قبل الحفظ.
No tags yet. Create your first tag below.|لا توجد وسوم بعد. أنشئ أول وسم أدناه.
Upload the edited Word version|رفع نسخة Word المعدّلة
Save version & download|حفظ النسخة وتنزيلها
Updating Version {number}. Other versions stay saved.|تحديث النسخة {number}. تبقى بقية النسخ محفوظة.
Editing a new copy of Version {number}. The original stays saved.|تعديل نسخة جديدة من النسخة {number}. تبقى الأصلية محفوظة.
Earlier versions ({count})|النسخ السابقة ({count})
This contract history was not found.|لم يُعثر على سجل هذا العقد.
Choose an available Word version.|اختر نسخة Word متاحة.
This Word version could not be found.|لم يُعثر على نسخة Word هذه.
This Word version changed outside the app. Upload it as a new version before copying its saved details.|تغيّرت نسخة Word خارج التطبيق. ارفعها كنسخة جديدة قبل نسخ بياناتها المحفوظة.
Choose where to duplicate this version.|اختر مكان حفظ النسخة.
This version has no saved form details. Edit its Word file and upload the edited version.|لا توجد بيانات نموذج محفوظة لهذه النسخة. عدّل ملف Word ثم ارفع النسخة المعدّلة.
Choose how to save the edited version.|اختر طريقة حفظ النسخة المعدّلة.
This version changed while you were editing it. Start a new copy from its history.|تغيّرت هذه النسخة أثناء تعديلها. ابدأ نسخة جديدة من سجلها.
Use a tag name between 1 and 60 characters.|اكتب اسم وسم من 1 إلى 60 حرفًا.
Choose a valid tag color.|اختر لونًا صالحًا للوسم.
This tag was not found.|لم يُعثر على هذا الوسم.
A tag with this name already exists.|يوجد وسم بهذا الاسم بالفعل.
Choose available tags.|اختر وسومًا متاحة.
The original template for this version is unavailable. Edit its Word file and upload the result instead.|القالب الأصلي لهذه النسخة غير متاح. عدّل ملف Word وارفع النتيجة بدلًا من ذلك.
Download this version, edit it in Word, then choose the edited file below.|نزّل هذه النسخة وعدّلها في Word، ثم اختر الملف المعدّل أدناه.
Download this version|تنزيل هذه النسخة
`.trim().split('\n').map(line=>line.split('|'));
 const ar=Object.fromEntries(entries);
 const locale=()=>language==='ar'?'ar-YE-u-nu-latn':'en-GB';
 function t(text,values={}){const key=String(text??'');const normalized=key.trim().replaceAll('&amp;','&');const translated=language==='ar'?(ar[normalized]??normalized):normalized;return key.replace(key.trim(),translated).replace(/\{(\w+)\}/g,(all,k)=>Object.hasOwn(values,k)?String(values[k]):all);}
 // Only literal markup chunks are translated. Interpolations retain their exact bytes.
 function markup(literal){return literal.replace(/(^|>)([^<>]*)(?=<|$)/g,(_,start,content)=>start+t(content)).replace(/\b(aria-label|title|placeholder|alt)="([^"]*)"/g,(_,attr,value)=>`${attr}="${t(value)}"`);}
 function ui(strings,...values){if(typeof strings==='string')return markup(strings);return strings.reduce((out,part,i)=>out+markup(part)+(i<values.length?values[i]:''),'');}
 let staticNodes=[];
 function captureStatic(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){if(ar[node.textContent.trim().replaceAll('&amp;','&')]!==undefined)staticNodes.push({node,value:node.textContent});}
  document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(node=>{for(const attr of ['aria-label','title','placeholder']){const value=node.getAttribute(attr);if(value&&ar[value]!==undefined)staticNodes.push({node,attr,value});}});
 }
 function applyStatic(){for(const entry of staticNodes){if(entry.node.isConnected){if(entry.attr)entry.node.setAttribute(entry.attr,t(entry.value));else entry.node.textContent=t(entry.value);}}document.title=t('NMO Contract Maker');}
 function message(value){
  const text=String(value??'');if(language!=='ar')return text;
  if(ar[text.trim()]!==undefined)return t(text);
  let match;
  const patterns=[
   [/^The date in (.+) is ambiguous or invalid\. Enter it manually as YYYY-MM-DD\.$/,m=>`التاريخ في العمود ${m[1]} غير واضح أو غير صالح. أدخله يدويًا بصيغة YYYY-MM-DD.`],
   [/^(.+) is required by this template\.$/,m=>`هذا القالب يتطلب ${t(m[1])}.`],
   [/^The formula in (.+) has no saved value\. Enter this field manually\.$/,m=>`لا توجد نتيجة محفوظة لمعادلة العمود ${m[1]}. أدخل الحقل يدويًا.`],
   [/^Cell (.+) contains a spreadsheet error\. Enter this field manually\.$/,m=>`تحتوي الخلية في العمود ${m[1]} على خطأ في الجدول. أدخل الحقل يدويًا.`],
   [/^Cell (.+) uses its saved formula result\. Formulas are not recalculated; check the value against the source\.$/,m=>`تستخدم الخلية في العمود ${m[1]} نتيجة المعادلة المحفوظة دون إعادة حسابها. طابقها مع المصدر.`],
   [/^Choose a supported value for (.+) manually\.$/,m=>`أدخل قيمة متاحة لحقل ${t(m[1])} يدويًا.`],
   [/^(.+) is missing\.$/,m=>`أدخل ${t(m[1])}.`],
   [/^Confirm (.+) against its source\.$/,m=>`أكّد ${t(m[1])} بعد مطابقته بالمصدر.`],
   [/^Confirm (.+) before using it\.$/,m=>`أكّد ${t(m[1])} قبل استخدامه.`],
   [/^Choose a supported value for (.+)\.$/,m=>`اختر قيمة متاحة لحقل ${t(m[1])}.`],
   [/^Your saved instruction for this employee requires: (.+)$/,m=>`التعليمات المحفوظة لهذا الموظف تتطلب: ${m[1]}`],
   [/^Rendering template page (\d+) of (\d+) on this computer$/,m=>`جارٍ تجهيز صفحة القالب ${m[1]} من ${m[2]} على جهازك`],
   [/^Unsupported field tags: (.+)$/,m=>`علامات حقول غير مدعومة: ${m[1]}`],
   [/^Fields present in the active template are absent here: (.+)$/,m=>`حقول موجودة في القالب المعتمد ومفقودة هنا: ${m[1]}`],
   [/^The template requires a field that is not configured: (.+)$/,m=>`يتطلب القالب حقلًا غير مُعدّ: ${m[1]}`],
   [/^Map the employee name in (.+)$/,m=>`اربط اسم الموظف في ${m[1]}`],
   [/^spreadsheet row (\d+), column (.+)$/,m=>`مستورد من الصف ${m[1]}، العمود ${m[2]}`],
   [/^Imported from spreadsheet row (.+)$/,m=>`مستورد من صف الجدول ${m[1]}`],
  ];
  for(const [pattern,render] of patterns){match=text.match(pattern);if(match)return render(match);}
  return text;
 }
 function setFields(fields){for(const [key,en,label] of fields){ar[en]=label;ar[key]=label;}}
 function setLanguage(next){language=next==='en'?'en':'ar';document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';try{localStorage.setItem(storageKey,language);}catch{}}
 setLanguage(language);
 return {t,ui,ar,message,setFields,locale,storageKey,captureStatic,applyStatic,setLanguage,get language(){return language;}};
})();
