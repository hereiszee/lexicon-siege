import { C } from './define.js';

export default [
  C('predators', 'bolt', 'nature', 'crit', 'animal beast predator', '🐯', 'Pounces on the lead foe',
    `lion lions lioness lionesses tiger tigers tigress leopard leopards jaguar jaguars panther panthers cougar
 cougars puma pumas lynx lynxes cheetah cheetahs bobcat bobcats wildcat wildcats ocelot ocelots bear bears
 grizzly grizzlies hyena hyenas predator predators wolverine wolverines sabertooth smilodon 
 carnivore carnivores beast beasts
 cub panda`, { stat: { damage: 1.15, rate: 0.9 } }),
  C('packs', 'summon', 'nature', 'summon', 'animal dog pack', '🐺', 'Unleashes a pack onto the path',
    `wolf wolves werewolf werewolves dog dogs hound hounds puppy puppies pup pups mutt mutts cur curs
 jackal jackals coyote coyotes dingo dingoes fox foxes vixen beagle beagles terrier terriers mastiff
 mastiffs bulldog bulldogs poodle poodles collie collies retriever retrievers spaniel spaniels greyhound
 greyhounds dachshund rottweiler husky huskies sheepdog wolfhound bloodhound bloodhounds doberman
 pitbull pack packs kennel kennels canine canines whelp whelps pooch hellhound`),
  C('raptors', 'snipe', 'storm', 'crit', 'animal bird predator', '🦅', 'Dives on distant foes from the sky',
    `hawk hawks eagle eagles falcon falcons kestrel kestrels osprey ospreys vulture vultures condor condors
 buzzard buzzards kite owl owls harrier harriers merlin gyrfalcon raptor raptors goshawk sparrowhawk
 peregrine eaglet falconer falconry roc thunderbird`),
  C('birds', 'rapid', 'storm', '', 'animal bird', '🐦', 'Sends a flurry of pecking birds',
    `bird birds sparrow sparrows robin robins finch finches wren wrens lark larks swallow swallows swift swifts
 starling starlings crow crows raven ravens magpie magpies jay jays pigeon pigeons dove doves parrot
 parrots canary canaries bluebird bluebirds blackbird blackbirds thrush thrushes warbler warblers
 nightingale nightingales hummingbird hummingbirds woodpecker woodpeckers songbird songbirds cardinal
 oriole orioles chickadee titmouse nuthatch kingfisher cuckoo cuckoos rook macaw macaws cockatoo
 toucan toucans budgie parakeet mynah grackle bunting flock flocks fledgling nestling chick chicks
 feather feathers wing wings beak nest nests birdsong aviary
 emu plume`),
  C('waterbirds', 'bolt', 'water', 'slow:0.6', 'animal bird water', '🦢', 'Strikes from the water\'s edge',
    `duck ducks goose geese gander swan swans heron herons crane cranes stork storks pelican pelicans gull
 gulls seagull seagulls albatross penguin penguins puffin puffins flamingo flamingos cormorant cormorants
 egret egrets ibis loon loons grebe mallard teal tern terns sandpiper plover gannet petrel kittiwake
 duckling ducklings gosling cygnet`),
  C('stingers', 'rapid', 'nature', 'poison', 'animal insect poison', '🐝', 'Stings foes with venom',
    `bee bees wasp wasps hornet hornets yellowjacket yellowjackets scorpion scorpions mosquito mosquitoes gnat
 gnats ant ants fireant termite termites tick ticks flea fleas horsefly gadfly midge midges bumblebee
 bumblebees honeybee honeybees sting stings stinger stingers chigger chiggers botfly deerfly`),
  C('swarms', 'summon', 'nature', 'summon.horde', 'animal insect swarm', '🪲', 'Releases a swarm onto the path',
    `swarm swarms hive hives beehive beehives anthill anthills colony colonies locust locusts grasshopper
 grasshoppers cricket crickets cicada cicadas horde hordes nest beekeeper apiary infestation
 cockroach cockroaches roach roaches vermin`),
  C('bugs', 'bolt', 'nature', 'slow:0.5', 'animal insect', '🐞', 'Spits at foes with a chitinous crunch',
    `beetle beetles bug bugs insect insects ladybug ladybugs ladybird butterfly butterflies moth moths
 caterpillar caterpillars worm worms earthworm earthworms maggot maggots larva larvae grub grubs slug
 snail snails centipede centipedes millipede millipedes dragonfly dragonflies firefly fireflies fly flies
 housefly mayfly damselfly mantis mantises weevil weevils aphid aphids cocoon chrysalis pupa 
 earwig silverfish woodlouse scarab scarabs
 leech`),
  C('spiders', 'bolt', 'nature', 'slow poison:0.6', 'animal spider poison', '🕷', 'Spins webs and bites',
    `spider spiders tarantula tarantulas arachnid arachnids web webs cobweb cobwebs widow recluse 
 `),
  C('snakes', 'bolt', 'nature', 'poison:1.2', 'animal snake poison', '🐍', 'Strikes with venomous fangs',
    `snake snakes serpent serpents viper vipers cobra cobras python pythons adder adders asp asps rattlesnake
 rattlesnakes mamba mambas boa boas anaconda anacondas copperhead copperheads krait sidewinder
 sidewinders cottonmouth moccasin taipan constrictor constrictors basilisk naga nagas`),
  C('reptiles', 'blast', 'earth', 'knockback', 'animal reptile', '🐊', 'Snaps and thrashes at the path',
    `crocodile crocodiles alligator alligators croc crocs gator gators lizard lizards iguana iguanas gecko
 geckos komodo chameleon chameleons tortoise tortoises turtle turtles terrapin monitor reptile reptiles
 caiman caimans skink skinks`),
  C('dinosaurs', 'blast', 'earth', 'knockback:1.3 stun:0.5', 'animal dinosaur beast', '🦖', 'Stomps foes flat',
    `dinosaur dinosaurs dino dinos tyrannosaur tyrannosaurus triceratops brontosaurus stegosaurus velociraptor
 mammoth mammoths mastodon mastodons pterodactyl pterodactyls brachiosaurus diplodocus ankylosaurus
 megalodon allosaurus iguanodon spinosaurus`, { stat: { hp: 1.2 } }),
  C('fish', 'rapid', 'water', '', 'animal fish water', '🐟', 'Darts schools of fish at foes',
    `fish fishes trout salmon cod tuna carp bass perch minnow minnows herring sardine sardines anchovy anchovies
 mackerel catfish goldfish guppy guppies flounder halibut haddock snapper grouper tilapia sturgeon
 carps koi swordfish marlin sailfish minnow smelt shad pollock wrasse angelfish clownfish pufferfish
 blowfish lionfish stingfish shoal shoals
 fin`),
  C('sharks', 'bolt', 'water', 'crit:1.2', 'animal fish predator water', '🦈', 'Tears into foes with rows of teeth',
    `shark sharks orca orcas barracuda barracudas piranha piranhas moray morays eel eels stingray stingrays
 hammerhead mako squid squids octopus octopuses octopi kraken krakens cuttlefish
 leviathan dogfish
 tentacle`),
  C('whales', 'blast', 'water', 'knockback', 'animal water sea', '🐋', 'Breaches and swamps the path',
    `whale whales walrus walruses manatee manatees dolphin dolphins porpoise porpoises seal seals 
 narwhal narwhals beluga belugas humpback humpbacks dugong otter otters`),
  C('shellfish', 'support', 'water', 'shield', 'animal water shell', '🦀', 'Lends nearby towers a hard shell',
    `crab crabs lobster lobsters shrimp prawn prawns clam clams oyster oysters mussel mussels scallop scallops
 barnacle barnacles seashell seashells shell conch conches cockle cockles crayfish crawfish  limpet
 limpets nautilus armadillo armadillos pangolin pangolins
 `),
  C('jellies', 'aura', 'water', 'stun', 'animal water poison', '🪼', 'Stings everything that drifts close',
    `jellyfish anemone anemones coral corals urchin urchins starfish polyp polyps sponge sponges
 `),
  C('herd', 'blast', 'earth', 'knockback:1.2', 'animal beast herd', '🐂', 'Charges and tramples foes',
    `bull bulls ox oxen bison buffalo buffaloes rhino rhinos rhinoceros elephant elephants hippo hippos
 hippopotamus moose elk ram rams goat goats boar boars warthog warthogs yak yaks musk gnu gnus wildebeest
 antlers tusker bullock steer steers`, { stat: { hp: 1.15 } }),
  C('horses', 'summon', 'earth', 'summon', 'animal horse', '🐎', 'Gallops riders onto the path',
    `horse horses stallion stallions mare mares steed steeds pony ponies colt colts foal foals mustang mustangs
 charger chargers warhorse warhorses donkey donkeys mule mules zebra zebras camel camels llama llamas
 alpaca alpacas burro burros bronco broncos thoroughbred palomino pinto filly fillies gelding geldings
 cavalry horseman horsemen rider riders cowboy cowboys cowgirl jockey stable stables saddle saddles
 stirrup stirrups bridle reins horseshoe centaur centaurs pegasus unicorn
 `),
  C('deer', 'rapid', 'nature', 'knockback:0.5', 'animal prey', '🦌', 'Bounds about, butting foes',
    `deer stag stags doe fawn fawns antelope antelopes gazelle gazelles impala impalas reindeer caribou
 hare hares rabbit rabbits bunny bunnies kangaroo kangaroos wallaby wallabies jackrabbit hart hind roe
 roebuck springbok ibex chamois okapi giraffe giraffes`),
  C('rodents', 'summon', 'shadow', 'summon.horde', 'animal rodent', '🐀', 'Sends scurrying rodents onto the path',
    `rat rats mouse mice rodent rodents squirrel squirrels chipmunk chipmunks hamster hamsters gerbil gerbils
 beaver beavers mole moles vole voles weasel weasels ferret ferrets stoat stoats mink minks badger badgers
 raccoon raccoons opossum opossums possum possums lemming lemmings shrew shrews marmot
 marmots gopher gophers muskrat muskrats dormouse woodchuck groundhog meerkat meerkats mongoose`),
  C('skunk', 'aura', 'nature', 'poison slow:0.5', 'animal poison', '🦨', 'Fouls the air around it',
    `skunk skunks polecat polecats stinkbug stinkhorn`),
  C('bats', 'chain', 'shadow', 'reveal', 'animal night', '🦇', 'Sends bats flitting foe to foe',
    `bat bats batwing echolocation
 `),
  C('primates', 'rapid', 'nature', 'stun:0.4', 'animal primate', '🐒', 'Flings fruit and fury',
    `monkey monkeys ape apes gorilla gorillas chimp chimps chimpanzee chimpanzees baboon baboons orangutan
 orangutans gibbon gibbons lemur lemurs primate primates macaque mandrill marmoset bonobo`),
  C('cats', 'rapid', 'nature', 'crit', 'animal cat', '🐈', 'Swipes at foes with quick claws',
    `cat cats kitten kittens kitty kitties tomcat tomcats feline felines tabby tabbies moggy siamese persian
 mouser
 paw`),
  C('livestock', 'harvest', 'nature', 'harvest.ink', 'animal farm livestock', '🐄', 'Raises livestock for ink',
    `cow cows cattle calf calves pig pigs hog hogs sow sows piglet piglets sheep lamb lambs ewe ewes chicken
 chickens hen hens rooster roosters cockerel chick turkey turkeys livestock poultry herd herds herder
 herdsman shepherd shepherds shepherdess goatherd swineherd cowherd dairy dairymaid milkmaid heifer
 heifers flock pigsty pigpen coop henhouse barnyard stockyard pasture`),
  C('amphibians', 'bolt', 'water', 'poison:0.8', 'animal amphibian water', '🐸', 'Spits toxic slime',
    `frog frogs toad toads tadpole tadpoles newt newts salamanders axolotl axolotls bullfrog bullfrogs
 amphibian amphibians caecilian`),
];
