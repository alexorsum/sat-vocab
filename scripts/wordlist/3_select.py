import json, sys
rows = json.load(open(sys.argv[1]))
idx = {r['word']: r for r in rows}
DIG = {'prepscholar','realtests','preppros'}
FAMILY_DROP = """ambivalence altruism anachronism antagonism antagonist antagonistic apathy calamitous coercion coercive
complementary deferential diligence discordant dissonant efficacious enigma feasibility fervor hedonist hypocritical idiosyncrasy
ignominy impartiality indifference indiscriminately infamy juxtaposition negligence nuanced objectivity obscurity ostensibly
paradoxical perusal prevailing recluse reluctantly renunciation speculative stagnate subsequently tangent tenacity ubiquity
unanimity viability apprehension agitation adversarial degradation innovate irony retention scrutiny reverent venerable zeal
hindrance analogy assertion compliment reconsideration diversification""".split()
OFF_TARGET = """absolution accost accretion aerial alias amorous analgesic annex antediluvian anthology anthropology antiseptic
apparition aquatic arable arboreal archaeology asylum badger ballad bard beget beseech bestial bilk botany bourgeois brawl
buoyancy byzantine catalog caucus citadel clairvoyant clergy clientele colossus combustion conflagration consecrate consonant
contusion coup cringe curmudgeon decoy defame desecrate diagnosis dirge diurnal effigy embezzle entomology epistolary etymology
eulogy excursion execrable expatriate geology geriatric hew humdrum hysterical imbibe incantation injunction interlocutor kudos
laceration larceny libertarian linchpin locomotion maelstrom magnate malfeasance medley mercenary miser mishap misfortune nettle
ogle oration ornithology palette pathology pigment pillage pittance potable preamble primeval progeny putrid queasy rail rant
raze respiration restitution salutation scuttle sensual smelt soluble solvent squelch stanza suffrage tome topography torrid
tremor tundra vertigo zany zephyr upshot trifle wrest whet partition reservoir interval increment intermediate protocol
transmit trigger surrender suspect occupy collapse compress assemble basic capture establish excel urge vow raw envy afford
conduct prompt civic fiscal bear scorn perish frankly materialistic melodramatic bittersweet irreconcilable unmitigated
exhilarating sparingly solidarity dire competent artificial accordingly anecdotal freewheeling""".split()
RENAME = {'galvanizing': 'galvanize'}
sel = []
for r in rows:
    w, c, z, s = r['word'], r['count'], r['zipf'], set(r['sources'])
    dig = bool(DIG & s)
    if w in FAMILY_DROP or w in OFF_TARGET: continue
    if z >= 5.0: continue
    if c >= 5: keep = z >= 1.8
    elif c == 4: keep = z >= 2.3 or dig
    elif c == 3: keep = (z >= 2.6) or (dig and z >= 2.2)
    elif c == 2: keep = dig and 2.6 <= z <= 4.9
    else: keep = ('realtests' in s and z >= 2.6) or ('prepscholar' in s and 3.0 <= z <= 4.6)
    if keep: sel.append(r)
print(len(sel), file=sys.stderr)
import collections
print(collections.Counter(r['count'] for r in sel), file=sys.stderr)
out = sorted(RENAME.get(r['word'], r['word']) for r in sel)
json.dump(out, open(sys.argv[2], 'w'))
print(' '.join(out))
