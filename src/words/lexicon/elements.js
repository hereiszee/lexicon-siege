import { C } from './define.js';

const E = { conv: true };

export default [
  // ---------------------------------------------------------------- fire
  C('fire', 'bolt', 'fire', 'burn', 'fire heat', '🔥', 'Hurls gouts of fire',
    `fire fires flame flames blaze blazes ember embers cinder cinders spark sparks flare firebolt fireball
 fireballs bonfire bonfires campfire campfires hellfire balefire firebrand brand pyre pyres torch torches
 flambeau ignition combustion kindling tinder firelighter matchstick match matches lighter lighters flint
 tinderbox pyro pyromancer firestarter arsonist arson  firedrake firebird salamander wildfire`, E),
  C('inferno', 'blast', 'fire', 'burn splash', 'fire heat disaster', '☄', 'Engulfs the path in roaring fire',
    `inferno infernos firestorm firestorms conflagration conflagrations holocaust   firebomb
 firebombs        firewall hellstorm brimstone
 sulfur sulphur armageddon apocalypse cataclysm
 calamity devastation catastrophe`, E),
  C('lava', 'aura', 'fire', 'burn:1.2', 'fire volcano earth', '🌋', 'Pools molten rock around itself',
    `lava magma   caldera crater craters  fumarole cinder cone
 obsidian pumice slag molten smelter smelting furnace furnaces foundry crucible`, { ...E, stat: { range: 0.9 } }),
  C('heat', 'aura', 'fire', 'burn:0.8', 'fire heat', '♨', 'Radiates searing heat',
    `heat warmth hotness oven ovens kiln kilns stove stoves hearth hearths fireplace fireplaces brazier braziers
 boiler boilers radiator radiators sauna saunas heater heaters steam steamer scald sweat sweltering
 summer summers summertime noon midday desert deserts sunstroke drought droughts
 fever greenhouse incubator thermostat thermal
 kettle`, E),
  C('ash', 'aura', 'fire', 'burn:0.7 slow:0.6', 'fire smoke', '🌫', 'Scatters smouldering ash over nearby foes',
    `ash ashes soot ashpit`, { ...E, mass: true }),
  C('smoke', 'aura', 'shadow', 'slow poison:0.5', 'fire smoke gas', '💨', 'Billows choking smoke',
    `smoke smokes smog  fumes fume vapor vapour vapors miasma reek stench stink haze smolder smoulder
   smokestack chimney chimneys exhaust gas gases `),
  // ---------------------------------------------------------------- ice
  C('frost', 'bolt', 'ice', 'slow freeze:0.6', 'ice cold', '❄', 'Flings shards of frost',
    `ice ices frost frosts frostbite snow snows snowflake snowflakes     
  icicle icicles rime hoarfrost chill chills cold colds coldness winter winters wintertime
       permafrost tundra tundras 
   slushy icepick`, E),
  C('blizzard', 'aura', 'ice', 'slow freeze:0.8', 'ice cold storm weather', '🌨', 'Buries nearby foes in a whiteout',
    `blizzard blizzards snowstorm snowstorms whiteout flurry flurries icestorm  
 polar arctic antarctic yeti yetis sasquatch wendigo
 freezer freezers refrigerator fridge icebox cooler snowfall`, E),
  C('glacier', 'blast', 'ice', 'slow freeze', 'ice cold earth', '🧊', 'Drops crushing slabs of ice',
    `      icefield   
  icefall serac   snowslide
 `, E),
  // ---------------------------------------------------------------- storm
  C('lightning', 'chain', 'storm', 'stun', 'storm lightning electric', '⚡', 'Calls lightning that leaps foe to foe',
    `lightning lightnings thunderbolt thunderbolts     thunderstorm
 thunderstorms electricity voltage volt volts zap zaps shock shocks taser tasers dynamo dynamos generator
 generators battery current currents plasma arc arcs discharge static spark fulmination
 thunderhead jolt jolts electrode electrodes conductor capacitor coil coils
 powerline powerlines
 
 `, E),
  C('storm', 'aura', 'storm', 'stun:0.7 knockback:0.6', 'storm weather', '⛈', 'Lashes nearby foes with a howling storm',
    `storm storms tempest tempests squall squalls gale gales   windstorm
 windstorms rainstorm rainstorms sandstorm sandstorms thunderhead weather turbulence`, E),
  C('wind', 'rapid', 'storm', 'knockback', 'storm wind air', '🌪', 'Hurls blasts of wind',
    `wind winds gust gusts breeze breezes     hurricane hurricanes typhoon
 typhoons     monsoon monsoons draft drafts draught zephyr zephyrs
 sirocco mistral jetstream     air airs updraft downdraft
 crosswind headwind tailwind gale breath blowhole bellows    windmill windsock
 vane weathercock`, E),
  C('sky', 'snipe', 'storm', 'reveal', 'sky air', '☁', 'Strikes from high above',
    `sky skies heaven heavens firmament stratosphere atmosphere horizon horizons zenith skyline welkin ether
 aether altitude cloud clouds cumulus cirrus stratus nimbus overcast airspace
 empyrean meridian`, E),
  // ---------------------------------------------------------------- water
  C('wave', 'blast', 'water', 'knockback', 'water sea', '🌊', 'Crashes waves into the path',
    `wave waves tide tides tsunami tsunamis surf breaker breakers swell swells surge surges flood floods deluge
 deluges torrent torrents billow billows    whitecap whitecaps 
 floodwater inundation spillway  wake`, E),
  C('river', 'beam', 'water', 'slow:0.8', 'water river', '💧', 'Pours a steady jet of water',
    `water waters river rivers stream streams brook brooks creek creeks rivulet rivulets  
 spring springs waterfall waterfalls cascade cascades   hose hoses spray sprays sprinkler
 sprinklers squirt faucet faucets tap taps spigot nozzle aqueduct canal canals channel channels gutter
 gutters   pipe pipes plumbing irrigation watercourse estuary delta tributary rapids watershed
 wellspring cistern reservoir   pump pumps hydrant
 well oasis viaduct`, E),
  C('sea', 'aura', 'water', 'slow', 'water sea', '🌊', 'Drowns nearby foes in deep water',
    `sea seas ocean oceans lake lakes pond ponds lagoon lagoons bay bays gulf gulfs harbor harbour harbors
 marsh marshes swamp swamps bog bogs fen fens mire wetland wetlands    depths deep
 shallows shoal shoals reef reefs seabed seafloor seawater saltwater freshwater brine ocean seashore
 shore shores beach beaches coast coasts coastline tidepool fjord fjords sound strait straits loch
 fathom`, E),
  C('rain', 'aura', 'water', 'slow:0.8', 'water weather', '🌧', 'Showers nearby foes with cold rain',
    `rain rains rainfall raindrop raindrops drizzle drizzles   shower showers 
 fog fogs mist mists dew dewdrop humidity damp drip drips   splash splashes sprinkle
 sprinkles droplet droplets rainwater rainstorm wet wetness moisture condensation precipitation
 umbrella umbrellas raincloud
 `, E),
  C('ice-water', 'bolt', 'water', 'slow:0.6', 'water', '💦', 'Spits jets of water',
    `bubble bubbles foam froth spume   spittle spit drool liquid
 liquids fluid fluids `, E),
  // ---------------------------------------------------------------- earth
  C('boulder', 'blast', 'earth', 'knockback stun:0.6', 'earth stone', '🪨', 'Hurls boulders that bowl foes over',
    `  rock rocks        stone
 stones        dolmen cairn cairns crag crags
 outcrop bedrock`, E),
  C('quake', 'pulse', 'earth', 'stun', 'earth disaster', '〽', 'Sends tremors through the ground under every foe in range',
    `earthquake earthquakes quake quakes tremor tremors seismic rumble rumbles shockwave shockwaves
 aftershock aftershocks upheaval upheavals fault faults rift rifts fissure fissures   
  epicenter stomp stampede`, E),
  C('sand', 'aura', 'earth', 'slow', 'earth sand', '⏳', 'Clogs nearby foes with sand and dust',
    `sand sands dust dusts dune dunes dirt soil soils mud muds mire sludge silt clay clays loam quicksand
 grit gravel topsoil humus peat earth earths ground grounds terrain land lands turf sod clod clods
 dustbowl sandbank sandbar sandpit mudflat mudflats mudhole`, E),
  C('mountain', 'snipe', 'earth', 'knockback:0.6', 'earth mountain', '⛰', 'Hurls stones down from the heights',
    `mountain mountains peak peaks summit summits hill hills cliff cliffs ridge ridges mesa mesas butte buttes
 canyon canyons gorge gorges ravine ravines valley valleys plateau plateaus highland highlands range
 ranges massif alp alps bluff bluffs escarpment precipice crest knoll knolls hillside mountainside
 foothill foothills slope slopes volcanic tor fell
 ledge`, E),
  C('pebble', 'rapid', 'earth', 'stun:0.4', 'earth stone', '•', 'Pelts foes with pebbles',
    `pebble pebbles shingle cobble cobbles   scree rubble debris chip pellet gravelstone
 rocklet grapestone hailshot buckstone gravels`, E),
  C('cave', 'support', 'earth', 'shield:1.1', 'earth cave', '🕳', 'Shelters nearby towers in rock',
    `cave caves cavern caverns grotto grottos grottoes den dens lair lairs burrow burrows tunnel tunnels
 underground catacomb catacombs   hollow hollows  stalactite stalactites stalagmite
 stalagmites spelunker spelunking`, E),
  // ---------------------------------------------------------------- light
  C('sunbeam', 'beam', 'light', 'reveal burn:0.4', 'light sun', '☀', 'Focuses a burning beam of sunlight',
    `sun suns sunbeam sunbeams beam beams ray rays laser lasers sunlight sunshine daylight moonbeam moonbeams
 sunray sunrays ray sunspot `, E),
  C('radiance', 'aura', 'light', 'reveal stun:0.4', 'light', '✦', 'Shines on every nearby foe',
    `light lights radiance glow glows gleam gleams glimmer glimmers shimmer shimmers shine sparkle sparkles
 glitter twinkle twinkles aurora auroras   luster brilliance splendor splendour dazzle
 glare flash flashes illumination luminance luminosity incandescence phosphorescence glint glints
 shimmering lumen lux photon photons
 awe`, E),
  C('dawn', 'bolt', 'light', 'reveal crit:0.6', 'light time', '🌅', 'Fires bolts of morning light',
    `dawn dawns daybreak sunrise sunrises sunup morning mornings day days daytime dayspring aurora noonday
 forenoon cockcrow
 awakening`, E),
  C('prism', 'chain', 'light', 'crit:0.5', 'light color', '🌈', 'Splits light into beams that bounce between foes',
    `prism prisms spectrum spectra kaleidoscope refraction reflection mirror mirrors lens lenses
 glass rainbow rainbows iridescence opalescence hologram holograms facet facets periscope
 `, E),
  C('stars', 'snipe', 'light', 'crit', 'light cosmos star', '⭐', 'Rains starlight on distant foes',
    `star stars starlight   starshine constellation constellations galaxy galaxies nebula
 nebulae cosmos universe universes quasar quasars        
 moonlight moonlit     astral celestial heavenly starship spaceship
 spacecraft astronaut astronauts cosmonaut telescope telescopes observatory observatories
 astronomer astronomers astrologer  eclipse
 crescent gibbous zodiac horoscope astrolabe sextant parallax`, E),
  // ---------------------------------------------------------------- shadow
  C('shadow', 'bolt', 'shadow', 'execute:0.8', 'shadow dark', '☾', 'Strikes from the shadows',
    `shadow shadows shade shades darkness dark gloom gloominess murk murkiness dusk dusks twilight twilights
 nightfall night nights midnight midnights eclipse eclipses umbra penumbra obscurity blackness pitch
 nighttime evening evenings sundown sunset sunsets gloaming  silhouette`, E),
  C('void', 'aura', 'shadow', 'slow execute:0.5', 'shadow void', '⚫', 'Drains nearby foes into the void',
    `    oblivion nothingness emptiness   nether netherworld
 underworld limbo purgatory hell hells hades inferno tartarus chaos entropy
 perdition extinction
 `, E),
  C('stealth', 'snipe', 'shadow', 'execute crit:0.8', 'shadow stealth killer', '🗡', 'Assassinates foes from hiding',
    `assassin assassins ninja ninjas shinobi cutthroat cutthroats killer killers murderer murderers slayer
 slayers executioner executioners hitman hitmen stalker stalkers    
 sniper strangler garrote garrotte poisoner silencer`, E),
];
