import json, sys
from wordfreq import zipf_frequency
rows = json.load(open('sources/merged.json')); idx = {r['word']: r for r in rows}
auto = json.load(open('sources/final_auto.json'))
EDITORIAL_DROP = """submerge excavate baffle recuperate amenity legible blemish ramble coax hospitable ailment stingy extinguish
inexcusable mischievous devour ecstatic illiterate frantic ridicule agile appalling anarchy dialect terminate disguise arrogant
wrath negotiate resignation alter diplomatic proportion duration immune eliminate liability anonymous genre accessible
acknowledge bulk gravity identical vulnerable coalition discipline divine considerable enormous spectrum parallel apparent
consumption valid transition convention utilize repeal incentive initiate compensate goad tortuous lurid mire peerless dupe
anathema iridescent conceit covet itinerant atone caprice nadir wanton divest amity canny forsake awry pungent profane
meritorious onus travesty enmity fanatical infallible moratorium remedial tact scapegoat cadence forage blunder habitual
justifiable temperance utopian grievous impromptu ethereal vocation enlighten grandeur vernacular blight luminous waive
cessation extant heinous artisan conduit whim feral labyrinth degenerate cosmopolitan anguish delusion surrogate glacial
artifact reputable fraudulent portent irksome fractious inveterate morass puerile pallid stratagem invective temerity
sacrosanct bequeath ponderous subjugate blithe forbearance lithe variegated resplendent emaciated insolent modulate precipice
odious sensuous wily pathos depravity tirade reprieve vex tumult vivacious raucous vapid""".split()
ADD = """counterintuitive inconclusive provisional definitive haphazard stymie succumb encompass transcend relinquish forgo
epitomize embody replicate hypothesize anomalous negligible scarce inconspicuous simplistic sophisticated receptive satirize
commend reprimand aggravate amplify fortify recede thrive waver correlate necessitate overshadow tolerate discrete discreet
imply scant intangible cohesive incoherent subjective disinterested burgeon vacillate implausible inadequate indispensable
integral pivotal preliminary uniform reminiscent earnest forthright lax lenient rigid perpetual fleeting unorthodox ample
systematic methodical posit rebut expound qualify harbor champion grave weather""".split()
final = [w for w in auto if w not in EDITORIAL_DROP]
added = [w for w in ADD if w not in final]
final = sorted(set(final) | set(added))
print(len(auto), '->', len(final), 'added', len(added), file=sys.stderr)
out = []
for w in final:
    r = idx.get(w) or idx.get({'galvanize':'galvanizing'}.get(w, w))
    out.append({'word': w, 'count': r['count'] if r else 0, 'score': r['score'] if r else 0, 'sources': r['sources'] if r else [], 'zipf': zipf_frequency(w,'en'), 'editor': w in added})
out.sort(key=lambda r: (-r['count'], -r['score'], -r['zipf'], r['word']))
for i, r in enumerate(out): r['rank'] = i + 1
json.dump(out, open('sources/final.json', 'w'), indent=0)
import collections
print(collections.Counter(r['count'] for r in out), file=sys.stderr)
zs = sorted(r['zipf'] for r in out)
print('zipf terciles', zs[len(zs)//3], zs[2*len(zs)//3], file=sys.stderr)
