import { C } from './define.js';

export default [
  C('woodcutting', 'harvest', 'nature', 'harvest.ink', 'tool wood harvest', '🪓', 'Chops timber into ink',
    `ax axe hatchet saw handsaw hacksaw bucksaw chainsaw jigsaw fretsaw billhook froe adze adz splitter
 woodcutter woodcutters woodsman woodsmen lumberjack lumberjacks logger loggers sawyer sawmill sawmills
 chopper cutter woodcutting logging lumbering sawhorse sawbuck`),
  C('mining', 'harvest', 'earth', 'harvest.ink:1.05', 'tool mine earth harvest', '⛏', 'Digs ore and trades it for ink',
    `pick pickaxe mattock miner miners mine mines quarry quarryman quarrier shovel spade dig digger
 excavator excavation drill jackhammer prospector prospecting ore ores lode collier colliery pitman
 trowel crowbar dredge dredger borehole sluice panner mining`),
  C('farming', 'harvest', 'nature', 'harvest.ink', 'farm plant harvest', '🌾', 'Reaps crops and sells them for ink',
    `farm farms farmer farmers farmhand farmland farmstead plow plough plowman ploughman hoe rake scythe sickle
 harvest harvester reaper tractor barn granary silo crop crops field fields orchard vineyard rancher ranch
 grange thresher pitchfork acre acres furrow tiller harrow combine mill miller windmill gristmill homestead
 sharecropper planter cultivator husbandry agriculture haystack hayloft hayfield cornfield paddy
 plantation croft crofter smallholder allotment greenhouse hothouse nursery seedbed`),
  C('smithing', 'support', 'metal', 'buff.damage', 'tool metal craft', '🔨', 'Hammers nearby weapons keener',
    `hammer hammers anvil forge forges blacksmith blacksmiths smith smithy whetstone grindstone sharpener tongs
 bellows armorer armourer weaponsmith swordsmith gunsmith ironmonger farrier ironworks 
 sledgehammer mallet whittler cutler cutlery hone strop file rasp`),
  C('repair', 'support', 'metal', 'heal', 'tool craft repair', '🔧', 'Patches up nearby towers',
    `wrench spanner screwdriver toolbox toolkit tool tools mechanic mechanics engineer repairman plumber welder
 solder glue tape pliers rivet rivets screw screws nail nails tinker tinkerer fixer handyman technician mender
 janitor carpenter carpenters joiner cabinetmaker wheelwright millwright cooper tinsmith locksmith upholsterer
 clamp vise vice workbench crowbar jack lever pulley winch hinge washer gasket sealant putty caulk epoxy
 cement trowel plasterer glazier roofer thatcher tiler machinist`),
  C('fishing', 'harvest', 'water', 'harvest.ink', 'water fish harvest', '🎣', 'Hauls ink up from the deep',
    `fisherman fishermen fisher fishers angler anglers angling fishing rod reel bait lure creel tackle fishery
 fishmonger trawler trawl whaler whaling dragnet fishhook fishpond oyster bed trawlerman lobsterman pearler
 netting seine`),
  C('locks', 'support', 'metal', 'shield', 'tool metal guard', '🔒', 'Locks nearby towers behind iron',
    `lock locks padlock key keys keyhole latch deadbolt vault vaults safe safes strongbox lockbox 
 combination bolthole keystone shackle turnkey jailer`),
  C('containers', 'harvest', 'earth', 'harvest.ink:0.9', 'container storage harvest', '🧺', 'Stores up spare ink',
    `bag bags sack sacks basket baskets bucket buckets barrel barrels crate crates box boxes jar jars pot pots
 bottle bottles cask casks keg kegs tub tubs bin bins pail pails urn urns vase jug jugs flask flasks pouch
 pouches satchel knapsack backpack rucksack suitcase luggage trunk trunks hamper canister carton cartons
 container containers parcel package tin tins can cans vat vats tankard pitcher decanter amphora
 coffer coffers locker cupboard pantry larder storeroom storehouse warehouse depot silo`),
  C('lighting', 'support', 'light', 'buff.range', 'light tool fire', '🏮', 'Lights the field so nearby towers see farther',
    `lamp lamps lantern lanterns candle candles candlestick candelabra chandelier torchlight lamplight lamppost
 streetlamp streetlight lightbulb bulb flashlight headlamp lampshade wick taper tallow beeswax flare flares
 beacon beacons lighthouse lighthouses searchlight floodlight spotlight limelight nightlight sconce
 brazier firelight candlelight gaslight`),
  C('ropes', 'bolt', 'nature', 'slow:1.3', 'trap rope bind', '🪢', 'Lashes ropes around foes',
    `rope ropes cord cords twine string strings line lines thread cable cables tether tethers leash leashes
 halter lariat lasso lassos noose nooses hawser rigging knot knots tie ties strap straps belt harness
 bungee lanyard ribbon ribbons yarn`),
  C('kitchen', 'bolt', 'metal', 'knockback:0.7', 'kitchen tool home', '🍳', 'Clangs foes with kitchenware',
    `pan pans skillet wok kettle ladle spatula whisk spoon spoons fork forks grater peeler colander sieve
 strainer cauldron saucepan casserole teapot teakettle griddle mortar pestle tongs corkscrew
 tureen platter plate plates bowl bowls cup cups mug mugs saucer cookware utensil utensils`),
  C('cleaning', 'support', 'water', 'heal:0.9', 'clean home water', '🧽', 'Scrubs nearby towers back to shape',
    `broom brooms mop mops soap sponge sponges brush brushes scrub scrubber detergent towel towels rag rags
 duster dustpan vacuum bleach polish laundry washer washtub washboard bathtub bath shower cleaner cleaners
 maid maids housekeeper janitorial sweeper sweep launderer laundress washerwoman`),
  C('furniture', 'support', 'earth', 'shield:0.9', 'home furniture', '🪑', 'Props up nearby towers behind sturdy furniture',
    `chair chairs table tables bed beds sofa sofas couch couches bench benches stool stools desk desks cabinet
 cabinets wardrobe wardrobes dresser dressers shelf shelves bookcase bookshelf armchair rocker cradle crib
 hammock futon ottoman footstool throne mattress pillow pillows cushion cushions blanket blankets quilt
 quilts carpet carpets rug rugs curtain curtains drape drapes mantel mantelpiece sideboard chest`),
  C('clothing', 'support', 'nature', 'shield:0.8', 'clothing home', '🧥', 'Wraps nearby towers in warm layers',
    `coat coats cloak cloaks cape capes robe robes jacket jackets vest vests shirt shirts tunic tunics hat hats
 hood hoods glove gloves mitten mittens scarf boot boots shoe shoes sandal sandals sock socks trousers pants
 skirt dress dresses gown gowns apron aprons shawl poncho sweater jumper cardigan parka anorak overcoat
 raincoat bonnet beret cap caps helmet sombrero turban veil mask masks uniform kilt toga kimono sari
 sarong waistcoat blazer tuxedo slipper slippers moccasin clog clogs`),
  C('fabric', 'support', 'nature', 'shield:0.7', 'cloth craft', '🧵', 'Pads nearby towers with soft cloth',
    `cloth silk wool cotton linen velvet satin fabric felt canvas burlap denim tweed flannel lace muslin calico
 chiffon taffeta brocade damask gingham suede fleece cashmere mohair nylon polyester rayon spandex corduroy
 tapestry weaver weavers loom looms spindle spinner seamstress tailor tailors needlework embroidery quilting
 sewing stitchery knitting crochet`, { mass: true }),
  C('machines', 'bolt', 'metal', 'crit:0.8 armorBreak:0.6', 'machine metal tech', '⚙', 'Rivets foes with clockwork bolts',
    `machine machines machinery robot robots android androids cyborg cyborgs automaton automata drone drones mech
 gear gears cog cogs cogwheel piston pistons engine engines motor motors turbine turbines gearbox crankshaft
 flywheel camshaft sprocket axle axles dynamo contraption gadget gadgets gizmo widget apparatus mechanism
 clockwork servo actuator conveyor assembly`),
  C('electronics', 'chain', 'storm', 'stun:0.6', 'tech electric machine', '💻', 'Arcs current between foes',
    `computer computers laptop laptops phone phones smartphone telephone radio radios television televisions tv
 circuit circuits wire wires wiring chip chips microchip transistor transistors processor processors modem
 router server servers satellite satellites antenna antennas antennae transmitter receiver amplifier
 speaker speakers microphone headphones keyboard monitor screen screens tablet console calculator
 internet email software hardware program programs code coder programmer hacker hackers network networks
 database byte bytes pixel pixels robotics electronic electronics gigabyte megabyte terabyte`),
  C('science', 'support', 'arcane', 'buff.range', 'science scholar', '🔬', 'Runs experiments that sharpen nearby towers\' aim',
    `lab labs laboratory laboratories experiment experiments beaker beakers flask test tube microscope
 microscopes formula formulas equation equations theory theorem hypothesis research science sciences
 scientist scientists chemistry physics biology geology astronomy element molecule molecules compound
 reagent catalyst specimen specimens centrifuge burette pipette crucible retort alembic`),
  C('magnet', 'aura', 'metal', 'slow:1.2', 'metal science force', '🧲', 'Drags nearby foes toward its iron pull',
    `magnet magnets magnetism magnetic lodestone electromagnet gravity gravitation attraction compass compasses
 polarity tractor ballast anchor anchors sinker plumb plummet weight weights counterweight`),
  C('sports', 'bolt', 'earth', 'knockback', 'sport game', '⚽', 'Pelts foes with balls',
    `ball balls football footballs baseball baseballs basketball soccer tennis golf hockey puck racket racquet
 volleyball handball dodgeball softball rugby polo lacrosse bowling bowler pitcher batter striker goalie
 shuttlecock frisbee javelin discus cricketer quarterback linebacker `),
  C('athletes', 'support', 'storm', 'buff.rate', 'sport person', '🏅', 'Coaches nearby towers into a faster rhythm',
    `athlete athletes coach coaches trainer trainers sprinter sprinters runner runners jogger marathoner racer
 racers champion champions captain referee umpire cheerleader mascot gymnast gymnasts acrobat acrobats
 wrestler wrestlers boxer boxers fencer fencers skier skater surfer swimmer cyclist jockey olympian
 teammate teammates coxswain`),
  C('toys', 'rapid', 'arcane', 'bounty:0.6', 'toy game play', '🎲', 'Flings toys and trinkets',
    `toy toys doll dolls puppet puppets yoyo marble marbles dice die domino dominoes jigsaw kite kites balloon
 balloons rattle teddy pinwheel slinky spinner whirligig jacks top tops bauble baubles trinket trinkets
 knickknack gewgaw plaything playthings beanbag pogo kaleidoscope`),
  C('games', 'support', 'arcane', 'buff.range:0.9', 'game play mind', '♟', 'Plans moves that extend nearby towers\' reach',
    `chess checkers draughts pawn pawns rook rooks gambit checkmate stalemate board boards card cards deck
 decks ace aces joker jokers trump poker bridge solitaire puzzle puzzles riddle riddles crossword scrabble
 backgammon mahjong game games gamers player players tournament strategy tactic tactics`),
];
