import { C } from './define.js';

export default [
  C('iron', 'bolt', 'metal', 'armorBreak', 'metal material', '⛓', 'Fires heavy iron slugs that dent armor',
    `iron steel bronze copper tin lead zinc nickel titanium tungsten chrome chromium cobalt alloy alloys
 brass pewter metal metals ingot ingots rebar aluminum aluminium magnesium manganese mercury quicksilver
 vanadium iridium osmium palladium rhodium lithium sodium potassium uranium plutonium radium bismuth
 antimony solder wire ironclad girder girders anvil scrap ironwork wrought
 cast steelwork metalwork metallurgy`, { mass: true, conv: true }),
  C('precious', 'harvest', 'light', 'harvest.ink:1.15', 'metal treasure money', '🥇', 'Mints precious metal into ink',
    `gold silver platinum bullion nugget nuggets goldmine goldsmith silversmith electrum gilt
 gilding silverware`, { mass: true, conv: true }),
  C('gems', 'snipe', 'light', 'crit:1.2', 'gem treasure light', '💎', 'Focuses light through a gem at distant foes',
    `gem gems gemstone gemstones jewel jewels jewelry jewellery diamond diamonds ruby rubies sapphire sapphires
 emerald emeralds topaz opal opals amethyst amethysts garnet garnets pearl pearls jade onyx agate agates
 quartz crystal crystals beryl turquoise amber aquamarine tourmaline zircon peridot lapis moonstone
 sunstone bloodstone jasper carnelian citrine tanzanite alexandrite jeweler jeweller `, { conv: true }),
  C('masonry', 'support', 'earth', 'shield:1.2', 'stone building', '🧱', 'Walls nearby towers in stone',
    `granite marble basalt slate limestone sandstone concrete cement brick bricks mortarboard masonry mason
 masons stonemason stonemasons bricklayer bricklayers flagstone flagstones paving pavement asphalt tarmac
 ashlar keystone cornerstone foundation foundations bedrock  stonework brickwork plaster stucco
 floor floors arch
 `),
  C('minerals', 'bolt', 'earth', 'armorBreak:0.6', 'earth mineral', '◆', 'Fires sharp mineral shards',
    `mineral minerals salt salts coal charcoal graphite chalk  saltpeter saltpetre potash mica talc
 gypsum feldspar borax calcite dolomite fluorite pyrite galena hematite magnetite bauxite
 cinnabar ore halite crystalline geode geodes fossil fossils`, { mass: true }),
  C('glass', 'rapid', 'ice', 'crit:0.7', 'glass material', '🔹', 'Sprays shards of glass',
    `glass shard shards splinter splinters sliver slivers fragment fragments glassware windowpane
 pane panes window windows porcelain ceramic ceramics china pottery icicle`, { mass: true }),
  C('leather', 'support', 'earth', 'shield:0.9', 'material animal', '🥾', 'Wraps nearby towers in tough hide',
    `leather leathers hide hides pelt pelts fur furs skin skins rawhide buckskin suede tanner tanners tannery
 furrier sheepskin cowhide pigskin deerskin parchment vellum`),
  C('rubber', 'chain', 'nature', 'knockback:0.6', 'material bounce', '🎾', 'Bounces shots from foe to foe',
    `rubber rubbers latex elastic elastics spring springs trampoline bouncer pogo rebound`),
  C('oil', 'aura', 'fire', 'slow burn:0.6', 'material fuel fire', '🛢', 'Slicks the ground with burning oil',
    `oil oils petroleum petrol gasoline diesel kerosene paraffin fuel fuels tar pitch bitumen naphtha grease
 lubricant crude oilfield refinery refineries derrick tanker tankers`, { mass: true }),
];
