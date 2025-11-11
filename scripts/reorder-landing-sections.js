const fs = require('fs');

// Read the file
const filePath = './components/PublicGigBrowser.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Define section markers and their line ranges (0-indexed)
const sections = {
  beforeHero: { start: 0, end: null },
  hero: { start: null, end: null },
  features: { start: null, end: null },
  stats: { start: null, end: null },
  howItWorks: { start: null, end: null },
  testimonials: { start: null, end: null },
  faq: { start: null, end: null },
  gigs: { start: null, end: null },
  modal: { start: null, end: null },
  footer: { start: null, end: null }
};

// Find section boundaries
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('{/* Feature Highlights */}')) {
    sections.features.start = i;
    sections.hero.end = i - 1;
  } else if (line.includes('{/* Stats Section */}')) {
    sections.stats.start = i;
    if (sections.features.start !== null) sections.features.end = i - 1;
  } else if (line.includes('{/* How It Works Section */}')) {
    sections.howItWorks.start = i;
    sections.stats.end = i - 1;
  } else if (line.includes('{/* Testimonials Section */}')) {
    sections.testimonials.start = i;
    sections.howItWorks.end = i - 1;
  } else if (line.includes('{/* FAQ Section */}')) {
    sections.faq.start = i;
    sections.testimonials.end = i - 1;
  } else if (line.includes('{/* Gigs Section */}')) {
    sections.gigs.start = i;
    sections.faq.end = i - 1;
  } else if (line.includes('{/* Application Form Modal/Overlay */}')) {
    sections.modal.start = i;
    sections.gigs.end = i - 1;
  } else if (line.includes('{/* Footer */}')) {
    sections.footer.start = i;
    sections.modal.end = i - 1;
  }
}

sections.beforeHero.end = sections.features.start - 1;
sections.footer.end = lines.length - 1;

// Extract sections
const getSection = (name) => {
  const sec = sections[name];
  if (sec.start === null || sec.end === null) return [];
  return lines.slice(sec.start, sec.end + 1);
};

// Build new content in desired order:
// beforeHero → hero → gigs → stats → howItWorks → testimonials → faq → modal → footer
const newLines = [
  ...lines.slice(sections.beforeHero.start, sections.beforeHero.end + 1),
  ...getSection('gigs'),
  '',  // blank line
  ...getSection('stats'),
  '',  // blank line
  ...getSection('howItWorks'),
  '',  // blank line
  ...getSection('testimonials'),
  '',  // blank line
  ...getSection('faq'),
  '',  // blank line
  ...getSection('modal'),
  '',  // blank line
  ...getSection('footer')
];

// Remove featuresRef from hooks
const finalLines = newLines.map(line => {
  if (line.includes("const { ref: featuresRef, isInView: featuresInView } = useInView()")) {
    return '';  // Remove this line
  }
  return line;
}).filter((line, index, arr) => {
  // Remove duplicate blank lines
  if (line === '' && arr[index - 1] === '') return false;
  return true;
});

// Write back
fs.writeFileSync(filePath, finalLines.join('\n'), 'utf8');
console.log('✓ Sections reordered successfully');
console.log('New order: Hero → Gigs → Stats → How It Works → Testimonials → FAQ → Footer');
