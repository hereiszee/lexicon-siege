import { C } from './define.js';

const M = { conv: true };

export default [
  C('wizards', 'bolt', 'arcane', 'crit:0.8', 'magic person', '🧙', 'Casts arcane bolts',
    `wizard wizards mage mages magician magicians sorcerer sorcerers sorceress sorceresses warlock warlocks
 witch witches enchanter enchanters enchantress conjurer conjurers conjuror archmage archmages magus magi
 illusionist illusionists mystic mystics thaumaturge diviner diviners soothsayer
 soothsayers wizardry sorcery witchcraft magic magick magics arcana arcanum spellbinder
 wiccan wicca`, M),
  C('spells', 'chain', 'arcane', '', 'magic spell', '✨', 'Weaves a spell that jumps between foes',
    `spell spells incantation incantations enchantment enchantments cantrip cantrips ritual rituals rune runes
 glyph glyphs sigil sigils invocation invocations evocation conjuration conjurations abracadabra 
 mantra mantras sortilege spellwork spellbook spellcraft mojo juju wish wishes miracle miracles`, M),
  C('curses', 'bolt', 'shadow', 'armorBreak poison:0.6', 'magic curse dark', '☠', 'Lays withering curses on foes',
    `curse curses hex hexes jinx jinxes bane banes doom malediction maledictions hoodoo voodoo evil evils
 malice anathema damnation hexer bewitchment necromancy affliction afflictions
 scourge woe`, M),
  C('potions', 'support', 'arcane', 'heal', 'magic potion heal', '⚗', 'Brews potions that restore nearby towers',
    `potion potions philter philtre philters brew brews concoction concoctions draught draughts decoction
 alchemy alchemist alchemists cauldron transmutation quintessence ambrosia nectar soma `, M),
  C('wands', 'rapid', 'arcane', 'slow:0.5', 'magic item', '🪄', 'Zaps foes with rapid sparks of magic',
    `wand wands staff staffs staves scepter scepters sceptre orb orbs relic relics artifact artifacts artefact
 artefacts grimoire talisman talismans totem totems fetish runestone runestones phylactery
 athame chalice grail`, M),
  C('wards', 'support', 'arcane', 'shield', 'magic protection', '🔮', 'Wards nearby towers with sigils',
    `ward wards warding amulet amulets charm charms barrier barriers protection
 protections sanctum sanctums circle pentacle pentagram aegis safeguard bulwark talismanic`, M),
  C('clergy', 'support', 'light', 'heal', 'holy person', '✝', 'Prays over nearby towers to heal them',
    `priest priests priestess priestesses cleric clerics monk monks nun nuns friar friars abbot abbots abbess
 bishop bishops archbishop cardinal cardinals pope popes saint saints chaplain chaplains vicar vicars
 pastor pastors rabbi rabbis imam imams deacon deacons pilgrim pilgrims prophet prophets apostle apostles
 disciple disciples missionary missionaries hermit hermits oracle oracles druid druids shaman shamans
 seer seers sage sages guru gurus lama lamas yogi yogis prayer prayers blessing blessings hymn psalm
 sermon benediction faith devotion worship`, M),
  C('angels', 'summon', 'light', 'summon', 'holy angel', '👼', 'Sends angels to guard the path',
    `angel angels archangel archangels seraph seraphs seraphim cherub cherubs cherubim valkyrie valkyries
 host hosts herald heralds`, M),
  C('gods', 'support', 'light', 'buff.damage:1.3', 'holy divine', '🌟', 'Blesses nearby towers with divine might',
    `god gods goddess goddesses deity deities divinity divinities heaven paradise olympus valhalla demigod
 demigods titan titans immortal immortals creator almighty lord pantheon idol idols temple`, M),
  C('undead', 'summon', 'shadow', 'summon', 'dark undead death', '💀', 'Raises the dead onto the path',
    `zombie zombies skeleton skeletons ghoul ghouls mummy mummies vampire vampires lich liches revenant
 revenants undead corpse corpses cadaver cadavers necromancer necromancers ghast draugr 
 graveyard graveyards cemetery cemeteries tomb tombs grave graves gravedigger sepulcher sepulchre
 mausoleum coffin coffins casket caskets crypt bone bones skull skulls`, M),
  C('ghosts', 'snipe', 'shadow', 'slow', 'dark ghost', '👻', 'Drifts unseen and chills distant foes',
    `ghost ghosts spirit spirits specter specters spectre spectres phantom phantoms wraith wraiths spook
 spooks poltergeist poltergeists banshee banshees apparition apparitions haunt haunting haunts shade
 soul souls wisp wisps ectoplasm phantasm doppelganger`, M),
  C('demons', 'blast', 'fire', 'burn', 'dark demon fire', '😈', 'Unleashes hellfire on the path',
    `demon demons devil devils fiend fiends imp imps succubus incubus daemon daemons archfiend archdevil
 lucifer satan beelzebub balrog hellspawn ifrit efreet djinn djinni jinn genie genies oni cacodemon`, M),
  C('fae', 'support', 'nature', 'buff.rate', 'magic fae nature', '🧚', 'Sprinkles fairy dust that quickens nearby towers',
    `fairy fairies faerie faeries fae pixie pixies sprite sprites elf elves elven nymph nymphs dryad dryads sylph
 sylphs brownie brownies leprechaun leprechauns gnome gnomes hobgoblin hob puck kelpie selkie naiad
 naiads undine fairyland `, M),
  C('goblins', 'summon', 'earth', 'summon.horde', 'monster goblin', '👺', 'Sends goblin raiders onto the path',
    `goblin goblins orc orcs kobold kobolds gremlin gremlins troglodyte bugbear hobbit hobbits dwarf dwarves
 dwarfs halfling halflings minion minions lackey lackeys henchman henchmen`, M),
  C('giants', 'blast', 'earth', 'stun knockback', 'monster giant', '🗿', 'Smashes the path with giant fists',
    `giant giants ogre ogres troll trolls cyclops cyclopes golem golems colossus colossi behemoth behemoths
 juggernaut juggernauts goliath goliaths ettin titanic gargantua ent ents treefolk`, { ...M, stat: { hp: 1.25 } }),
  C('dragons', 'blast', 'fire', 'burn:1.2', 'monster dragon fire', '🐉', 'Breathes fire on the path',
    `dragon dragons wyrm wyrms wyvern wyverns drake drakes hydra hydras chimera chimeras manticore manticores
 dragonet salamander`, M),
  C('mythic', 'bolt', 'arcane', 'crit stun:0.4', 'monster myth', '🦄', 'Strikes with mythic power',
    `griffin griffins griffon griffons gryphon gryphons phoenix phoenixes sphinx sphinxes minotaur minotaurs
 cerberus medusa gorgon gorgons harpy harpies siren sirens mermaid mermaids merman mermen cockatrice
 roc rocs kirin qilin thunderbird yeti bigfoot werecat lamia monster monsters creature creatures`, M),
  C('dreams', 'aura', 'arcane', 'slow stun:0.5', 'magic sleep mind', '💤', 'Lulls nearby foes toward sleep',
    `sleep sleeps slumber slumbers dream dreams nap naps doze dozes lullaby lullabies trance trances hypnosis
 hypnotist reverie daydream daydreams nightmare nightmares sandman somnambulist sleepwalker dreamer
 dreamland insomnia`, M),
  C('mind', 'harvest', 'arcane', 'harvest.tile', 'mind scholar', '🧠', 'Thinks up fresh letters',
    `brain brains mind minds thought thoughts memory memories intellect wit wits intelligence wisdom idea ideas
 notion notions genius geniuses insight insights logic reason imagination intuition knowledge learning
 lore cognition concept concepts epiphany inspiration`, M),
  C('time', 'aura', 'arcane', 'slow:1.2', 'time magic', '⌛', 'Warps time to slow nearby foes',
    `time times eternity eternities era eras epoch epochs eon eons aeon aeons age ages century centuries decade
 decades millennium millennia moment moments instant instants hour hours minute minutes second seconds
 week weeks month months year years future past present history yesterday tomorrow today forever
 lifetime aftertime timelessness`, M),
  C('clocks', 'support', 'arcane', 'buff.rate', 'time machine', '⏰', 'Keeps nearby towers firing on the beat',
    `clock clocks timer timers hourglass hourglasses sundial sundials stopwatch alarm alarms
 metronome metronomes chronometer chronometers pendulum pendulums timepiece timepieces watch watches
 wristwatch clockmaker watchmaker tick tock chime`, M),
  C('cosmic', 'aura', 'arcane', 'crit:0.6 slow:0.4', 'cosmos magic', '🌌', 'Bends cosmic forces around itself',
    `infinity singularity wormhole wormholes dimension dimensions multiverse spacetime cosmic void quantum
 antimatter neutron neutrino `, M),
  C('nuclear', 'aura', 'fire', 'burn poison:0.6', 'science nuclear fire', '☢', 'Irradiates everything nearby',
    `atom atoms atomic nuclear reactor reactors radiation radioactivity isotope isotopes fission fusion
 meltdown fallout gamma nuke nukes megaton kiloton`, M),
];
