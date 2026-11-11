import { C } from './define.js';

export default [
  C('blades', 'bolt', 'metal', 'crit', 'weapon blade metal', '🗡', 'Slashes the nearest foe',
    `sword swords blade blades knife dagger daggers dirk sabre saber sabers scimitar cutlass rapier rapiers katana
 epee foil broadsword longsword shortsword claymore falchion stiletto razor shiv bayonet kris kukri tanto
 cleaver gladius greatsword swordsman swordsmen swordplay fencing duelist duellist swashbuckler blademaster
 swordmaster sword cane dagger switchblade penknife jackknife pocketknife scythe`, { stat: { damage: 1.25, rate: 0.85, range: 0.85 } }),
  C('battleaxes', 'blast', 'metal', 'armorBreak', 'weapon axe metal', '⚔', 'Cleaves through ranks',
    `battleaxe halberd halberds poleaxe poleax tomahawk tomahawks labrys bardiche voulge glaive glaives billhook
 warhammer warhammers berserker headsman`, { stat: { damage: 1.1 } }),
  C('spears', 'bolt', 'metal', 'pierce', 'weapon spear metal', '🔱', 'Thrusts spears clean through the line',
    `spear spears lance lances pike pikes javelin javelins trident tridents harpoon harpoons partisan spearhead
 pikeman pikemen lancer lancers spearman spearmen assegai hoplite hoplites phalanx pitchforks spike lancet
 skewer skewers prong prongs impaler`, { stat: { range: 1.15 } }),
  C('bows', 'snipe', 'nature', 'pierce', 'weapon bow ranged', '🏹', 'Looses arrows from long range',
    `bow bows longbow longbows crossbow crossbows arbalest archer archers archery bowman bowmen arrow arrows
 quiver quivers bowstring fletcher fletching shortbow recurve bolt bolts arrowhead arrowheads yeoman
 toxophilite bowyer`),
  C('guns', 'rapid', 'metal', 'crit:0.7', 'weapon gun metal', '🔫', 'Fires quick volleys of lead',
    `gun guns pistol pistols revolver revolvers rifle rifles musket muskets carbine carbines firearm firearms
 handgun handguns sidearm derringer flintlock matchlock minigun gatling machinegun bullet bullets ammo
 ammunition cartridge cartridges gunfire gunshot gunshots gunner gunners gunman gunmen gunslinger
 gunfighter gunfighters rifleman riflemen shooter shooters trigger holster pellet pellets buckshot
 birdshot slug slugs bandolier gunpoint magnum colt luger blaster blasters `),
  C('shotguns', 'blast', 'metal', 'knockback', 'weapon gun metal', '💥', 'Blasts a spread of shot',
    `shotgun shotguns blunderbuss musketoon bazooka bazookas flamethrower`, { stat: { range: 0.8 } }),
  C('snipers', 'snipe', 'metal', 'crit:1.5', 'weapon gun ranged', '🎯', 'Picks off foes from afar',
    `sniper snipers sharpshooter sharpshooters marksman marksmen markswoman scope scopes riflescope crosshair
 crosshairs deadeye bullseye target targets `),
  C('artillery', 'blast', 'fire', 'knockback', 'weapon artillery siege', '💣', 'Lobs heavy cannonballs down the path',
    `cannon cannons cannonball cannonballs artillery mortar mortars howitzer howitzers catapult catapults trebuchet
 trebuchets ballista ballistae mangonel onager bombard bombards culverin cannonade cannoneer gunboat
 gunboats shrapnel grapeshot canister barrage bombardment siege siegeworks battery batteries broadside
 broadsides artilleryman gunnery`, { stat: { range: 1.15 } }),
  C('explosives', 'blast', 'fire', 'splash burn:0.5', 'weapon explosive fire', '🧨', 'Detonates in a fiery burst',
    `bomb bombs grenade grenades dynamite explosive explosives explosion explosions blast blasts detonator
 detonation nitro nitroglycerin gunpowder firecracker firecrackers firework fireworks rocket
 rockets missile missiles torpedo torpedoes landmine landmines minefield petard bomber bombers bombshell
 kaboom boom booms warhead warheads payload shell shells napalm incendiary tnt`, { stat: { range: 0.9 } }),
  C('blunt', 'bolt', 'earth', 'stun knockback:0.6', 'weapon blunt', '🏏', 'Clubs foes senseless',
    `club clubs mace maces flail flails cudgel cudgels bludgeon bludgeons truncheon truncheons baton batons
 cosh shillelagh morningstar knobkerrie quarterstaff quarterstaffs bat bats cane canes stick sticks rod
 nightstick blackjack knuckleduster knuckles hammerhead sledge maul mauls bludgeoner`),
  C('throwing', 'rapid', 'storm', 'crit:0.6', 'weapon thrown', '🪃', 'Hurls a flurry of throwing weapons',
    `sling slings slingshot slingshots boomerang boomerangs chakram chakrams shuriken shurikens dart darts
 bola bolas atlatl kunai blowgun blowpipe peashooter slinger slingers`),
  C('whips', 'chain', 'nature', 'slow:0.7', 'weapon whip', '〰', 'Cracks a whip that snaps between foes',
    `whip whips lash lashes scourge scourges flog bullwhip quirt thong knout lasher`),
  C('shields', 'support', 'metal', 'shield', 'armor defense guard', '🛡', 'Raises shields over nearby towers',
    `shield shields buckler bucklers aegis armor armour armors armours breastplate breastplates chainmail mail
 helmet helmets helm helms visor visors gauntlet gauntlets greaves hauberk cuirass pavise targe targes
 shieldwall bulwark bulwarks plating kevlar brigandine gorget pauldron vambrace
 coif chainmaille scale`),
  C('war', 'aura', 'fire', 'crit:0.6', 'war military', '⚔', 'Engulfs nearby foes in the chaos of battle',
    `war wars warfare battle battles combat conflict fight fights fighting skirmish skirmishes clash clashes
 onslaught assault assaults offensive invasion invasions crusade crusades siegecraft melee brawl brawls
 fray affray scuffle tussle struggle campaign blitz blitzkrieg battlefield battlefields battleground
 warpath bloodbath carnage havoc mayhem rampage`),
];
