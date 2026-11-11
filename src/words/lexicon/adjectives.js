import { A } from './define.js';

// Adjective (and adverb) concepts: as augments they mostly change STATS (mods), some convert element.
export default [
  A('big', 'blast', 'earth', 'splash', 'big', '⬛', 'Pounds the path with heavy blows',
    `big large huge giant enormous massive colossal immense vast gigantic monumental mammoth titanic heavy
 hefty bulky jumbo whopping mighty tremendous gargantuan hulking towering monstrous prodigious bloated
 great grand voluminous sizable sizeable`, { mods: { damage: 1.25, rate: 0.9, hp: 1.15 } }),
  A('small', 'rapid', 'arcane', '', 'small', '▪', 'Fires a stream of tiny shots',
    `small tiny little mini minor petite miniature wee teeny slight compact puny diminutive microscopic
 minuscule minute dainty bitsy itty pocket baby lean slim slender thin narrow`, { mods: { rate: 1.25, damage: 0.92 } }),
  A('fast', 'rapid', 'storm', '', 'speed', '⚡', 'Fires in a blur',
    `fast quick swift rapid speedy hasty fleet nimble agile brisk prompt lively zippy snappy express
 breakneck hurried headlong sudden instant immediate restless frantic frenetic quicksilver`, { mods: { rate: 1.3, damage: 0.96 } }),
  A('slow', 'blast', 'earth', 'stun:0.5', 'slow', '🐢', 'Deals slow, crushing blows',
    `slow sluggish lazy idle languid leisurely ponderous lumbering plodding torpid lethargic sleepy drowsy
 patient steady deliberate gradual unhurried dull`, { mods: { damage: 1.35, rate: 0.8 } }),
  A('sharp', 'bolt', 'metal', 'crit', 'blade', '🔪', 'Cuts with a keen edge',
    `sharp keen pointed jagged serrated barbed spiky edged honed acute pointy razor bladed spiked thorny
 prickly piercing cutting incisive tapered needlelike`, { mods: { damage: 1.15 } }),
  A('strong', 'bolt', 'earth', 'knockback:0.6', 'power', '💪', 'Hits with raw strength',
    `strong powerful potent robust sturdy stout tough brawny burly muscular hardy rugged forceful vigorous
 strapping beefy stalwart solid sound intense extreme supreme mega epic`, { mods: { damage: 1.2, hp: 1.1 } }),
  A('fiery', 'bolt', 'fire', 'burn', 'fire heat', '🔥', 'Spits flame',
    `fiery hot burning blazing flaming scorching fervent torrid sweltering ardent molten searing incandescent
 ablaze aflame afire alight smoldering sizzling boiling scalding infernal volcanic
 igneous red crimson scarlet vermilion orange ember ruddy`, { conv: true, mods: { damage: 1.08 } }),
  A('frozen', 'aura', 'ice', 'slow freeze:0.6', 'ice cold', '❄', 'Freezes the air around it',
    `frozen icy cold frosty freezing frigid chilly glacial wintry arctic polar gelid snowy iced frostbitten
 hoary numb bitter brisk cool chilled sleety white pale ivory`, { conv: true, mods: { range: 1.05 } }),
  A('ancient', 'snipe', 'arcane', 'crit:0.5', 'old time', '🏺', 'Strikes with the weight of ages',
    `ancient old elder elderly antique archaic primeval primordial venerable timeless ageless prehistoric aged
 olden bygone immemorial antediluvian hoary vintage classic legendary mythic eternal everlasting
 undying immortal perennial`, { mods: { hp: 1.3, range: 1.1, damage: 1.05 } }),
  A('young', 'rapid', 'nature', '', 'young new', '🌱', 'Fires eager, quick shots',
    `new young fresh novel modern youthful juvenile recent green budding nascent infant raw early first
 newborn spry sprightly`, { mods: { rate: 1.15, hp: 0.95 } }),
  A('dark', 'bolt', 'shadow', 'execute:0.7', 'dark shadow', '🌑', 'Strikes from darkness',
    `dark black gloomy murky shadowy dim dusky somber sombre grim sinister ominous eerie shady unlit
 inky midnight obsidian ebony sable jet nocturnal moonless starless tenebrous umbral
 shadowed`, { conv: true, mods: { damage: 1.1 } }),
  A('bright', 'beam', 'light', 'reveal', 'light', '✨', 'Shines brightly',
    `bright brilliant radiant shiny luminous glowing gleaming dazzling vivid golden sunny lucid shining
 glittering sparkling resplendent lustrous incandescent beaming blazing glossy polished gilded
 yellow amber light luminescent`, { conv: true, mods: { range: 1.1 } }),
  A('wet', 'aura', 'water', 'slow', 'water', '💧', 'Soaks nearby foes',
    `wet watery damp soggy moist aquatic marine liquid fluid misty humid dewy soaked sodden drenched
 saturated rainy waterlogged oceanic maritime nautical tidal briny salty blue azure cyan navy
 teal aqua`, { conv: true, mods: { range: 1.05 } }),
  A('stormy', 'chain', 'storm', 'stun', 'storm', '⛈', 'Crackles with storm energy',
    `stormy electric windy thundery turbulent tempestuous gusty blustery squally electrical charged
 galvanic voltaic crackling static violet purple`, { conv: true }),
  A('earthy', 'blast', 'earth', 'knockback', 'earth', '⛰', 'Hurls earth',
    `earthy rocky stony muddy sandy dusty rugged firm craggy gravelly granite earthen terrestrial
 subterranean underground brown tan beige ochre umber`, { conv: true, mods: { hp: 1.1 } }),
  A('green', 'bolt', 'nature', 'poison:0.6', 'nature', '🌿', 'Lashes with living growth',
    `verdant leafy lush wild natural organic floral wooden woody grassy mossy overgrown blooming flowery
 sylvan pastoral rustic feral untamed emerald olive`, { conv: true, mods: { hp: 1.1 } }),
  A('metallic', 'bolt', 'metal', 'armorBreak:0.6', 'metal', '⚙', 'Strikes with metal',
    `metallic iron steely brazen silver leaden chrome armored armoured plated ironclad steel bronze copper
 mechanical robotic grey gray silvery gunmetal tinny`, { conv: true, mods: { hp: 1.2 } }),
  A('magical', 'chain', 'arcane', 'crit', 'magic', '✨', 'Crackles with arcane power',
    `magical mystic mystical arcane occult eldritch enchanted uncanny mysterious psychic cosmic otherworldly
 supernatural paranormal ethereal astral spectral fey fabled fantastic wondrous miraculous
 marvelous marvellous magenta`, { conv: true, mods: { damage: 1.05 } }),
  A('holy', 'support', 'light', 'heal', 'holy', '😇', 'Radiates holy light that heals nearby towers',
    `holy sacred divine blessed saintly pious righteous pure heavenly celestial angelic hallowed godly
 virtuous noble sanctified consecrated spiritual devout reverent innocent white`, { conv: true, mods: { damage: 1.1 } }),
  A('evil', 'bolt', 'shadow', 'poison:0.5', 'evil', '😈', 'Strikes with malice',
    `evil wicked vile cruel malicious vicious nasty foul villainous fiendish diabolical demonic infernal
 sinful malevolent nefarious heinous monstrous depraved corrupt treacherous hellish satanic unholy`, { conv: true, mods: { damage: 1.25, hp: 0.9 } }),
  A('toxic', 'aura', 'nature', 'poison:1.2', 'poison', '☣', 'Poisons the air around it',
    `toxic poisonous venomous noxious rotten putrid septic infectious contagious virulent pestilent rancid
 festering diseased sickly sick ill fetid acrid acidic caustic radioactive`, { mods: { damage: 1.05 } }),
  A('deadly', 'snipe', 'shadow', 'execute crit:0.6', 'death', '💀', 'Kills with precision',
    `deadly lethal fatal mortal murderous savage brutal ferocious bloodthirsty ruthless merciless relentless
 killer cutthroat vicious grisly gruesome bloody gory`, { mods: { damage: 1.12 } }),
  A('long', 'snipe', 'storm', '', 'range', '📏', 'Reaches across the field',
    `long far distant tall lofty high remote farsighted elevated soaring towering 
 extended endless boundless infinite`, { mods: { range: 1.3 } }),
  A('wide', 'aura', 'earth', '', 'range', '↔', 'Sweeps a wide area',
    `wide broad sweeping spacious expansive extensive ample roomy panoramic sprawling widespread general
 global universal total`, { mods: { range: 1.18, damage: 1.03 } }),
  A('tough', 'support', 'earth', 'shield', 'defense', '🛡', 'Shields nearby towers',
    `safe secure protective defensive guarded shielded resilient durable sturdy hardened impenetrable
 invulnerable unbreakable indestructible steadfast staunch unyielding stubborn tenacious enduring
 resistant fortified armoured`, { mods: { hp: 1.4 } }),
  A('rich', 'harvest', 'light', 'harvest.ink', 'money', '💰', 'Overflows with ink',
    `rich wealthy lucky fortunate prosperous affluent opulent lavish luxurious costly expensive precious
 valuable priceless gilded moneyed flush plentiful abundant bountiful fruitful profitable`, { mods: { damage: 1.03 }, conv: false }),
  A('smart', 'snipe', 'arcane', 'crit', 'mind', '🧠', 'Picks its targets cleverly',
    `smart clever wise cunning sly crafty shrewd witty genius intelligent brainy learned scholarly erudite
 astute sage savvy canny bright tactical strategic calculating`, { mods: { range: 1.12 } }),
  A('happy', 'support', 'light', 'buff.rate', 'joy', '😊', 'Cheers on nearby towers',
    `happy kind gentle cheerful friendly merry jolly glad joyful jovial jubilant gleeful elated ecstatic
 delighted content pleased sunny bubbly peppy upbeat optimistic hopeful warm loving caring tender
 generous sweet`, { mods: { rate: 1.1 } }),
  A('angry', 'rapid', 'fire', 'crit', 'anger', '😡', 'Lashes out furiously',
    `angry furious mad irate enraged wrathful livid frenzied raging berserk fierce wild savage rabid
 incensed seething fuming irritable cross hostile aggressive belligerent violent`, { mods: { damage: 1.3, rate: 1.1, hp: 0.85 } }),
  A('sad', 'aura', 'water', 'slow', 'sadness', '😢', 'Weighs down nearby foes',
    `sad gloomy melancholy mournful tearful weeping sorrowful glum miserable forlorn woeful dismal dreary
 bleak doleful lonely blue depressed despondent grieving heartbroken wretched`, { mods: { range: 1.05 } }),
  A('loud', 'aura', 'storm', 'stun', 'sound', '📢', 'Deafens nearby foes',
    `loud noisy thunderous deafening booming roaring shrill raucous clamorous rowdy blaring screaming
 earsplitting resounding resonant sonorous strident vociferous`, { mods: { range: 1.08 } }),
  A('stealthy', 'snipe', 'shadow', 'crit execute:0.5', 'stealth', '🥷', 'Strikes unseen',
    `quiet silent stealthy hidden secret invisible sneaky covert furtive unseen veiled cloaked masked
 disguised camouflaged clandestine surreptitious secretive mute hushed soundless`, { mods: { damage: 1.12 } }),
  A('sticky', 'aura', 'nature', 'slow:1.3', 'sticky', '🍯', 'Gums up nearby foes',
    `sticky gooey gummy tacky viscous slimy gluey syrupy clingy adhesive muddy boggy marshy swampy
 tarry`, { mods: { range: 1.05 } }),
  A('bouncy', 'chain', 'nature', '', 'bounce', '🎾', 'Bounces between foes',
    `bouncy springy elastic rubbery stretchy flexible supple resilient bendy jumpy`, { mods: { rate: 1.05 } }),
  A('precise', 'snipe', 'metal', 'crit', 'precision', '🎯', 'Never misses',
    `precise accurate exact true steady careful meticulous deft skillful skilful expert adept masterful
 perfect flawless keen eagle focused`, { mods: { range: 1.1, damage: 1.05 } }),
  A('explosive', 'blast', 'fire', 'splash', 'explosive', '💥', 'Explodes on contact',
    `explosive volatile unstable incendiary combustible flammable inflammable dynamic eruptive
 detonating`, { mods: { damage: 1.1 } }),
  A('brave', 'support', 'fire', 'buff.damage', 'courage', '🦁', 'Emboldens nearby towers',
    `brave bold courageous valiant heroic daring fearless intrepid gallant plucky dauntless gutsy
 audacious undaunted lionhearted chivalrous honorable honourable loyal faithful proud`, { mods: { damage: 1.1 } }),
  A('weak', 'rapid', 'water', '', 'weak', '·', 'Pokes feebly but cheaply',
    `weak feeble frail fragile flimsy meek timid shy faint delicate brittle soft tender gentle limp wobbly
 shaky puny scrawny poor`, { mods: { rate: 1.12, damage: 0.95, hp: 0.9 } }),
  A('scary', 'aura', 'shadow', 'slow', 'fear', '👻', 'Spooks nearby foes',
    `scary spooky creepy frightening terrifying horrifying haunted ghostly ghastly macabre grim dreadful
 fearsome frightful hideous horrible horrid nightmarish menacing threatening`, { mods: { range: 1.08 } }),
  A('royal', 'support', 'light', 'buff.damage', 'royal', '👑', 'Lends regal authority to nearby towers',
    `royal regal kingly queenly princely imperial majestic noble stately sovereign aristocratic lordly
 magnificent glorious splendid grand`, { mods: { damage: 1.12 } }),
  A('many', 'rapid', 'arcane', '', 'many', '⁂', 'Fires many small shots',
    `many numerous countless myriad multiple several various manifold innumerable plenty abundant
 frequent repeated constant continual`, { mods: { rate: 1.2 } }),
  // adverbs (augment kind 'adjective')
  A('quickly', 'rapid', 'storm', '', 'speed', '⏩', 'Fires quickly',
    `quickly swiftly rapidly briskly hastily speedily promptly instantly suddenly abruptly immediately soon
 fast apace posthaste pronto`, { pos: 'adverb', mods: { rate: 1.22 } }),
  A('mightily', 'bolt', 'earth', '', 'power', '💪', 'Strikes mightily',
    `very really truly mightily hugely greatly extremely utterly fiercely powerfully strongly forcefully
 violently intensely deeply highly mostly totally wholly fully absolutely`, { pos: 'adverb', mods: { damage: 1.18 } }),
  A('afar', 'snipe', 'storm', '', 'range', '🔭', 'Strikes from afar',
    `afar away abroad beyond yonder far overseas outward onward upward aloft above overhead everywhere
 anywhere`, { pos: 'adverb', mods: { range: 1.22 } }),
  A('again', 'rapid', 'arcane', '', 'repeat', '🔁', 'Strikes again and again',
    `again often always ever forever anew twice thrice repeatedly constantly continually endlessly
 still yet once more`, { pos: 'adverb', mods: { rate: 1.15, damage: 1.03 } }),
  A('carefully', 'snipe', 'metal', 'crit:0.8', 'precision', '🎯', 'Takes careful aim',
    `carefully precisely exactly accurately steadily surely certainly definitely perfectly neatly gently
 softly quietly silently slowly`, { pos: 'adverb', mods: { damage: 1.1, range: 1.05 } }),
  A('together', 'support', 'light', 'buff.range:0.8', 'team', '🤝', 'Coordinates nearby towers',
    `together jointly mutually collectively side alongside along near nearby close here there now then`, { pos: 'adverb', mods: { range: 1.1 } }),
A('good', 'support', 'light', 'heal:0.7', 'good', '👍', 'Does nearby towers good',
    `good nice great fine excellent superb wonderful lovely pleasant decent splendid fantastic awesome
     terrific super brilliant admirable worthy`, { mods: { damage: 1.08, hp: 1.08 } }),
  A('bad', 'bolt', 'shadow', 'poison:0.6', 'bad', '👎', 'Does foes harm',
    `bad awful terrible dire lousy harmful dangerous perilous hazardous grievous baleful nasty`, { mods: { damage: 1.15, hp: 0.92 } }),
  A('hard', 'support', 'earth', 'shield', 'hard', '🪨', 'Hardens nearby towers',
    `hard rigid stiff dense solid sturdy rocky stiffened tempered unbending`, { mods: { hp: 1.3 } }),
  A('soft', 'support', 'water', 'heal:0.7', 'soft', '☁', 'Cushions nearby towers',
    `soft smooth mild fluffy fuzzy silky velvety plush cushy downy squishy spongy`, { mods: { hp: 1.1, rate: 1.05 } }),
  A('easy', 'rapid', 'light', '', 'easy', '🙂', 'Fires freely and often',
    `easy simple plain breezy effortless handy casual relaxed carefree`, { mods: { rate: 1.12 } }),
  A('full', 'support', 'nature', 'heal', 'full', '🫙', 'Tops up nearby towers',
    `full whole complete entire filled loaded stuffed brimming replete packed`, { mods: { hp: 1.15 } }),
  A('empty', 'aura', 'shadow', 'slow', 'empty', '🕳', 'Hollows out nearby foes',
    `empty hollow vacant bare blank barren desolate deserted abandoned forsaken`, { mods: { range: 1.1 } }),
  A('clean', 'support', 'water', 'heal', 'clean', '🧼', 'Scrubs nearby towers clean',
    `clean clear spotless tidy neat crisp pristine immaculate sterile washed`, { mods: { hp: 1.1 } }),
  A('dirty', 'aura', 'earth', 'poison:0.7', 'dirty', '💩', 'Fouls nearby foes',
    `dirty filthy grimy messy greasy grubby sooty squalid mucky slovenly unwashed`, { mods: { damage: 1.1 } }),
];
