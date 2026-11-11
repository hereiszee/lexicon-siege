import { C } from './define.js';

export default [
  C('forts', 'support', 'earth', 'shield:1.2', 'building fort defense', '🏰', 'Fortifies nearby towers',
    `wall walls fort forts fortress fortresses castle castles citadel citadels keep keeps stronghold
 strongholds bastion bastions rampart ramparts bunker bunkers barricade barricades palisade palisades
 stockade stockades parapet parapets battlement battlements gate gates gatehouse portcullis drawbridge
 fortification fortifications outpost outposts blockhouse redoubt donjon motte bailey earthwork
 earthworks trench trenches dugout foxhole pillbox embankment levee dike dyke seawall breastwork
 defense defence defenses defences fortitude
 fence`, { stat: { hp: 1.3 } }),
  C('moat', 'aura', 'water', 'slow:1.3', 'building water defense', '〰', 'Bogs down foes in a ring of water',
    `moat moats ditch ditches ford fords millpond`),
  C('turrets', 'bolt', 'metal', 'pierce:0.7', 'building tower', '🗼', 'Fires from a fortified perch',
    `turret turrets tower towers minaret minarets spire spires belfry belfries steeple steeples battlement
 barbican bartizan pinnacle obelisk obelisks column columns pillar pillars skyscraper skyscrapers`),
  C('watchtowers', 'snipe', 'light', 'reveal', 'building sight', '🔭', 'Spots and shoots distant foes',
    `watchtower watchtowers overlook overlooks vantage 
 outlook outlooks viewpoint lookout
 `),
  C('homes', 'harvest', 'earth', 'harvest.ink', 'building home', '🏠', 'Collects rent in ink',
    `house houses home homes cottage cottages cabin cabins hut huts shack shacks hovel hovels lodge lodges manor
 manors mansion mansions villa villas palace palaces estate estates farmhouse farmhouses inn inns tavern
 taverns pub pubs hostel hostels hotel hotels motel motels apartment apartments flat condo bungalow
 chalet chateau igloo igloos tent tents tepee wigwam yurt hall halls dwelling dwellings abode
 residence residences household households homestead room rooms bedroom kitchen attic cellar basement
 garage porch roof roofs chimney door doors doorway
 stair stairs shed`),
  C('cities', 'summon', 'earth', 'summon.horde', 'building city', '🏙', 'Musters the townsfolk onto the path',
    `town towns city cities village villages hamlet hamlets metropolis capital capitals borough
 boroughs suburb suburbs township townships municipality settlement settlements colony province
 provinces county counties district districts neighborhood neighbourhood downtown uptown street streets
 avenue avenues boulevard square plaza plazas marketplace kingdom citadel`),
  C('temples', 'support', 'light', 'heal:1.1', 'building holy', '⛪', 'Sanctifies and heals nearby towers',
    `temples church churches chapel chapels cathedral cathedrals shrine shrines abbey abbeys monastery
 monasteries convent convents mosque mosques synagogue synagogues altar altars basilica pagoda pagodas
 sanctuaries tabernacle sanctum oratory priory parish parishes cloister cloisters ziggurat pyramid
 pyramids
 incense
 `),
  C('workshops', 'harvest', 'metal', 'harvest.ink:1.05', 'building industry', '🏭', 'Manufactures goods for ink',
    `factory factories workshop workshops mill mills foundry plant refinery warehouse warehouses depot depots
 shipyard shipyards dockyard dock docks wharf wharves port ports harbor industry industries manufacture
 manufacturing sawmill brewery distillery tannery mint mints
 smelter forge studio studios office offices`),
  C('libraries', 'harvest', 'arcane', 'harvest.tile:1.15', 'building book scholar', '🏛', 'Lends you fresh letters',
    `library libraries archive archives museum museums bookshop bookstore bookstores scriptorium athenaeum
 reading room schoolhouse `),
  C('prisons', 'aura', 'shadow', 'slow:1.2 stun:0.5', 'building prison', '⛓', 'Locks down nearby foes',
    `prison prisons jail jails gaol gaols dungeon dungeons cell cells cage cages stocks pillory
 brig penitentiary oubliette lockup lockups jailhouse captivity imprisonment detention confinement
 custody prisoner prisoners captive captives hostage hostages convict convicts inmate inmates`),
  C('roads', 'support', 'earth', 'buff.range:0.9', 'building travel', '🛣', 'Paves the way for nearby towers to reach farther',
    `road roads path paths trail trails track tracks highway highways freeway lane lanes alley alleys bridge
 bridges tunnel causeway route routes way ways passage passages corridor corridors crossroads junction
 railway railways railroad railroads footpath sidewalk pavement
 map maps chart
 `),
];
