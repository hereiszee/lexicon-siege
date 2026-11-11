import { V } from './define.js';

// Verb concepts: as augments they mostly ADD EFFECTS (and sometimes convert element).
export default [
  V('burn', 'bolt', 'fire', 'burn:1.2', 'fire', '🔥', 'Sears foes with fire',
    `burn scorch singe sear char ignite kindle incinerate immolate roast toast cremate combust inflame
 torch blaze flame smelt scald broil grill fry bake boil sizzle smoulder smolder`, { conv: true }),
  V('freeze', 'bolt', 'ice', 'freeze slow', 'ice cold', '❄', 'Freezes foes in their tracks',
    `freeze refrigerate congeal chill numb frost ice glaciate frostbite benumb solidify supercool petrify`, { conv: true }),
  V('pierce', 'bolt', 'metal', 'pierce', 'weapon', '➶', 'Drives straight through the line',
    `pierce stab impale skewer puncture perforate prick lance gore penetrate bore spike spear transfix
 harpoon gouge jab poke riddle`),
  V('stun', 'bolt', 'earth', 'stun:1.3', 'brawl', '💫', 'Bashes foes senseless',
    `stun daze stagger concuss bash smack whack clobber bonk wallop thump stupefy paralyze paralyse knock
 pummel batter bludgeon thrash maul punch kick slap clout sock biff thwack`),
  V('poison', 'bolt', 'nature', 'poison:1.3', 'poison', '☠', 'Envenoms its targets',
    `envenom taint contaminate infect pollute sicken intoxicate dope drug spike adulterate blight
 fester rot decay putrefy`),
  V('chain', 'chain', 'storm', 'chain stun:0.4', 'lightning', '⚡', 'Arcs between foes',
    `arc bounce ricochet link connect spread electrocute zap shock jolt electrify chain conduct relay
 cascade propagate ripple branch fork`, { conv: true }),
  V('shatter', 'blast', 'earth', 'armorBreak:1.3', 'break', '💥', 'Smashes armor apart',
    `shatter smash crush break crack splinter wreck demolish destroy shred rend rip tear pulverize pulverise
 obliterate annihilate raze ruin wreck fracture rupture dismantle crumble grind mangle trample flatten`),
  V('slow', 'aura', 'water', 'slow:1.3', 'bind', '🐌', 'Bogs foes down',
    `slow hinder hamper impede delay stall entangle ensnare bog drag encumber obstruct snarl tangle bind
 trap net hobble cripple shackle restrain detain mire clog choke smother stifle`),
  V('knockback', 'bolt', 'storm', 'knockback:1.3', 'force', '💨', 'Shoves foes back down the path',
    `push shove repel repulse bump hurl fling toss throw launch heave catapult propel buffet blow sweep
 deflect parry rebuff thrust ram butt bowl`),
  V('execute', 'snipe', 'shadow', 'execute:1.3', 'death killer', '⚰', 'Finishes off weakened foes',
    `kill slay murder execute assassinate behead decapitate slaughter massacre exterminate eliminate finish
 dispatch smite butcher garrote strangle throttle smother euthanize liquidate decimate cull`, { conv: false }),
  V('strike', 'snipe', 'metal', 'crit:1.3', 'precision', '🎯', 'Strikes precisely for critical hits',
    `strike aim target focus shoot hit snipe pinpoint zero sight pick nail score smite whack swipe lunge
 thrust`),
  V('hurry', 'rapid', 'storm', '', 'speed', '⏩', 'Fires faster and faster',
    `hurry rush hasten quicken speed accelerate dash sprint race zoom spin whirl hustle scurry scramble
 bolt dart scamper zip whiz whizz fly rattle flurry`, { mods: { rate: 1.3 } }),
  V('empower', 'bolt', 'fire', '', 'power', '💪', 'Hits with surging power',
    `strengthen empower boost enhance amplify intensify sharpen hone whet temper charge energize energise
 invigorate supercharge overcharge magnify augment upgrade improve power hulk bulk pump`, { mods: { damage: 1.25 } }),
  V('extend', 'snipe', 'light', '', 'range', '🔭', 'Reaches far across the field',
    `reach extend stretch lengthen expand broaden widen elongate project scope survey overlook aim range
 outreach outstretch`, { mods: { range: 1.25 } }),
  V('reveal', 'snipe', 'light', 'reveal crit:0.5', 'sight', '👁', 'Reveals hidden foes',
    `reveal expose detect spot unmask uncover discover illuminate find search seek track trace sense notice
 spy observe watch scan scout see glimpse perceive identify locate pinpoint unveil decipher decode`, { conv: false }),
  V('fortify', 'support', 'earth', 'shield', 'defense', '🛡', 'Fortifies nearby towers',
    `fortify reinforce armor armour shield guard protect defend shelter brace bolster barricade wall
 entrench secure safeguard shore buttress harden toughen insulate cushion cover screen`, { mods: { hp: 1.4 } }),
  V('heal', 'support', 'light', 'heal', 'medical heal', '✚', 'Heals nearby towers',
    `heal mend cure treat restore repair revive patch soothe bandage rejuvenate regenerate recover remedy
 nurse doctor medicate resuscitate rehabilitate recuperate convalesce refresh renew replenish revitalize
 fix splint stitch suture salve tend`, { mods: { hp: 1.2 } }),
  V('bless', 'support', 'light', 'buff.damage', 'holy', '✨', 'Blesses nearby towers',
    `bless sanctify consecrate anoint purify hallow ordain canonize baptize beatify exalt glorify praise
 worship pray absolve redeem`, { conv: true, mods: { damage: 1.1 } }),
  V('curse', 'bolt', 'shadow', 'armorBreak poison:0.6', 'curse dark', '☠', 'Curses foes',
    `curse hex jinx damn doom bewitch condemn blacken defile desecrate profane corrupt pervert sully besmirch
 torment haunt plague afflict`, { conv: true }),
  V('enchant', 'chain', 'arcane', 'crit:0.8', 'magic', '✨', 'Weaves arcane force into every hit',
    `enchant charm ensorcell spellbind conjure transmute transform transfigure mesmerize mesmerise hypnotize
 beguile entrance captivate bedazzle glamour levitate teleport summon invoke evoke divine prophesy
 foretell`, { conv: true }),
  V('drown', 'aura', 'water', 'slow knockback:0.5', 'water', '🌊', 'Douses foes in water',
    `drown soak drench douse flood splash spray wet submerge sink swamp inundate deluge immerse dunk souse
 hose sluice irrigate water rinse wash bathe`, { conv: true }),
  V('thunder', 'chain', 'storm', 'stun', 'storm', '⛈', 'Crackles with storm power',
    `thunder storm crackle rumble boom blast roar fulminate electrify spark flash lightning`, { conv: true }),
  V('bury', 'blast', 'earth', 'stun knockback:0.5', 'earth', '⛰', 'Buries foes under earth',
    `bury entomb inter quake shake tremble rumble topple collapse cave crumble dig excavate quarry mine
 tunnel landslide avalanche`, { conv: true }),
  V('corrode', 'aura', 'nature', 'armorBreak poison:0.5', 'acid', '🧪', 'Eats through armor',
    `rust corrode erode dissolve melt etch eat consume digest degrade wither tarnish canker`),
  V('steal', 'bolt', 'shadow', 'bounty:1.3', 'crime money', '💰', 'Robs foes of extra ink',
    `steal rob loot plunder pillage raid ransack burgle pilfer pickpocket swipe nab pinch filch poach
 embezzle extort fleece swindle earn profit sell trade barter haggle bargain buy invest bank save
 hoard mint harvest reap glean gather collect`),
  V('bleed', 'rapid', 'shadow', 'poison', 'blade', '🩸', 'Opens bleeding wounds',
    `bleed cut slash slice gash lacerate wound maim hack cleave carve lacerate nick graze scratch claw rake
 scrape skin flay incise dice chop mince`),
  V('shoot', 'rapid', 'metal', 'crit:0.6', 'weapon', '🔫', 'Fires volley after volley',
    `shoot fire bombard shell strafe volley barrage pelt pepper spray gun snipe blast blaze riddle salvo`, { mods: { rate: 1.15 } }),
  V('explode', 'blast', 'fire', 'splash burn:0.4', 'explosive', '💥', 'Bursts on impact',
    `explode detonate erupt burst blow bomb blast boom combust implode shatter fragment kaboom`, { conv: true }),
  V('summon', 'summon', 'arcane', 'summon', 'call', '📯', 'Calls allies to the path',
    `summon call rally recruit muster gather conscript enlist mobilize mobilise assemble convene marshal
 deploy dispatch draft hire beckon invite raise breed spawn hatch`, { mods: { damage: 1.05 } }),
  V('frighten', 'aura', 'shadow', 'slow knockback:0.5', 'fear', '😱', 'Scares foes back',
    `scare frighten terrify spook intimidate horrify menace threaten daunt cow startle alarm panic petrify
 unnerve haunt bully harass`),
  V('blind', 'bolt', 'light', 'stun reveal', 'light', '😵', 'Dazzles foes',
    `blind dazzle flash glare bedazzle shine gleam glint glitter sparkle radiate beam illuminate brighten
 light flare`, { conv: true }),
  V('bite', 'rapid', 'nature', 'crit:0.8', 'animal', '🦷', 'Bites and gnaws',
    `bite chew gnaw chomp devour eat consume gobble swallow nibble munch crunch gulp feast prey hunt stalk
 pounce maul sting nip snap`),
  V('grow', 'support', 'nature', 'heal:0.8', 'nature', '🌱', 'Grows and nurtures nearby towers',
    `grow bloom blossom sprout flourish thrive nurture cultivate plant sow germinate burgeon ripen mature
 flower seed graft prune water fertilize compost`, { conv: true, mods: { hp: 1.15 } }),
  V('fly', 'snipe', 'storm', '', 'sky', '🪶', 'Soars high to strike from afar',
    `fly soar glide hover float rise ascend levitate drift sail swoop wing flutter flit climb leap jump
 vault`, { mods: { range: 1.2 } }),
  V('inspire', 'support', 'light', 'buff.rate', 'morale', '📣', 'Inspires nearby towers',
    `sing inspire encourage motivate cheer embolden hearten uplift rouse stir galvanize galvanise animate
 enliven exhort urge spur incite applaud celebrate dance chant drum play`),
  V('think', 'harvest', 'arcane', 'harvest.tile', 'mind', '💭', 'Thinks up fresh letters',
    `think ponder study learn read write spell plan scheme reason deduce calculate compute solve figure
 imagine invent dream recall memorize memorise remember contemplate meditate muse reflect`),
  V('mine', 'harvest', 'earth', 'harvest.ink', 'work', '⛏', 'Works away for ink',
    `work toil labor labour farm till plow plough hoe rake reap thresh mill chop hew fell saw log drill
 dig pan forge smith craft build manufacture produce`),
V('move', 'rapid', 'storm', 'knockback:0.5', 'motion', '🏃', 'Darts about, striking fast',
    `run walk jog stride trot gallop advance roam wander travel move go come climb crawl creep sneak swim ride
     drive skip hop step pace tread stroll amble hike trek wade paddle`, { mods: { rate: 1.12 } }),
  V('help', 'support', 'light', 'heal:0.8', 'aid', '🤝', 'Lends nearby towers a helping hand',
    `help aid assist support serve save comfort console tend feed host welcome befriend protect mind
     babysit chaperone accompany`, { mods: { hp: 1.15 } }),
  V('grab', 'bolt', 'earth', 'slow:0.9 stun:0.3', 'grip', '✊', 'Grabs and holds foes',
    `grab seize grip grasp clutch catch snatch hold squeeze clasp clench capture tackle wrestle grapple
     nab collar corner trap`),
  V('speak', 'support', 'storm', 'buff.range', 'voice', '🗣', 'Calls out targets for nearby towers',
    `speak talk say tell call announce declare proclaim order command warn whisper shout yell chatter
     preach recite narrate lecture argue`),
  V('look', 'snipe', 'light', 'reveal', 'sight', '👀', 'Looks far and spots hidden foes',
    `look see watch gaze peer stare glance view regard eye peek behold squint ogle examine inspect
     study`, { mods: { range: 1.12 } }),
  V('open', 'support', 'arcane', 'buff.range:0.8', 'open', '🚪', 'Opens the way for nearby towers',
    `open unlock unseal unbar unlatch release free liberate unleash uncork unwrap unfold`),
  V('close', 'aura', 'metal', 'slow stun:0.3', 'seal', '🔐', 'Shuts in nearby foes',
    `close shut seal block latch jam plug cork wall enclose enclosed surround besiege blockade`),
  V('give', 'harvest', 'light', 'harvest.ink:0.9', 'gift', '🎁', 'Hands out ink',
    `give gift donate grant offer bestow award lend share provide supply deliver contribute tithe`),
  V('take', 'bolt', 'shadow', 'bounty', 'take', '🫳', 'Takes extra ink from fallen foes',
    `take get win gain obtain acquire claim receive capture confiscate seize grasp keep`),
  V('rest', 'support', 'water', 'heal:0.9', 'rest', '🛌', 'Rests nearby towers back to health',
    `rest relax sit lie lounge recline unwind breathe pause wait stay linger idle snooze`, { mods: { hp: 1.1 } }),
  V('play', 'support', 'arcane', 'buff.rate', 'play', '🎲', 'Plays about, quickening nearby towers',
    `play joke tease frolic romp caper juggle gamble wager bet tinker fiddle doodle`),
  V('turn', 'chain', 'storm', 'knockback:0.4', 'motion', '🌀', 'Whirls shots from foe to foe',
    `turn spin twist twirl rotate swirl swivel pivot roll wheel revolve gyrate spiral loop circle`),
];
