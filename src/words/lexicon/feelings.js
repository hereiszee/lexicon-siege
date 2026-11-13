import { C } from './define.js';

export default [
  C('rage', 'rapid', 'fire', 'crit', 'emotion anger', '😡', 'Lashes out in a furious flurry',
    `anger rage rages fury furies wrath ire frenzy frenzies outrage hatred hate hates spite vengeance revenge
 rampage rampages berserk temper tantrum tantrums aggression hostility animosity rancor rancour
 vendetta vendettas grudge grudges feud feuds bloodlust bloodthirst ferocity savagery violence`, { mass: true }),
  C('fear', 'aura', 'shadow', 'slow', 'emotion fear dark', '😱', 'Terrifies nearby foes into slowing',
    `fear fears terror terrors horror horrors dread panic panics fright frights scare scares phobia phobias
 anxiety anxieties nightmare dismay alarm trepidation apprehension paranoia hysteria menace menaces
 threat threats intimidation boogeyman bogeyman bugbear scarecrow `),
  C('joy', 'support', 'light', 'buff.rate', 'emotion joy', '😊', 'Lifts the spirits of nearby towers',
    `joy joys happiness delight delights glee bliss cheer cheers laughter laugh laughs smile smiles grin grins
 hope hopes gladness merriment mirth euphoria elation jubilation exultation rapture ecstasy enthusiasm
 zeal zest fun festivity celebration celebrations party parties fiesta gala jamboree hooray hurrah
 cheerleader optimism optimist triumph triumphs victory victories success successes win wins
 revelry marvel wonder`),
  C('love', 'support', 'arcane', 'heal', 'emotion love', '💗', 'Shows nearby towers some love, healing them',
    `love loves kindness compassion mercy grace tenderness affection devotion care cares charity sympathy
 empathy friendship friendships romance romances passion passions adoration fondness warmth amity
 goodwill benevolence generosity forgiveness sweetheart sweethearts darling darlings beloved lover
 lovers valentine kiss kisses hug hugs embrace embraces cuddle heartfelt`),
  C('sorrow', 'aura', 'water', 'slow', 'emotion sadness water', '😢', 'Drowns nearby foes in sorrow',
    `sorrow sorrows grief griefs sadness misery miseries woes despair melancholy tears tear sob sobs gloom
 lament laments mourning regret regrets heartache heartbreak anguish agony torment torments suffering
 loneliness solitude dejection depression lamentation elegy dirge dirges requiem funeral funerals
 shame`),
  C('calm', 'support', 'water', 'shield', 'emotion peace', '☮', 'Calms nearby towers behind a quiet ward',
    `calm calmness peace peacefulness serenity tranquility tranquillity patience quiet quietude silence
 silences stillness harmony composure equanimity poise zen meditation contentment truce armistice
 ceasefire peacekeeper peacekeepers peacemaker pacifist sanctuary haven havens refuge refuges shelter
 shelters
 hush`),
  C('courage', 'support', 'fire', 'buff.damage', 'emotion courage', '🦁', 'Emboldens nearby towers to hit harder',
    `courage bravery valor valour heroism daring boldness gallantry honor honour honors glory glories pride
 resolve determination grit guts nerve mettle fortitude tenacity spirit audacity bravado defiance
 confidence willpower ambition vigor`),
  C('cunning', 'snipe', 'shadow', 'crit execute:0.5', 'mind trick', '🦊', 'Outwits and picks off distant foes',
    `cunning trick tricks trickster tricksters trickery deceit deception ruse ruses ploy ploys scheme schemes
 schemer plot plots gambit feint feints  guile wile wiles stratagem subterfuge treachery betrayal
 traitor traitors con hoax hoaxes bluff bluffs deceiver liar liars`),
];
