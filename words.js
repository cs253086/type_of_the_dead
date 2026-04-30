// Age-appropriate word lists for a 9 year old.
// Bucketed by length so we can scale with level.
const WORDS = {
  short: [
    'cat', 'dog', 'sun', 'run', 'fun', 'big', 'red', 'top', 'hop', 'pop',
    'bat', 'rat', 'web', 'sky', 'fly', 'try', 'jam', 'fox', 'owl', 'pig',
    'cow', 'bee', 'log', 'jet', 'bug', 'mud', 'hat', 'map', 'cup', 'pen',
    'bag', 'box', 'leg', 'arm', 'eye', 'ear', 'jaw', 'fin', 'paw', 'hen',
    'ice', 'air', 'sea', 'mom', 'dad', 'kid', 'toy', 'bus', 'car', 'van'
  ],
  medium: [
    'apple', 'happy', 'green', 'house', 'mouse', 'tiger', 'sword', 'magic',
    'candy', 'water', 'storm', 'cloud', 'flame', 'ghost', 'witch', 'spell',
    'dream', 'pizza', 'ninja', 'robot', 'space', 'plane', 'beach', 'shark',
    'snake', 'bread', 'chair', 'table', 'paper', 'block', 'climb', 'crash',
    'jumpy', 'noisy', 'bright', 'shiny', 'spark', 'truck', 'plant', 'queen',
    'crown', 'knight', 'dragon', 'castle', 'rocket', 'planet', 'jungle',
    'forest', 'mighty', 'bouncy', 'lucky', 'silly', 'funny', 'tasty'
  ],
  long: [
    'adventure', 'mountain', 'butterfly', 'creature', 'mysterious',
    'underground', 'lightning', 'invisible', 'pumpkin', 'firework',
    'chocolate', 'spaghetti', 'crocodile', 'kangaroo', 'helicopter',
    'dinosaur', 'champion', 'fantastic', 'incredible', 'powerful',
    'dangerous', 'volcano', 'rainbow', 'umbrella', 'telescope',
    'submarine', 'astronaut', 'magician', 'wizardry', 'enchanted',
    'sparkling', 'galloping', 'thunder', 'wonderful', 'beautiful',
    'frightening', 'galaxy', 'satellite', 'expedition', 'guardian'
  ],
  // Boss phrases / tough words
  boss: [
    'tyrannosaurus', 'extraordinary', 'transformation', 'unbelievable',
    'congratulations', 'electromagnetic', 'misunderstanding',
    'archaeologist', 'characterization', 'overwhelmingly',
    'discombobulated', 'pterodactyl', 'rhinoceros', 'hippopotamus',
    'encyclopedia', 'accomplishment', 'investigation'
  ]
};

const MONSTER_EMOJIS = ['🧟', '👹', '👺', '👻', '💀', '👽', '🤖', '🦇', '🕷️', '🐺'];
const BOSS_EMOJIS = ['🐉', '👾', '🦖', '🦂', '🧛', '🧙‍♂️'];
const POWERUP_EMOJIS = {
  freeze: '❄️',
  bomb: '💣',
  heal: '💖'
};
