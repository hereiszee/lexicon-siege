// The 1000 level words, as 100 chapters of 10. Level n uses LEVEL_WORDS[n - 1].
// The 10th word of every chapter is that chapter's boss level.
// Every word is lowercase a–z and present in /usr/share/dict/words (checked by tests).

export const CHAPTERS = [
  { theme: 'Hearth', words: ['ash', 'coal', 'ember', 'spark', 'glow', 'smoke', 'flame', 'kindle', 'cinder', 'blaze'] },
  { theme: 'Meadow', words: ['dew', 'seed', 'moss', 'fern', 'bloom', 'clover', 'petal', 'honey', 'thistle', 'bramble'] },
  { theme: 'Brook', words: ['rain', 'pond', 'reed', 'brook', 'ripple', 'otter', 'stream', 'willow', 'marsh', 'flood'] },
  { theme: 'Hills', words: ['stone', 'pebble', 'hill', 'cairn', 'slope', 'burrow', 'badger', 'ridge', 'gravel', 'boulder'] },
  { theme: 'Farmstead', words: ['barn', 'hay', 'plow', 'goat', 'wheat', 'mill', 'fence', 'orchard', 'harvest', 'scarecrow'] },
  { theme: 'Village', words: ['bell', 'inn', 'well', 'lane', 'lantern', 'cobble', 'market', 'baker', 'chapel', 'belfry'] },
  { theme: 'Forest', words: ['oak', 'pine', 'root', 'bark', 'acorn', 'grove', 'thicket', 'timber', 'hollow', 'greenwood'] },
  { theme: 'Night', words: ['dusk', 'moon', 'star', 'owl', 'gloom', 'hush', 'shadow', 'twilight', 'midnight', 'nightfall'] },
  { theme: 'Storm', words: ['gust', 'gale', 'hail', 'wind', 'cloud', 'squall', 'thunder', 'lightning', 'cyclone', 'tempest'] },
  { theme: 'Forge', words: ['iron', 'tin', 'smith', 'tongs', 'anvil', 'steel', 'ingot', 'hammer', 'bellows', 'forge'] },

  { theme: 'Sea', words: ['wave', 'tide', 'salt', 'shell', 'coral', 'foam', 'gull', 'harbor', 'anchor', 'shipwreck'] },
  { theme: 'Winter', words: ['snow', 'ice', 'frost', 'sleet', 'chill', 'icicle', 'drift', 'tundra', 'glacier', 'blizzard'] },
  { theme: 'Castle', words: ['gate', 'moat', 'wall', 'keep', 'tower', 'turret', 'rampart', 'bastion', 'portcullis', 'citadel'] },
  { theme: 'Garden', words: ['rose', 'ivy', 'lily', 'hedge', 'tulip', 'orchid', 'arbor', 'nettle', 'trellis', 'foxglove'] },
  { theme: 'Hive', words: ['bee', 'ant', 'moth', 'wasp', 'beetle', 'cricket', 'hornet', 'mantis', 'locust', 'swarm'] },
  { theme: 'Desert', words: ['sand', 'dune', 'camel', 'oasis', 'yucca', 'nomad', 'mirage', 'scorpion', 'sirocco', 'sandstorm'] },
  { theme: 'Mountain', words: ['peak', 'cliff', 'ledge', 'eagle', 'summit', 'chasm', 'pinnacle', 'crevasse', 'precipice', 'avalanche'] },
  { theme: 'Kitchen', words: ['oven', 'bread', 'dough', 'yeast', 'flour', 'ladle', 'kettle', 'pepper', 'caldron', 'banquet'] },
  { theme: 'Library', words: ['ink', 'page', 'quill', 'scroll', 'tome', 'verse', 'fable', 'riddle', 'chronicle', 'manuscript'] },
  { theme: 'Dragons', words: ['scale', 'claw', 'fang', 'wing', 'talon', 'hoard', 'drake', 'serpent', 'firedrake', 'dragon'] },

  { theme: 'Swamp', words: ['bog', 'fen', 'mire', 'toad', 'newt', 'leech', 'heron', 'quagmire', 'miasma', 'bogeyman'] },
  { theme: 'Autumn', words: ['leaf', 'maple', 'gourd', 'russet', 'cider', 'chestnut', 'pumpkin', 'equinox', 'bonfire', 'autumn'] },
  { theme: 'Clockwork', words: ['cog', 'gear', 'lever', 'spring', 'piston', 'ratchet', 'sprocket', 'pendulum', 'clockwork', 'automaton'] },
  { theme: 'Sky', words: ['sky', 'kite', 'lark', 'breeze', 'falcon', 'swallow', 'horizon', 'zenith', 'aurora', 'firmament'] },
  { theme: 'Caverns', words: ['bat', 'cave', 'echo', 'lair', 'grotto', 'cavern', 'troll', 'crystal', 'stalactite', 'abyss'] },
  { theme: 'Music', words: ['drum', 'harp', 'lute', 'flute', 'chord', 'ballad', 'cymbal', 'anthem', 'trumpet', 'symphony'] },
  { theme: 'Knights', words: ['helm', 'lance', 'sword', 'shield', 'squire', 'joust', 'valor', 'knight', 'crusade', 'paladin'] },
  { theme: 'Springtide', words: ['bud', 'nest', 'lamb', 'robin', 'sprout', 'catkin', 'blossom', 'daffodil', 'rainbow', 'awakening'] },
  { theme: 'Alchemy', words: ['vial', 'flask', 'potion', 'sulphur', 'elixir', 'mercury', 'retort', 'alembic', 'crucible', 'transmutation'] },
  { theme: 'Giants', words: ['ogre', 'giant', 'brute', 'cudgel', 'stomp', 'mammoth', 'hulk', 'giantess', 'colossus', 'behemoth'] },

  { theme: 'Ships', words: ['oar', 'sail', 'mast', 'keel', 'rudder', 'compass', 'frigate', 'galleon', 'lighthouse', 'armada'] },
  { theme: 'Hauntings', words: ['wisp', 'ghost', 'haunt', 'spook', 'wraith', 'specter', 'phantom', 'banshee', 'apparition', 'poltergeist'] },
  { theme: 'Jungle', words: ['vine', 'fig', 'parrot', 'canopy', 'jaguar', 'python', 'toucan', 'monsoon', 'mangrove', 'jungle'] },
  { theme: 'Volcano', words: ['lava', 'crater', 'magma', 'pumice', 'basalt', 'geyser', 'obsidian', 'fumarole', 'eruption', 'inferno'] },
  { theme: 'Bazaar', words: ['coin', 'silk', 'spice', 'barter', 'ledger', 'bazaar', 'merchant', 'caravan', 'treasury', 'emporium'] },
  { theme: 'Cosmos', words: ['comet', 'orbit', 'meteor', 'planet', 'nebula', 'asteroid', 'starlight', 'galaxy', 'constellation', 'supernova'] },
  { theme: 'The Hunt', words: ['fox', 'wolf', 'howl', 'hound', 'lynx', 'prowl', 'stalk', 'huntress', 'predator', 'werewolf'] },
  { theme: 'Loom', words: ['yarn', 'wool', 'loom', 'thread', 'needle', 'spindle', 'weave', 'quilt', 'tapestry', 'embroidery'] },
  { theme: 'Radiance', words: ['glint', 'gleam', 'halo', 'lens', 'prism', 'mirror', 'beacon', 'luster', 'radiance', 'sunburst'] },
  { theme: 'Siegeworks', words: ['ram', 'sling', 'arrow', 'crossbow', 'ballista', 'mangonel', 'catapult', 'trebuchet', 'bombard', 'onslaught'] },

  { theme: 'Arctic', words: ['seal', 'floe', 'husky', 'igloo', 'polar', 'walrus', 'ermine', 'narwhal', 'iceberg', 'frostbite'] },
  { theme: 'Tavern', words: ['ale', 'keg', 'mead', 'dice', 'bard', 'barrel', 'tankard', 'minstrel', 'revelry', 'brawl'] },
  { theme: 'Deep Earth', words: ['clay', 'loam', 'soil', 'mole', 'worm', 'furrow', 'bedrock', 'quarry', 'tremor', 'earthquake'] },
  { theme: 'Shrine', words: ['monk', 'idol', 'relic', 'altar', 'candle', 'incense', 'shrine', 'pilgrim', 'sanctum', 'cathedral'] },
  { theme: 'Rivers', words: ['ford', 'ferry', 'delta', 'bridge', 'levee', 'shallows', 'estuary', 'cascade', 'waterfall', 'deluge'] },
  { theme: 'Carnival', words: ['mask', 'jester', 'parade', 'juggler', 'costume', 'fanfare', 'acrobat', 'harlequin', 'carnival', 'masquerade'] },
  { theme: 'Venom', words: ['adder', 'viper', 'cobra', 'venom', 'toxin', 'spider', 'hemlock', 'tarantula', 'nightshade', 'basilisk'] },
  { theme: 'Orchard', words: ['pear', 'plum', 'apple', 'peach', 'cherry', 'quince', 'apricot', 'vineyard', 'mulberry', 'cornucopia'] },
  { theme: 'Battlefield', words: ['flag', 'bugle', 'banner', 'trench', 'legion', 'cavalry', 'phalanx', 'vanguard', 'skirmish', 'warmonger'] },
  { theme: 'Phoenix', words: ['plume', 'pyre', 'scarlet', 'feather', 'rebirth', 'ascend', 'firebird', 'solstice', 'resurrection', 'phoenix'] },

  { theme: 'The Deep', words: ['eel', 'squid', 'angler', 'pearl', 'barnacle', 'octopus', 'jellyfish', 'nautilus', 'fathom', 'kraken'] },
  { theme: 'Rogues', words: ['rogue', 'thief', 'cloak', 'dagger', 'bandit', 'sneak', 'burglar', 'smuggler', 'brigand', 'assassin'] },
  { theme: 'Lotus Garden', words: ['jade', 'koi', 'lotus', 'crane', 'bamboo', 'pagoda', 'panda', 'bonsai', 'dragonfly', 'typhoon'] },
  { theme: 'Ruins', words: ['ruin', 'tomb', 'crypt', 'rubble', 'pillar', 'column', 'obelisk', 'catacomb', 'mausoleum', 'necropolis'] },
  { theme: 'Updraft', words: ['vane', 'glider', 'kestrel', 'zephyr', 'balloon', 'weathercock', 'windmill', 'updraft', 'whirlwind', 'hurricane'] },
  { theme: 'Moonlight', words: ['silver', 'lunar', 'crescent', 'moonbeam', 'gibbous', 'moonstone', 'moonrise', 'lunacy', 'nocturne', 'moonlight'] },
  { theme: 'Engineers', words: ['rivet', 'pulley', 'girder', 'arch', 'keystone', 'scaffold', 'buttress', 'viaduct', 'aqueduct', 'juggernaut'] },
  { theme: 'Eclipse', words: ['shade', 'murk', 'shroud', 'umbra', 'gloaming', 'penumbra', 'darkling', 'nether', 'oblivion', 'eclipse'] },
  { theme: 'Archery', words: ['bow', 'quiver', 'fletch', 'archer', 'target', 'longbow', 'volley', 'marksman', 'huntsman', 'deadeye'] },
  { theme: 'Lightning', words: ['volt', 'arc', 'ion', 'surge', 'dynamo', 'voltage', 'conductor', 'capacitor', 'electricity', 'thunderbolt'] },

  { theme: 'Fungi', words: ['mold', 'spore', 'morel', 'lichen', 'truffle', 'puffball', 'mushroom', 'toadstool', 'mycelium', 'fungus'] },
  { theme: 'Gemstones', words: ['gem', 'opal', 'ruby', 'shard', 'quartz', 'facet', 'emerald', 'sapphire', 'amethyst', 'diamond'] },
  { theme: 'Wild Beasts', words: ['elk', 'boar', 'bear', 'stag', 'moose', 'bison', 'antler', 'grizzly', 'buffalo', 'stampede'] },
  { theme: 'Labyrinth', words: ['maze', 'path', 'knot', 'puzzle', 'cipher', 'corridor', 'enigma', 'paradox', 'conundrum', 'labyrinth'] },
  { theme: 'Mists', words: ['fog', 'mist', 'haze', 'vapor', 'drizzle', 'nimbus', 'cirrus', 'cumulus', 'overcast', 'thunderhead'] },
  { theme: 'Apothecary', words: ['mint', 'sage', 'thyme', 'basil', 'fennel', 'salve', 'tonic', 'remedy', 'poultice', 'panacea'] },
  { theme: 'Pirates', words: ['rum', 'plank', 'cutlass', 'plunder', 'doubloon', 'corsair', 'mutiny', 'buccaneer', 'privateer', 'marauder'] },
  { theme: 'Frozen Realm', words: ['rime', 'glaze', 'frozen', 'sleigh', 'glacial', 'snowfall', 'snowdrift', 'hoarfrost', 'icebound', 'permafrost'] },
  { theme: 'Spellcraft', words: ['rune', 'wand', 'spell', 'glyph', 'sigil', 'charm', 'hex', 'necromancy', 'sorcery', 'incantation'] },
  { theme: 'Throne', words: ['crown', 'court', 'throne', 'herald', 'scepter', 'regent', 'monarch', 'dynasty', 'empire', 'sovereign'] },

  { theme: 'Wasteland', words: ['dust', 'rust', 'husk', 'scrap', 'wreck', 'barren', 'scorch', 'drought', 'desolation', 'wasteland'] },
  { theme: 'Hourglass', words: ['hour', 'dial', 'tick', 'epoch', 'sundial', 'calendar', 'hourglass', 'century', 'chronometer', 'millennium'] },
  { theme: 'Reef', words: ['clam', 'reef', 'shark', 'urchin', 'lagoon', 'starfish', 'dolphin', 'anemone', 'barracuda', 'hammerhead'] },
  { theme: 'Heraldry', words: ['crest', 'lion', 'motto', 'emblem', 'pennant', 'blazon', 'griffin', 'unicorn', 'tabard', 'heraldry'] },
  { theme: 'Underworld', words: ['imp', 'pit', 'ghoul', 'fiend', 'demon', 'gargoyle', 'brimstone', 'hellhound', 'perdition', 'underworld'] },
  { theme: 'Steamworks', words: ['steam', 'valve', 'gauge', 'boiler', 'engine', 'turbine', 'foundry', 'smokestack', 'locomotive', 'ironclad'] },
  { theme: 'Birds of Prey', words: ['wren', 'crow', 'finch', 'raven', 'hawk', 'sparrow', 'osprey', 'vulture', 'albatross', 'condor'] },
  { theme: 'Dreams', words: ['nap', 'doze', 'dream', 'lullaby', 'slumber', 'reverie', 'daydream', 'phantasm', 'somnambulist', 'nightmare'] },
  { theme: 'Armory', words: ['axe', 'pike', 'mace', 'spear', 'flail', 'glaive', 'halberd', 'scimitar', 'broadsword', 'arsenal'] },
  { theme: 'Leviathan', words: ['swell', 'brine', 'undertow', 'breaker', 'tidal', 'whirlpool', 'waterspout', 'tsunami', 'abyssal', 'leviathan'] },

  { theme: 'Plague', words: ['rot', 'pox', 'decay', 'fester', 'blight', 'carrion', 'plague', 'contagion', 'pestilence', 'scourge'] },
  { theme: 'Celestial', words: ['choir', 'angel', 'cherub', 'seraph', 'grace', 'hymn', 'celestial', 'heavenly', 'archangel', 'empyrean'] },
  { theme: 'Sands of Kings', words: ['scarab', 'mummy', 'papyrus', 'jackal', 'sepulcher', 'embalm', 'pyramid', 'hieroglyph', 'sarcophagus', 'sphinx'] },
  { theme: 'Constructs', words: ['marble', 'granite', 'statue', 'effigy', 'golem', 'sentinel', 'guardian', 'construct', 'monolith', 'megalith'] },
  { theme: 'Witchcraft', words: ['broom', 'witch', 'omen', 'curse', 'sabbat', 'familiar', 'warlock', 'sorceress', 'witchcraft', 'mandrake'] },
  { theme: 'Wanderers', words: ['map', 'road', 'trail', 'rover', 'journey', 'voyage', 'wanderer', 'wayfarer', 'vagabond', 'expedition'] },
  { theme: 'Myth', words: ['nymph', 'satyr', 'dryad', 'kelpie', 'siren', 'centaur', 'hippogriff', 'cockatrice', 'manticore', 'chimera'] },
  { theme: 'Observatory', words: ['chart', 'almanac', 'sextant', 'meridian', 'zodiac', 'parallax', 'astrolabe', 'telescope', 'horoscope', 'observatory'] },
  { theme: 'Wildfire', words: ['char', 'singe', 'torch', 'flare', 'brand', 'smolder', 'ignite', 'wildfire', 'fireball', 'conflagration'] },
  { theme: 'Dark Lord', words: ['dread', 'doom', 'tyrant', 'despot', 'usurper', 'tyranny', 'overlord', 'dominion', 'tormentor', 'doomsday'] },

  { theme: 'Wonders', words: ['marvel', 'wonder', 'awe', 'glory', 'miracle', 'splendor', 'majesty', 'revelation', 'rapture', 'transcendence'] },
  { theme: 'Primordial', words: ['flux', 'ether', 'chaos', 'origin', 'primal', 'primeval', 'entropy', 'genesis', 'cosmos', 'primordial'] },
  { theme: 'Legends', words: ['hero', 'saga', 'myth', 'epic', 'legend', 'valiant', 'gallant', 'champion', 'triumph', 'conqueror'] },
  { theme: 'Fortress', words: ['spire', 'bulwark', 'parapet', 'garrison', 'palisade', 'battlement', 'stronghold', 'fortress', 'barbican', 'fortification'] },
  { theme: 'Eldritch', words: ['whisper', 'horror', 'madness', 'tentacle', 'eldritch', 'insanity', 'nameless', 'monstrous', 'abomination', 'unfathomable'] },
  { theme: 'Wordsmith', words: ['word', 'vowel', 'syllable', 'alphabet', 'grammar', 'rhetoric', 'eloquence', 'etymology', 'dictionary', 'thesaurus'] },
  { theme: 'Apocalypse', words: ['havoc', 'ravage', 'upheaval', 'calamity', 'cataclysm', 'devastation', 'catastrophe', 'extinction', 'annihilation', 'apocalypse'] },
  { theme: 'Eternity', words: ['eon', 'ageless', 'timeless', 'undying', 'immortal', 'perpetual', 'boundless', 'infinite', 'everlasting', 'eternity'] },
  { theme: 'Last Stand', words: ['vigil', 'stand', 'resolve', 'endure', 'defiance', 'steadfast', 'unyielding', 'unbroken', 'indomitable', 'invincible'] },
  { theme: "Word's End", words: ['omega', 'finale', 'epilogue', 'crescendo', 'coronation', 'culmination', 'apotheosis', 'quintessence', 'masterpiece', 'lexicon'] },
];

/** Flat ordered list: LEVEL_WORDS[n - 1] is the word for level n. */
export const LEVEL_WORDS = CHAPTERS.flatMap((c) => c.words);

/** Chapter info for a level number 1..1000. */
export function chapterOf(n) {
  const i = Math.max(0, Math.min(CHAPTERS.length - 1, Math.floor((n - 1) / 10)));
  return { index: i + 1, theme: CHAPTERS[i].theme };
}
