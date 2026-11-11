// Extra parts of speech for curated words (only applied to words already in the lexicon).
const list = (s) => s.trim().split(/\s+/);

export const POS_EXTRA = {
  verb: list(`
 ax axe saw chop hew fell log harvest plow plough hoe rake reap mill farm crop pick mine quarry shovel
 dig drill dredge hammer forge smith hone file rasp wrench screw nail glue tape rivet solder weld tinker
 fix mend patch clamp jack lever winch fish angle bait lure hook trawl net lock latch bolt key bag sack
 box can jar pot bottle crate store light lamp torch beacon rope tie knot strap string thread line
 lasso harness belt tether leash brush mop sweep scrub sponge polish bleach wash towel vacuum dust
 shelter shield armor guard knife spear lance pike harpoon skewer bow arrow gun shoot rifle
 shell bomb blast mortar rocket torpedo club cane bat stick sling whip lash flog scourge mail helm
 divine battle fight war brawl skirmish clash assault crusade raid invade campaign blitz rampage storm
 doctor nurse medic treat dose bandage plaster splint stitch suture salve dress cure remedy heal
 fire flame blaze spark flare torch brand burn heat smoke fume steam scald sweat boil bake roast
 ice frost snow hail sleet chill cold freeze thunder shock zap jolt arc spark charge current power
 wave surf flood surge swell tide water spring stream pour spray squirt tap pump drain pipe channel
 rain drizzle shower mist fog drip splash sprinkle bubble foam froth spit quake rumble tremble stomp
 sand dust mud soil ground land shine glow gleam glimmer shimmer sparkle glitter twinkle flash dazzle
 glare beam ray dawn mirror reflect shadow shade darken eclipse ambush stalk slay murder kill
 tree branch root leaf flower bloom blossom seed sprout bud plant shoot weed garden hedge vine
 wolf hound dog fox hawk crow duck goose swallow parrot bug worm fly snake badger ferret monkey ape
 cat bear bull ram horse ride saddle bridle rein shepherd herd flock rat mouse squirrel bat
 weld iron steel chrome alloy gild plate mine smelt cast glass shard splinter skin hide tan
 wizard spell charm hex jinx curse bewitch witch conjure brew ward bless pray haunt ghost spook
 crown rule reign lord command captain general marshal order lead soldier troop
 guard watch patrol escort police judge sentence arrest fence rob loot plunder pillage poach smuggle
 pirate sail anchor navigate steer row crew trade sell buy deal market shop peddle hawk broker
 study teach tutor lecture school research build construct engineer labor labour work toil hunt
 track scout spy snoop mole perform act dance sing play clown juggle cook bake brew butcher
 serve wait rescue lead govern vote counsel punch kick elbow knee hand arm finger thumb toe heel shoulder
 claw bite fang horn tusk eye eyeball gaze glance stare peek glimpse witness head face nose mouth
 voice scream shriek roar howl yell shout bellow screech wail cry holler whistle chime ring echo
 rage fear dread panic scare love hate care hug kiss embrace cuddle grieve sob mourn tear
 calm quiet silence still trick scheme plot feint bluff con ambush lie fruit date peel juice
 squash toast roll bread crumb butter cheese spice pepper salt season brine pickle sauce
 wall fort keep gate barricade house home lodge camp tent cage jail pen lock imprison chain shackle
 fetter bind cuff yoke collar trap snare net hook bait decoy spike stake pin tack nail spur
 drum beat march trumpet fanfare bugle chant sing carol serenade harmonize paint sketch draw
 sculpt photograph picture frame film pen pencil ink print press type write spell letter word
 message mail post signal broadcast note poison taint infect plague rot decay rust corrode
 slime filth dump junk ship boat ferry raft canoe paddle row sail fly jet pilot train coach
 cart truck bus bike car drive bank cash pay fee tax rent tip stock bond fund invest
 loan credit bankroll treasure hoard prize reward ransom bounty dream sleep nap doze wish time clock
 age date tick watch chime fuel oil grease tar gas gun rocket box book volume chronicle catalog
 index journal diary skate ski sled sleigh toboggan surf golf bowl box wrestle fence race jog
 sprint coach train referee cheer grow sow mow tend mother father parent nurse
 host mob crowd house man staff
 `),
  adjective: list(`
 cold hot dark light gold golden silver iron steel stone bronze copper crystal glass wooden woolen
 leaden ivory amber jade pearl ruby emerald coral royal noble elder chief major minor
 prime master expert ancient arctic polar tropical calm quiet dead live fair fine damp wet dry
 murky misty foggy rainy snowy sunny cloudy stormy windy icy frosty fiery smoky dusty muddy sandy rocky
 earthen sweet sour bitter salty spicy savory savoury rotten toxic magic mystic arcane divine holy sacred
 evil wicked brave bold proud joyful mad cross giant dwarf pygmy titanic mammoth elfin fairy
 military naval civil public private secret silent tame wild feral savage brute bestial
 orange olive lime lemon cream chocolate caramel coffee wine cherry peach plum rose violet lilac
 lavender indigo sepia coral teal navy rust tan cobalt crimson scarlet ebony khaki
 electric atomic nuclear cosmic solar lunar stellar astral spectral ghostly phantom zombie undead
 poison venom deadly lethal juvenile adult senior junior elite rogue outlaw pirate vagabond
 double single triple twin dual square round
 precious solid liquid fluid gaseous plasma static current present past future instant second
 express total universal general individual mortal immortal human divine ideal
 standard steady patient worthy faithful loyal bound
 `),
  noun: list(`
 burn freeze stab jab poke spike spear harpoon bash smack whack thump knock punch kick slap clout
 taint blight rot decay arc bounce ricochet link spread shock jolt chain relay cascade ripple branch
 fork crack splinter wreck ruin rip tear fracture rupture crumble grind delay stall snare tangle bind
 trap net hobble shackle mire clog choke push shove bump fling toss throw launch heave catapult blow
 sweep parry thrust ram butt bowl kill murder slaughter massacre strike aim target focus shot hit pick
 nail score lunge rush speed dash sprint race zoom spin whirl hustle scramble bolt dart flurry charge
 power reach stretch scope survey range search track trace sense notice spy watch scan scout glimpse
 guard shield shelter brace barricade wall screen cover cure remedy repair patch bandage nurse doctor
 fix splint stitch suture salve curse hex jinx doom charm summons flood splash spray swamp deluge
 thunder storm crackle rumble boom blast roar spark flash lightning quake tremble collapse cave
 landslide avalanche rust steal loot plunder raid swipe pinch profit trade barter bargain bank hoard
 mint harvest bleed cut slash slice gash wound hack graze scratch claw rake scrape shoot fire shell
 volley barrage spray gun salvo explode burst bomb call rally recruit muster draft spawn scare alarm
 panic menace blind flash glare shine gleam glint glitter sparkle beam light flare bite chew gnaw chomp
 feast prey hunt stalk pounce sting nip snap bloom blossom sprout plant seed graft compost fly glide
 float rise drift sail swoop wing flutter leap jump vault cheer dance chant drum play study plan scheme
 dream work toil labor labour farm plow plough hoe reap mill saw log drill forge craft build
 `),
};
