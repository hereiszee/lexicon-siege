import { C } from './define.js';

export default [
  // ---------------------------------------------------------------- vehicles
  C('cars', 'blast', 'metal', 'knockback:1.2', 'vehicle machine', '🚗', 'Rams foes off the path',
    `car cars truck trucks lorry lorries van vans bus buses jeep jeeps bulldozer motorcycle motorcycles
 motorbike motorbikes bike bikes bicycle bicycles scooter scooters wagon wagons cart carts carriage
 carriages coach stagecoach limousine limo taxi taxis cab cabs sedan convertible minivan pickup
 snowmobile tricycle unicycle skateboard sled sleds sleigh sleighs toboggan rickshaw
 automobile automobiles vehicle vehicles traffic roadster dragster `),
  C('tanks', 'blast', 'metal', 'armorBreak', 'vehicle military', '🛞', 'Shells foes with armored cannon',
    `tank tanks panzer panzers halftrack juggernaut chariot chariots 
 ironclads dreadnought dreadnoughts`, { stat: { hp: 1.35 } }),
  C('ships', 'blast', 'water', 'splash:0.7', 'vehicle ship sea', '⛵', 'Fires broadsides down the path',
    `ship ships boat boats galleon galleons frigate frigates warship warships battleship battleships destroyer
 destroyers cruiser cruisers submarine submarines yacht yachts raft rafts canoe canoes kayak kayaks ferry
 ferries barge barges schooner schooners sloop sloops ketch clipper clippers dinghy dinghies gondola
 gondolas longship longships galley trireme junk catamaran steamboat steamship tugboat
 lifeboat rowboat sailboat speedboat hovercraft ark carrier flagship vessel vessels sail sails mast
 masts hull hulls keel rudder anchorage
 oar`),
  C('aircraft', 'snipe', 'storm', 'splash:0.4 crit:0.5', 'vehicle sky', '✈', 'Strafes distant foes from the air',
    `plane planes airplane airplanes aeroplane aeroplanes jet jets helicopter helicopters airship airships
 blimp blimps zeppelin zeppelins glider gliders biplane biplanes airliner bomber
 seaplane parachute parachutes paraglider hangglider airport airports runway aviator
 aviators pilot pilots copilot airman airmen aviation
 `),
  C('trains', 'beam', 'metal', 'knockback:0.5', 'vehicle machine', '🚂', 'Barrels a relentless train through foes',
    `train trains locomotive locomotives tram trams subway subways streetcar trolley monorail 
 boxcar caboose engineer conductor freight express `),
  // ---------------------------------------------------------------- money
  C('money', 'harvest', 'metal', 'harvest.ink:1.1', 'money treasure', '🪙', 'Mints ink',
    `money monies cash coin coins penny pennies dime dimes dollar dollars cent cents euro euros yen peso pesos
 ruble rubles rupee rupees franc francs shilling shillings ducat ducats florin florins doubloon doubloons
 currency currencies banknote banknotes wage wages salary salaries income incomes profit profits payment
 payments pay fee fees tax taxes tithe tithes rent rents interest revenue revenues fortune fortunes wealth
 riches dividend dividends allowance pension paycheck bonus bonuses tip tips change token tokens farthing
 guinea sixpence nickel quarter`),
  C('bank', 'harvest', 'metal', 'harvest.ink:1.2', 'money bank', '🏦', 'Earns interest in ink',
    `bank banks banker bankers treasury treasuries treasurer purse purses wallet wallets piggybank savings
 investor investors investment investments fund funds budget budgets credit credits loan loans
 capital stock stocks bond shares accountant accountants accounting cashier cashiers teller tellers
 financier financiers economist economy economics finance finances ledger ledgers account accounts
 deposit deposits mortgage cheque check checkbook moneybag moneybags safe deposit exchequer`),
  C('treasure', 'harvest', 'light', 'harvest.ink:1.1', 'money treasure', '💰', 'Unearths treasure worth ink',
    `treasure treasures hoard hoards jackpot jackpots bounty bounties reward rewards prize prizes trophy
 trophies chest chests bonanza windfall windfalls heirloom heirlooms valuables trove troves cache caches
 spoils dowry ransom tribute inheritance legacy`),
  // ---------------------------------------------------------------- writing
  C('books', 'harvest', 'arcane', 'harvest.tile', 'book writing scholar', '📖', 'Reads up fresh letter tiles',
    `book books tome tomes volume volumes novel novels manual manuals almanacs dictionary dictionaries lexicon
 lexicons encyclopedia encyclopedias thesaurus atlas atlases codex codices scroll scrolls manuscript
 manuscripts journal journals diary diaries notebook notebooks catalog catalogue catalogs anthology
 chronicle chronicles saga sagas epic epics fable fables myth myths legend legends story stories tale
 tales poem poems poetry prose verse verses chapter chapters paperback hardcover textbook textbooks
 storybook guidebook handbook cookbook workbook spellbooks bestiary glossary index bibliography
 biography autobiography memoir memoirs essay essays treatise thesis literature fiction`),
  C('pens', 'harvest', 'arcane', 'harvest.tile:1.1', 'writing tool', '✒', 'Writes you fresh letters',
    `pen pens pencil pencils quill quills inkwell inkwells nib nibs crayon crayons marker markers stylus chalk
 typewriter typewriters press presses printer printers printing paper papers parchment papyrus page pages
 sheet sheets notepad eraser erasers ruler sharpener inkpot penmanship calligraphy handwriting
 signature signatures autograph autographs scribble scribbles doodle doodles sketch sketches
 `),
  C('scribes', 'harvest', 'arcane', 'harvest.tile:1.2', 'writing person scholar', '📜', 'Copies out fresh letters',
    `scribe scribes writer writers author authors novelist novelists editor editors clerk clerks secretary
 secretaries typist typists scrivener scriveners copyist copyists calligrapher calligraphers stenographer
 journalist journalists reporter reporters columnist columnists poetess playwright playwrights
 screenwriter biographer chronicler chroniclers publisher publishers printer bookbinder bookkeeper
 notary notaries translator translators interpreter interpreters wordsmith wordsmiths speller spellers
 scrabbler cruciverbalist`),
  C('letters', 'harvest', 'arcane', 'harvest.tile:1.3', 'writing letter', '🔤', 'Shakes loose a fresh rack of letters',
    `letter letters alphabet alphabets word words vocabulary vocabularies spelling spellings vowel vowels
 consonant consonants syllable syllables phrase phrases sentence sentences paragraph paragraphs
 grammar language languages tongue dialect dialects slang idiom idioms noun nouns verb verbs adjective
 adjectives adverb adverbs pronoun pronouns anagram anagrams palindrome acronym acronyms abbreviation
 rhyme rhymes pun puns morpheme etymology wordplay text texts
 hieroglyph`),
  C('ink', 'harvest', 'shadow', 'harvest.ink:1.15', 'writing ink', '🖋', 'Wells up fresh ink',
    `ink inks inkhorn inkstone inky indigo sepia`, { mass: true }),
  C('messages', 'support', 'storm', 'buff.range', 'message writing', '✉', 'Relays orders so nearby towers reach farther',
    `message messages messenger messengers courier couriers herald postman postmen mailman mailmen mail post
 postcard postcards envelope envelopes telegram telegrams telegraph signal signals beacon semaphore
 newspaper newspapers news bulletin bulletins broadcast broadcasts announcement notice
 notices memo memos note notes dispatch dispatches missive epistle correspondence herald
 `),
  // ---------------------------------------------------------------- poison & disease
  C('poison', 'bolt', 'nature', 'poison:1.3', 'poison', '☠', 'Fires darts dripping with poison',
    `poison poisons venom venoms toxin toxins arsenic cyanide hemlock nightshade belladonna strychnine
 ricin curare wolfsbane aconite toxicant bane hemlocks foxglove oleander
 `),
  C('disease', 'aura', 'shadow', 'poison', 'disease poison dark', '🦠', 'Spreads sickness among nearby foes',
    `plague plagues disease diseases pestilence pestilences sickness sicknesses illness illnesses fever fevers
 infection infections virus viruses bacteria bacterium germ germs flu influenza cholera typhoid typhus
 malaria leprosy rabies smallpox pox epidemic epidemics pandemic pandemics contagion contagions blight
 leper lepers ague consumption tuberculosis measles mumps scurvy gangrene sepsis
 dysentery diphtheria pneumonia ebola cancer tumor tumour ailment ailments malady maladies syndrome
 disorder outbreak quarantine`),
  C('rot', 'aura', 'nature', 'poison armorBreak:0.6', 'rot filth', '🪱', 'Corrodes everything nearby',
    `rot decay corrosion rust rusts sludge slime slimes filth filths grime muck sewage sewer sewers garbage trash
 rubbish waste wastes compost dung manure excrement ooze oozes putrefaction cesspool cesspit swill offal
 carrion landfill dump dumps junk junkyard scum mire`),
  C('acid', 'bolt', 'nature', 'armorBreak:1.3', 'poison acid', '🧪', 'Splashes acid that eats through armor',
    `acid acids lye bile corrosive solvent solvents caustic alkali vitriol `),
  // ---------------------------------------------------------------- traps
  C('traps', 'aura', 'metal', 'stun slow:0.7', 'trap', '🪤', 'Snaps shut on foes that wander close',
    `trap traps snare snares net nets mesh tripwire tripwires pitfall pitfalls caltrop caltrops beartrap
 mousetrap mousetraps deadfall booby boobytrap gin snag snags hook hooks lure decoy decoys bait spring
 springtrap trapdoor trapdoors minefield
 pit maze labyrinth`, { stat: { range: 0.85 } }),
  C('sticky', 'aura', 'nature', 'slow:1.5', 'trap sticky', '🍯', 'Gums up nearby foes',
    `glue glues tar resin resins sap gum gums paste pastes adhesive adhesives goo gunk molasses mucilage
 birdlime flypaper syrupy quagmire morass`),
  C('chains', 'bolt', 'metal', 'slow:1.1 stun:0.3', 'trap metal bind', '⛓', 'Binds foes in chains',
    `chain chains shackle shackles manacle manacles fetter fetters bond bonds handcuff handcuffs cuff cuffs
 bind binding bindings restraint restraints straitjacket gag yoke yokes collar collars
 `),
  C('spikes', 'aura', 'metal', 'armorBreak', 'trap metal', '📍', 'Bristles with spikes that shred nearby foes',
    `spikes stake impalement barbwire bristle bristles pin pins tack
 tacks thumbtack nail spur spurs prickle`),
  // ---------------------------------------------------------------- music
  C('drums', 'support', 'storm', 'buff.rate', 'music war sound', '🥁', 'Beats a rhythm that quickens nearby towers',
    `drum drums drummer drummers drumbeat tambourine tambourines cymbal cymbals timpani bongo bongos 
 bugle bugles trumpet trumpets fanfare fanfares march marches anthem anthems horn
 trumpeter bugler cadence rhythm rhythms beat beats tempo percussion snare kettledrum`),
  C('music', 'support', 'light', 'buff.damage:0.9 heal:0.4', 'music art', '🎵', 'Plays music that inspires nearby towers',
    `song songs music musics melody melodies tune tunes lute lutes lyre lyres harp harps violin violins guitar
 guitars fiddle fiddles cello cellos piano pianos flute flutes harpsichord organ clarinet clarinets oboe
 saxophone trombone tuba accordion bagpipe bagpipes banjo mandolin ukulele harmonica xylophone
 glockenspiel recorder chorus choir choirs ballad ballads aria arias sonata symphony symphonies
 serenade serenades carol carols chant chants overture orchestra orchestras band bands composer
 composers conductor maestro singer orchestration musical harmony harmonies chord chords note
 opera anthem lyric lyrics jingle jingles jazz blues reggae funk disco rap techno swing
 tango waltz polka rumba samba foxtrot minuet jig gospel folksong
 nocturne finale crescendo`),
  // ---------------------------------------------------------------- misc everyday
  C('art', 'support', 'arcane', 'buff.range:0.85', 'art', '🎨', 'Paints a vision that extends nearby towers\' range',
    `art arts painting paintings painter painters artist artists sculptor sculptors sculpture sculptures
 statue statues portrait portraits canvas easel palette mural murals fresco frescoes masterpiece
 masterpieces drawing drawings illustration photograph photographs photo photos camera cameras
 photographer gallery galleries mosaic tapestry paint`),
  C('weather-misc', 'aura', 'storm', 'slow:0.5 stun:0.4', 'weather', '🌫', 'Brews foul weather around itself',
    `weather climate forecast barometer thermometer windchill isobar humidity`),
];
