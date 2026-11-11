"""Parse downloaded third-party SAT word lists into plain headword sets.
Reads only; treats every input file as untrusted data."""
import json, re, sys, os, csv, io
RAW = sys.argv[1]
OUT = sys.argv[2]
def norm(w):
    w = w.strip().lower()
    w = re.sub(r"[^a-z\-]", "", w)
    return w
def ok(w):
    return bool(re.fullmatch(r"[a-z]{3,20}", w))
src = {}
# 1 PrepScholar 262 (mirror: shirin05/SAT-Vocab-Mastery word-list.csv)
s=set()
for row in csv.DictReader(open(os.path.join(RAW,'shirin.csv'), encoding='utf-8', errors='replace')):
    s.add(norm(row.get('word','')))
src['prepscholar'] = s
# 2 SparkNotes 1000
s=set()
for row in csv.DictReader(open(os.path.join(RAW,'gtran-sat1000.txt'), encoding='utf-8', errors='replace')):
    s.add(norm(row.get('word','')))
src['sparknotes'] = s
# 3 MajorTests 1500
d=json.load(open(os.path.join(RAW,'majortests.json'), encoding='utf-8'))
src['majortests'] = {norm(x['word']) for x in d['results']}
# 4/5 Sangam: PrepPros levels + digital SAT categories
d=json.load(open(os.path.join(RAW,'sangam.json'), encoding='utf-8'))
pp=set(); cat=set()
for c in d['vocabulary_categories']:
    tgt = pp if 'PrepPros' in c['category_name'] else cat
    for w in c['words']: tgt.add(norm(w['term']))
src['preppros'] = pp
src['vocabmaster'] = cat
# 6 Sesamewords (tiers)
d=json.load(open(os.path.join(RAW,'gandalf-words.json'), encoding='utf-8'))
for t in (1,2,3):
    src[f'sesame{t}'] = {norm(x['w']) for x in d['words'] if x.get('t')==t}
# 7 Barron's 333
html=open(os.path.join(RAW,'barrons333.html'), encoding='utf-8', errors='replace').read()
src['barrons333'] = {norm(m) for m in re.findall(r'word"\s*:\s*"([A-Za-z\-]+)"', html)}
# 8 pranaam real tests / question bank
html=open(os.path.join(RAW,'pranaam-index.html'), encoding='utf-8', errors='replace').read()
src['realtests'] = {norm(m) for m in re.findall(r'\{word:"([A-Za-z\- ]+)"', html)}
# 9 JackJames 550
s=set()
for i in range(1,11):
    for x in json.load(open(os.path.join(RAW,f'jackjames-{i:02d}.json'), encoding='utf-8')):
        s.add(norm(x['word']))
src['builder550'] = s
# 10 KyleBing SAT
s=set()
for line in open(os.path.join(RAW,'kylebing-sat.txt'), encoding='utf-8', errors='replace'):
    w=line.split('\t')[0]
    s.add(norm(w))
src['kylebing'] = s
# 11 Yers1 1000 flashcards
html=open(os.path.join(RAW,'yers.html'), encoding='utf-8', errors='replace').read()
cands = re.findall(r'(?:word|w|term)["\']?\s*:\s*["\']([A-Za-z\-]+)["\']', html)
src['yers1000'] = {norm(m) for m in cands}
# 12 TD golden words
src['tdgolden'] = {norm(l) for l in open(os.path.join(RAW,'tntsg.txt'), encoding='utf-8', errors='replace')}
# littlejt (check: is it PrepScholar too?)
d=json.load(open(os.path.join(RAW,'littlejt.json'), encoding='utf-8'))
src['littlejt'] = {norm(x['text']) for x in d}
for k,v in src.items():
    v2 = sorted(w for w in v if ok(w))
    src[k]=v2
    print(f"{k:14s} {len(v2):5d}  e.g. {', '.join(v2[:8])}")
json.dump(src, open(OUT,'w'))
