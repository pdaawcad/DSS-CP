"""Prepare the static preview assets from the editable source CSV files."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'data' / 'international-source'
target = root / 'international-dashboard' / 'assets'
target.mkdir(parents=True, exist_ok=True)
def read(name):
    with (source / name).open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))

data = {'shipments': read('shipments.csv'), 'events': read('tracking_events.csv')}
data['destinations'] = json.loads((source / 'destinations.json').read_text(encoding='utf-8'))
data['fleet'] = read('fleet.csv')
data['operators'] = read('operators.csv')
(target / 'data.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
world_path = target / 'world.json'
if world_path.exists():
    world = json.loads(world_path.read_text(encoding='utf-8'))
    for feature in world['features']:
        feature['properties'] = {'name': feature['properties'].get('ADMIN') or feature['properties'].get('name')}
    world_path.write_text(json.dumps(world, separators=(',', ':')), encoding='utf-8')
print(f"Prepared {len(data['shipments'])} shipments / {len(data['events'])} events")
web = root / 'international-dashboard'
globe = (web / 'globe.js').read_text(encoding='utf-8').replace('export class Globe', 'class Globe')
app = (web / 'app.js').read_text(encoding='utf-8').replace("import { Globe } from './globe.js';", '')
(web / 'dashboard.js').write_text("(() => {\n" + globe + '\n' + (web / 'supabase.js').read_text(encoding='utf-8-sig') + '\n' + (web / 'admin.js').read_text(encoding='utf-8-sig') + '\n' + (web / 'dss.js').read_text(encoding='utf-8-sig') + '\n' + (web / 'finance.js').read_text(encoding='utf-8-sig') + '\n' + app + '\n})();\n', encoding='utf-8')
