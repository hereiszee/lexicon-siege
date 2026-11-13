import { C } from './define.js';

export default [
  C('royalty', 'support', 'light', 'buff.damage', 'royal person', '👑', 'Commands nearby towers to strike harder',
    `king kings queen queens prince princes princess princesses monarch monarchs emperor emperors empress
 empresses czar czars tsar tsars tsarina sultan sultans sultana pharaoh pharaohs crown crowns throne
 thrones regent regents duke dukes duchess duchesses earl earls baron barons baroness count counts countess
 marquis marquess viscount lady ladies noble nobles nobleman noblemen noblewoman royalty majesty sovereign
 sovereigns ruler rulers kaiser khan khans rajah rajahs maharaja maharajah viceroy chieftain chieftains
 chief chiefs heir heirs heiress dauphin infanta caliph emir emirs shah sheikh lordship monarchy kingdom
 kingdoms empire empires realm realms dynasty dynasties court courtier courtiers scepter regalia
 coronation
 `),
  C('commanders', 'support', 'metal', 'buff.rate', 'military leader person', '🎖', 'Drills nearby towers to fire faster',
    `general generals captain captains commander commanders colonel colonels major majors lieutenant
 lieutenants sergeant sergeants marshal marshals admiral admirals officer officers warlord warlords
 commodore commodores corporal corporals brigadier ensign ensigns strategist strategists tactician
 tacticians commandant warchief overlord overlords drillmaster quartermaster adjutant aide centurion
 centurions tribune legate generalissimo field marshal headquarters command
 tyrant despot usurper tyranny dominion conqueror`),
  C('soldiers', 'summon', 'metal', 'summon', 'military person', '💂', 'Deploys soldiers onto the path',
    `soldier soldiers troop troops trooper troopers infantry infantryman infantrymen army armies legion legions
 legionary legionaries legionnaire regiment regiments battalion battalions platoon platoons squad squads
 squadron squadrons militia militias warrior warriors fighter fighters mercenary mercenaries recruit
 recruits veteran veterans   musketeer musketeers dragoon dragoons hussar hussars
 cavalryman cavalrymen samurai gladiator gladiators paratrooper paratroopers marine marines commando
 commandos conscript conscripts footman footmen rifleman spearman archers berserker
 berserkers viking vikings spartan spartans barbarian barbarians raider raiders horde ninja guerrilla
 guerrillas partisan partisans rebel rebels insurgent garrison garrisons sentry battalion vanguard
 rearguard detachment cohort cohorts phalanx division divisions brigade brigades corps company militant`),
  C('knights', 'summon', 'light', 'summon', 'military knight person', '🛡', 'Sends armored knights to hold the path',
    `knight knights paladin paladins templar templars crusader crusaders cavalier cavaliers champion
 champions squire squires chevalier chevaliers hero heroes heroine heroines defender defenders protector
 protectors knighthood chivalry jouster jousters lancelot errant warden`, { stat: { hp: 1.2 } }),
  C('guards', 'support', 'metal', 'shield', 'guard person defense', '💂', 'Stands guard, shielding nearby towers',
    `guard guards guardian guardians sentinel sentinels watchman watchmen bodyguard bodyguards wardens keeper
 keepers     custodian custodians lookout lookouts patrol patrols
 watch  sentries escort escorts   jailer jailers turnkey constable 
 vigil vigilante vigilantes
 gargoyle
 `),
  C('police', 'bolt', 'metal', 'stun:0.8', 'law person', '👮', 'Stuns foes and hauls them in',
    `police policeman policemen policewoman cop cops constable constables sheriff sheriffs deputy deputies
 detective detectives inspector inspectors trooper lawman lawmen bailiff bailiffs officer  agents
 investigator investigators enforcer enforcers  marshal judge judges magistrate magistrates jury
 juror jurors lawyer lawyers attorney attorneys prosecutor prosecutors justice law laws court verdict`),
  C('thieves', 'harvest', 'shadow', 'harvest.ink:1.05', 'crime shadow person', '🦹', 'Pilfers ink from the shadows',
    `thief thieves robber robbers burglar burglars bandit bandits brigand brigands outlaw outlaws pickpocket
 pickpockets smuggler smugglers poacher poachers rogue rogues scoundrel scoundrels crook crooks swindler
 swindlers cheat cheats looter looters marauder marauders highwayman highwaymen   grifter
 grifters conman conmen racketeer racketeers gangster gangsters mobster mobsters bootlegger forger forgers
 embezzler shoplifter heist heists robbery robberies burglary theft thefts larceny loot plunder pillage
 booty swag`),
  C('pirates', 'bolt', 'water', 'bounty', 'sea crime person', '🏴', 'Plunders foes for extra ink',
    `pirate pirates buccaneer buccaneers corsair corsairs privateer privateers freebooter freebooters
 sea dog seadog cutlass  parrot
 mutiny`),
  C('sailors', 'summon', 'water', 'summon', 'sea person', '⚓', 'Lands a crew of sailors on the path',
    `sailor sailors seaman seamen mariner mariners seafarer seafarers boatman boatmen navigator navigators
 crew crews deckhand deckhands oarsman oarsmen helmsman boatswain bosun skipper skippers shipmate
 shipmates midshipman coastguard lifeguard lifeguards diver divers frogman frogmen navy navies
 fleet fleets armada armadas flotilla`),
  C('merchants', 'harvest', 'metal', 'harvest.ink:1.1', 'money trade person', '⚖', 'Trades goods for ink',
    `merchant merchants trader traders shopkeeper shopkeepers vendor vendors peddler peddlers pedlar grocer
 grocers broker brokers dealer dealers salesman salesmen saleswoman seller sellers buyer buyers
 shop shops store stores market markets marketplace bazaar bazaars emporium mall malls boutique
 supermarket auction auctioneer tradesman tradesmen hawker hawkers retailer wholesaler storekeeper
 innkeeper innkeepers publican caravan caravans trade trades commerce business businesses
 enterprise company companies firm firms corporation entrepreneur entrepreneurs tycoon tycoons magnate
 magnates mogul moguls`),
  C('scholars', 'harvest', 'arcane', 'harvest.tile', 'scholar person mind', '🎓', 'Studies up fresh letters',
    `scholar scholars scientist professor professors teacher teachers tutor tutors student students pupil
 pupils academic academics philosopher philosophers researcher researchers inventor inventors
 mathematician mathematicians physicist physicists chemists historian historians linguist linguists
 lexicographer lexicographers librarian librarians archivist archivists schoolmaster schoolteacher
 headmaster dean deans lecturer lecturers mentor mentors expert experts savant savants polymath
 intellectual intellectuals graduate graduates scholarship academy school schools university
 universities college colleges classroom classrooms lesson lessons lecture lectures seminar tutorial
 education study studies homework exam exams quiz quizzes test tests`),
  C('builders', 'support', 'earth', 'shield:1.05', 'craft person building', '👷', 'Shores up nearby towers',
    `builder builders architect architects engineer engineers construction constructor contractor
 contractors laborer laborers labourer labourers worker workers workman workmen craftsman craftsmen
 craftswoman artisan artisans scaffold scaffolding blueprint blueprints crane bulldozer bulldozers
 excavator foreman foremen surveyor surveyors draftsman
 ladder`),
  C('hunters', 'snipe', 'nature', 'crit reveal', 'hunt person', '🏹', 'Tracks and picks off distant foes',
    `hunter hunters huntsman huntsmen huntress huntresses trapper trappers tracker trackers scout scouts
 stalker woodsman pathfinder pathfinders gamekeeper gamekeepers hunt hunts hunting tracking safari
 falconer
 ranger rangers`),
  C('spies', 'support', 'shadow', 'buff.range', 'spy shadow person', '🕵', 'Spies out targets for nearby towers',
    `spy spies spymaster agent operative operatives informant informants informer informers
 sleuth sleuths snoop snoops eavesdropper mole double saboteur saboteurs infiltrator infiltrators
 espionage intelligence surveillance reconnaissance recon scouting lookout
 `),
  C('performers', 'support', 'arcane', 'buff.rate', 'art music person', '🎭', 'Performs to quicken nearby towers',
    `bard bards minstrel minstrels troubadour troubadours jester jesters clown clowns juggler jugglers dancer
 dancers singer singers actor actors actress actresses performer performers entertainer entertainers
 comedian comedians mime mimes puppeteer puppeteers ballerina ballerinas showman storyteller storytellers
 poet poets musician musicians magician fool fools harlequin acrobat circus circuses carnival carnivals
 theater theatre theaters theatres stage stages show shows play plays drama comedy tragedy  
 ballet   festival festivals parade parades
 costume masquerade`),
  C('laborers', 'harvest', 'earth', 'harvest.ink:0.95', 'work person', '🧑', 'Toils away for ink',
    `peasant peasants serf serfs servant servants butler butlers maidservant porter porters steward stewards
 valet valets vassal vassals tenant tenants peon drudge drudges coolie hireling hirelings
 employee employees staff clerk apprentice apprentices journeyman labor labour work toil chore chores
 job jobs task tasks errand errands shift shifts wage`),
  C('chefs', 'support', 'fire', 'heal:0.9', 'food person', '🧑', 'Cooks hearty meals that mend nearby towers',
    `cook cooks chef chefs baker bakers butcher butchers brewer brewers vintner vintners confectioner
 chocolatier caterer caterers waiter waiters waitress waitresses bartender bartenders barman barmaid
 sommelier kitchen kitchens bakery bakeries brewery breweries restaurant restaurants cafe cafes diner
 diners canteen cafeteria `),
  C('firefighters', 'support', 'water', 'shield:0.8 heal:0.5', 'water rescue person', '🚒', 'Douses danger around nearby towers',
    `firefighter firefighters fireman firemen firehouse fireboat rescuer rescuers rescue rescues
 savior saviour saviors lifesaver lifesavers paramedic`),
  C('leaders', 'support', 'light', 'buff.range', 'leader person', '📯', 'Rallies nearby towers to reach farther',
    `leader leaders president presidents prime minister ministers chancellor chancellors senator senators
 governor governors mayor mayors ambassador ambassadors diplomat diplomats envoy envoys consul consuls
 delegate delegates politician politicians statesman statesmen councillor councilor councillors
 parliament congress senate council councils assembly government governments republic nation nations
 state states country countries federation alliance alliances league leagues union unions treaty
 flag banner pennant emblem motto tabard blazon`),
  C('people', 'summon', 'earth', 'summon:0.9', 'person', '🧍', 'Sends townsfolk to block the path',
    `person persons people folk folks citizen citizens villager villagers townsfolk townsman crowd crowds mob
 mobs throng throngs populace public community communities neighbor neighbours neighbour neighbors
 family families clan clans tribe tribes kin kinsman kinsmen relative relatives friend friends ally allies
 companion companions comrade comrades partner partners brother brothers sister sisters mother mothers
 father fathers son sons daughter daughters child children baby babies kid kids boy boys girl girls man
 men woman women gentleman gentlemen husband husbands wife wives uncle uncles aunt aunts cousin cousins
 grandmother grandfather grandma grandpa nephew niece twin twins elder elders youth youths teen teens
 adult adults stranger strangers guest guests visitor visitors traveler travelers traveller wanderer
 wanderers nomad nomads pilgrim settler settlers pioneer pioneers colonist colonists explorer explorers
 adventurer adventurers
 wayfarer rover vagabond voyager journey voyage expedition`),
];
