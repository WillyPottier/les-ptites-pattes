// ============================================================
//  Données enrichies + helpers SEO (source unique de logique)
// ============================================================
import site from '../data/site.json';
import servicesData from '../data/services.json';
import communesData from '../data/communes.json';

export { site };

export function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '-').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const services = servicesData.services.map((s) => ({ ...s, url: '/' + s.slug + '/' }));
// --- Publication progressive (drip) ---
// Une commune est "en ligne" si elle n'a pas de date de publication,
// ou si cette date est <= aujourd'hui (ou la date passée via BUILD_DATE).
const today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const allCommunes = communesData.communes.map((c, i) => ({ ...c, slug: slugify(c.name), idx: i }));
export const communesTotal = allCommunes.length;
export const communes = allCommunes.filter((c) => !c.publishAt || c.publishAt <= today);
export const communesPending = allCommunes.filter((c) => c.publishAt && c.publishAt > today).length;
export const home = communes.find((c) => c.home) || communes[0];
export const coreCommunes = communes.filter((c) => c.core);

export const urlCommuneHub = (c) => '/pet-sitter-' + c.slug + '/';
export const urlActLoc = (s, c) => '/' + s.slug + '-' + c.slug + '/';

export function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// communes voisines (fenêtre autour de l'index dans la liste ordonnée par proximité)
export function neighbors(c, n = 6) {
  return communes
    .filter((x) => x.slug !== c.slug)
    .map((x) => ({ x, d: Math.abs(x.idx - c.idx) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((o) => o.x);
}

// 4 variantes d'intro tournantes -> évite le contenu dupliqué mot pour mot
export const introVariants = [
  (s, c) => `Vous cherchez un service de ${s.keyword} à ${c.name} ? Basé à ${site.homeCity}, j'interviens à ${c.name} (${c.zone}) pour ${s.intent}.`,
  (s, c) => `À ${c.name}, je propose un service de ${s.keyword} attentif et personnalisé. ${s.intro} J'interviens à votre domicile à ${c.name} et dans les environs.`,
  (s, c) => `Besoin d'un professionnel pour la ${s.keyword} à ${c.name} (${c.zone}) ? Je me déplace à votre domicile pour ${s.intent}, en respectant scrupuleusement les habitudes de votre compagnon.`,
  (s, c) => `Confier son animal n'est jamais anodin. À ${c.name}, je propose un service de ${s.keyword} de confiance : ${s.intent}. Une visite de présentation est offerte avant toute première prestation.`,
];

export function introFor(service, commune) {
  return introVariants[hash(service.slug + commune.slug) % introVariants.length](service, commune);
}

// ---------- JSON-LD ----------
export function localBusinessLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': site.baseUrl + '/#business',
    name: site.name,
    telephone: '+' + site.phoneIntl,
    email: site.email,
    url: site.baseUrl + '/',
    areaServed: communes.slice(0, 30).map((c) => ({ '@type': 'City', name: c.name })),
    address: { '@type': 'PostalAddress', addressLocality: site.homeCity, addressRegion: 'Indre-et-Loire', addressCountry: 'FR' },
    priceRange: '€€',
    openingHours: 'Mo-Su 08:00-18:00',
  };
}

export function breadcrumbLD(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: site.baseUrl + t.path,
    })),
  };
}

export function serviceLD(svc, communeName, pageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: svc.label,
    provider: { '@id': site.baseUrl + '/#business' },
    areaServed: communeName ? { '@type': 'City', name: communeName } : 'Val de Loire',
    name: svc.label + (communeName ? ' à ' + communeName : ''),
    url: site.baseUrl + pageUrl,
  };
}

export function faqLD(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
