import json, sys, collections
from wordfreq import zipf_frequency
P = json.load(open(sys.argv[1]))
SOURCES = {
 'prepscholar': 2, 'realtests': 3, 'preppros': 2, 'vocabmaster': 1, 'builder550': 1,
 'barrons333': 1, 'sparknotes': 1, 'majortests': 1, 'sesame': 1, 'kylebing': 0.5, 'tdgolden': 0.5,
}
sets = {k: set(P[k]) for k in ['prepscholar','realtests','preppros','vocabmaster','builder550','barrons333','sparknotes','majortests','kylebing','tdgolden']}
sesame_w = {}
for t,wt in ((1,1.0),(2,0.5),(3,0.25)):
    for w in P[f'sesame{t}']: sesame_w.setdefault(w, wt)
sets['sesame'] = set(sesame_w)
allw = set().union(*sets.values())
rows = []
for w in allw:
    srcs = [k for k in SOURCES if w in sets[k]]
    score = sum((sesame_w[w] if k=='sesame' else SOURCES[k]) for k in srcs)
    rows.append({'word': w, 'count': len(srcs), 'score': round(score,2), 'zipf': zipf_frequency(w,'en'), 'sources': srcs})
rows.sort(key=lambda r: (-r['count'], -r['score'], r['word']))
json.dump(rows, open(sys.argv[2],'w'))
print('total distinct', len(rows))
c = collections.Counter(r['count'] for r in rows)
cum=0
for k in sorted(c, reverse=True):
    cum+=c[k]; print(f'count>={k}: {cum}')
def band(r):
    z=r['zipf']
    return 'rare<2' if z<2 else 'low2-2.5' if z<2.5 else 'mid2.5-4' if z<4 else 'common4-5' if z<5 else 'vcommon>=5'
for thr in (2,3,4):
    sub=[r for r in rows if r['count']>=thr]
    print(thr, collections.Counter(band(r) for r in sub))
