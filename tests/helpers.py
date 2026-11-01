from contract_maker.fields import empty_fields
def fields(kind='employment'):
    values={'contract_type':kind,'name_ar':'موظف تجريبي غير حقيقي','name_en':'Test Employee Example','gender':'male','identity_type':'passport','identity_number':'00001234','identity_issue_date':'2024-01-15','identity_expiry_date':'2030-01-15','issuer_ar':'عدن','issuer_en':'Aden','execution_date':'2026-10-01','start_date':'2026-10-01','end_date':'2026-12-31','original_contract_date':'2026-07-01','job_title_ar':'مساعد تعليم','job_title_en':'Education Assistant','grade_ar':'المساعدين','grade_en':'Assistants','workplace_ar':'عدن','workplace_en':'Aden','salary_usd':'825.69','manager_title_ar':'ضابط التعليم','manager_title_en':'Education Officer','manager_name_ar':'مدير تجريبي','manager_name_en':'Test Manager','project_ar':'مشروع تجريبي','project_en':'Demonstration Project'}
    result=empty_fields()
    for k,v in values.items():result[k].update(value=v,confirmed=True)
    return result
