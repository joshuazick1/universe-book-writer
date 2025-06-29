# Harry Potter Universe Plugin

Official Harry Potter Universe plugin for the Multi-Universe Book Series Writing Assistant.

## Features

### 🏰 Magical World Systems
- **House System**: Full support for all four Hogwarts houses with individual themes
- **School Years**: Timeline based on Hogwarts academic calendar
- **Magical Transport**: Floo Network, Apparition, Portkeys, Knight Bus, and more
- **Blood Status**: Consideration of magical heritage in character creation
- **Ministry of Magic**: Legal and regulatory framework for magical society

### 🎨 House Themes
- **Hogwarts**: General magical theme with warm, academic atmosphere
- **Gryffindor**: Bold scarlet and gold theme for the brave
- **Hufflepuff**: Warm yellow and black theme for the loyal
- **Ravenclaw**: Elegant blue and bronze theme for the wise
- **Slytherin**: Sophisticated green and silver theme for the ambitious

### 🧙‍♂️ Magical Calculators
- **Transport Calculator**: Calculate travel times for different magical methods
- **School Year Calculator**: Determine current term, week, and major events
- **House Points Calculator**: Track house standings and point awards
- **Sorting Hat Calculator**: Determine house probability based on traits

### 📚 Sub-Universes
- **Books**: Original J.K. Rowling canon (strict)
- **Films**: Warner Bros film adaptations (flexible)
- **Extended**: Includes Fantastic Beasts, Cursed Child, Pottermore (flexible)
- **Custom**: Fan-created content and original stories (open)

## Era Support

### Founders Era (~1000 AD)
- Early days of Hogwarts
- Medieval magical society
- Founders' relationships and conflicts

### Marauders Era (1971-1978)
- James Potter, Lily Evans, Severus Snape
- First Wizarding War begins
- Voldemort's rise to power

### Harry Potter Era (1991-1998)
- Main story timeline
- Voldemort's return
- Second Wizarding War

### Next Generation (2017+)
- Harry's children at Hogwarts
- Post-war wizarding world
- New challenges and adventures

## Usage

```typescript
import { HarryPotterUniversePlugin } from '@universe-book-writer/harry-potter-universe';

const plugin = new HarryPotterUniversePlugin();

// Calculate magical transport
const transport = plugin.calculateMagicalTransport('floo', 500, 16, true);

// Determine Sorting Hat house
const sorting = plugin.calculateSortingHat({
  courage: 8,
  intelligence: 6,
  loyalty: 7,
  ambition: 5
});

// Get house theme
const theme = plugin.getHouseTheme('gryffindor');
```

## Configuration

```javascript
{
  "currentEra": "harry-potter",
  "schoolYear": 1991,
  "defaultHouse": "gryffindor",
  "magicalSystem": "wand-based",
  "defaultTheme": "hogwarts",
  "enableQuidditch": true,
  "enableMinistryLaw": true
}
```

## Magical Transport Methods

- **Floo Network**: Instantaneous via connected fireplaces
- **Apparition**: Teleportation for licensed wizards 17+
- **Portkey**: Ministry-approved scheduled transport
- **Knight Bus**: Emergency magical public transport
- **Flying**: Broomsticks and magical creatures
- **Hogwarts Express**: School train service

## House Characteristics

### Gryffindor 🦁
- **Traits**: Courage, Bravery, Nerve, Chivalry
- **Colors**: Scarlet and Gold
- **Element**: Fire
- **Ghost**: Nearly Headless Nick

### Hufflepuff 🦡
- **Traits**: Loyalty, Patience, Hard Work, Dedication
- **Colors**: Yellow and Black
- **Element**: Earth
- **Ghost**: Fat Friar

### Ravenclaw 🦅
- **Traits**: Intelligence, Wisdom, Learning, Wit
- **Colors**: Blue and Bronze
- **Element**: Air
- **Ghost**: Grey Lady

### Slytherin 🐍
- **Traits**: Ambition, Cunning, Leadership, Resourcefulness
- **Colors**: Green and Silver
- **Element**: Water
- **Ghost**: Bloody Baron

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm run test

# Development mode
npm run dev
```

## License

MIT - See LICENSE file for details.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
