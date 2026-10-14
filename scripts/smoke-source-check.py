from pathlib import Path
import json,re,sys
from openpyxl import load_workbook
root=Path(__file__).resolve().parents[1]
files=list(root.rglob('*.ts'))
assert len(files)>10,files
for f in files:
 txt=f.read_text()
 assert len(txt)>100,f
 assert not re.search(r'REPLACE_WITH_.*PASSWORD',txt),f
for f in [root/'frontend/angular.json',root/'frontend/package.json',root/'backend/package.json',root/'backend/tsconfig.json',root/'frontend/tsconfig.json']:
 json.loads(f.read_text())
rows=json.loads((root/'backend/prisma/forecast-input.json').read_text())
assert len(rows)==12
central={r['year']:r for r in rows if r['scenario']=='CENTRALE'}
expected={2027:-11800,2028:-400,2029:22400,2030:30900}
for y,r in central.items():
 revenue=r['orders']*r['basePrice']*r['markup']+r['otherRevenueAnnual']
 fixed=12*sum(r[k] for k in ('marketingMonthly','designerMonthly','toolsMonthly','adminMonthly'))+sum(r[k] for k in ('advertisingAnnual','contractorsAnnual','employeesAnnual'))
 result=revenue-r['orders']*r['variablePerOrder']-fixed
 assert abs(result-expected[y])<.001,(y,result,expected[y])
print('PASS: project files',len(files),'financial seed 12 rows, core scenario: +41100 EUR 4yr')
