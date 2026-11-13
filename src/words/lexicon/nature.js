import { C } from './define.js';

const N = { conv: true };

export default [
  C('trees', 'wall', 'nature', '', 'nature tree forest plant', '🌳', 'Grows a great trunk across the path',
    `tree trees oak oaks pine pines maple maples birch birches willow willows elm elms cedar cedars spruce
 spruces fir firs redwood redwoods sequoia sequoias cypress cypresses yew yews beech beeches poplar poplars
 aspen aspens sycamore sycamores chestnut chestnuts walnut hazel alder alders larch larches  juniper
 baobab banyan mangrove mangroves palm palms sapling saplings grove groves forest forests woods woodland
 woodlands jungle jungles rainforest rainforests   copse coppice treetop treetops
   bough boughs canopy timberland wildwood greenwood arbor arbour orchardist forester foresters
  rangers
 bonsai`, { stat: { hp: 1.3 } }),
  C('thorns', 'rapid', 'nature', 'poison:0.7', 'nature plant thorn', '🌵', 'Fires a hail of thorns',
    `           cactus cacti cactuses
 holly hollies    spine spines prickle prickles sticker stickers barb barbs  
 hedgehog    bramblebush porcupine porcupines   needle needles`),
  C('flowers', 'support', 'nature', 'heal', 'nature plant flower', '🌸', 'Soothes nearby towers with blossoms',
    `flower flowers rose roses lily lilies tulip tulips daisy daisies orchid orchids lotus lotuses poppy
 poppies iris irises jasmine lavender marigold marigolds sunflower sunflowers daffodil daffodils carnation
 carnations chrysanthemum petal petals blossom blossoms bloom blooms bouquet bouquets garden gardens
 meadow meadows dandelion dandelions buttercup buttercups bluebell bluebells  geranium geraniums
 hibiscus hyacinth magnolia peony peonies primrose snowdrop violet violets begonia azalea camellia
 gardenia lilac lilacs zinnia dahlia petunia wildflower wildflowers posy posies nosegay garland wreath
 gardener gardeners florist florists horticulture`),
  C('vines', 'trap', 'nature', 'slow', 'nature plant vine', '🌿', 'Snags passing foes in grasping vines',
    `vine vines ivy ivies creeper creepers tendril tendrils liana lianas kudzu root roots rootlet weed weeds
 moss mosses lichen lichens wisteria honeysuckle bindweed tangle tangles seaweed kelp algae tumbleweed
 mandrake
 `),
  C('fungi', 'aura', 'nature', 'poison', 'nature fungus poison', '🍄', 'Releases toxic spores',
    `mushroom mushrooms toadstool toadstools fungus fungi mold molds mould moulds spore spores mildew mildews
 puffball puffballs truffle truffles morel morels lichen mycelium rot rots blight blights canker smut
 yeast`),
  C('plants', 'harvest', 'nature', 'harvest.ink:0.95', 'nature plant farm', '🌱', 'Grows ink like a crop',
    `plant plants grass grasses herb herbs hay straw reed reeds bamboo clover fern ferns leaf leaves foliage
 sprout sprouts seed seeds bud buds shrub shrubs bush bushes sapwood stalk stalks stem stems  shoots
 seedling seedlings sod lawn lawns pasture pastures prairie prairies savanna savannah steppe heath heather
 bracken shamrock acorn acorns pinecone pinecones nut nuts kernel kernels grain grains wheat corn maize
 barley oats oat rye rice millet sorghum hops flax hemp cotton tobacco sugarcane
 yucca husk`),
  C('wood', 'harvest', 'nature', 'harvest.ink:0.85', 'nature wood material', '🪵', 'Stacks timber for ink',
    `wood woods     lumber timber timbers   firewood driftwood
 hardwood hardwoods softwood sawdust woodpile woodpiles woodshed twig twigs branch branches stick bark
 beam rafters rafter  posts pole poles   splint woodchip woodchips woodwork woodworker
 woodworking veneer plywood balsa mahogany ebony teak oakwood pinewood rosewood sandalwood
 `),
  C('seasons', 'support', 'nature', 'buff.rate', 'nature time season', '🍂', 'Turns the seasons to quicken nearby towers',
    `season seasons spring springtime autumn autumns fall harvesttime solstice equinox midsummer midwinter
 yuletide calendar almanac`),
];
