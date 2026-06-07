# Les P'tites Pattes de Chinon — site Astro (sortie 100 % statique)

Site de pet-sitting à SEO programmatique (**activité × localité**), construit avec **Astro**.
La sortie est du **HTML statique pur** : aucun serveur, aucune base de données en production.
Astro n'est qu'un outil de build qui tourne au moment du déploiement.

```bash
npm install
npm run dev       # http://localhost:4321  (développement)
npm run build     # génère le site statique dans dist/
npm run preview   # prévisualise le build
```

> ⚠️ Versions figées : `astro@^4.16` + `@astrojs/sitemap@3.2.1`.
> (Le plugin sitemap 3.7.x est prévu pour Astro 5 et casse le build sur Astro 4 — d'où le pin.)

---

## Ce que produit le build (`dist/`)

| Type de page | URL | Nombre |
|---|---|---|
| Accueil | `/` | 1 |
| Hub de service | `/garde-de-chien/` … | 4 |
| Hub de commune | `/pet-sitter-{commune}/` | 74 |
| Activité × localité | `/{service}-{commune}/` | 296 |
| Mentions légales | `/mentions-legales/` | 1 |
| **Total** | | **376 pages** |

\+ `sitemap-index.xml` et `sitemap-0.xml` générés **automatiquement** par `@astrojs/sitemap`
(plus besoin de les maintenir à la main), et `robots.txt` (dans `public/`).

---

## Architecture (anti « doorway pages »)

Rappel des deux points validés côté SEO :

1. **Être dans le sitemap ≠ être indexé.** Le sitemap aide à la *découverte* ; Google indexe
   ensuite selon la qualité, le maillage interne et l'autorité du domaine.
2. **Le risque doorway pages** : des centaines de pages quasi identiques où l'on ne change que
   la ville sont considérées comme du spam par Google.

Le site répond par une structure **hub-and-spoke** + maillage dense :

- Chaque page granulaire est reliée à son **hub de service**, son **hub de commune**, ses
  **pages sœurs** et les **communes voisines** → aucune page orpheline.
- **Contenu différencié** : 4 variantes d'intro tournantes, contenu propre par service, FAQ
  spécifiques, département réel affiché.
- **Schema.org** par page : `LocalBusiness`, `Service` (avec `areaServed`), `BreadcrumbList`,
  `FAQPage`.
- **Métadonnées uniques** (title, description, canonical, Open Graph) sur chaque page.

> Recommandation : **ne pas publier les 296 pages d'un coup**. Commencer par les communes du
> cœur de cible (`"core": true` dans `communes.json`), enrichir avec du vrai contenu local,
> récolter de vrais avis, et soigner la fiche Google Business Profile.

---

## Structure du projet

```
.
├── astro.config.mjs          ← site URL + trailingSlash + intégration sitemap
├── package.json
├── public/
│   ├── robots.txt
│   └── js/                   (assets statiques copiés tels quels)
└── src/
    ├── data/
    │   ├── site.json         ← coordonnées, mots-clés, crédentials, réseaux
    │   ├── services.json     ← les 4 activités (textes, tarifs, FAQ)
    │   └── communes.json     ← les 74 communes (nom, département, cœur de cible)
    ├── lib/
    │   └── seo.js            ← données enrichies + helpers (slugs, voisines, JSON-LD…)
    ├── styles/
    │   └── global.css        ← charte graphique V1 (importée par le layout)
    ├── layouts/
    │   └── Base.astro        ← head, meta, JSON-LD, header/footer, menu mobile
    ├── components/
    │   ├── Header.astro  Footer.astro  Breadcrumb.astro  Cta.astro
    │   ├── ServiceCard.astro  TarifCard.astro
    │   └── LinkGrid.astro  ChipLinks.astro  Faq.astro
    └── pages/
        ├── index.astro              ← l'accueil
        └── [slug]/index.astro       ← LE MOTEUR : getStaticPaths() génère
                                        les 4 hubs service + 74 hubs commune
                                        + 296 pages activité×localité + légales
```

On édite **les données et les composants**, jamais `dist/` (régénéré à chaque build).

---

## Faire évoluer le site

- **Ajouter une commune** → une ligne dans `src/data/communes.json` → `npm run build`
  (génère son hub + 4 pages service, met à jour le sitemap et le maillage).
- **Ajouter un service** → un objet dans `src/data/services.json` (1 hub + 74 pages).
- **Tarifs / textes / FAQ** → `src/data/services.json`.
- **Style** → `src/styles/global.css`.
- **Coordonnées / réseaux** → `src/data/site.json`.

⚠️ Les **départements** dans `communes.json` ont été assignés par regroupement automatique :
à vérifier commune par commune avant mise en production.

---

## Mise en ligne

Hébergeur statique (Netlify, Vercel, Cloudflare Pages, GitHub Pages, o2switch en statique…) :

1. Connecter le dépôt, commande de build `npm run build`, dossier de publication `dist/`.
   (ou builder en local et uploader le contenu de `dist/`.)
2. Vérifier que `site:` dans `astro.config.mjs` correspond au domaine final
   (il alimente canonical, Open Graph et le sitemap).
3. **Google Search Console** : ajouter la propriété, soumettre `sitemap-index.xml`,
   puis suivre l'indexation réelle dans le rapport « Pages ».

---

## Publication progressive automatique (drip)

Par défaut, `communes.json` n'a aucune date → les 376 pages sont publiées.
Pour étaler la publication (recommandé en SEO), activer le mode goutte-à-goutte :

```bash
node scripts/schedule.mjs          # attribue des dates par vagues (10 communes/semaine)
node scripts/schedule.mjs --reset  # repasse en "tout publié"
```

- Les communes `core` restent en ligne immédiatement.
- Les autres reçoivent un `publishAt` (lundi par lundi).
- Le moteur ne génère QUE les communes dont la date est arrivée
  (les autres sont absentes du site ET du sitemap → pas de page orpheline).
- Un **build hebdomadaire** révèle chaque vague tout seul (voir ci-dessous).

### Le robot hebdomadaire (`.github/workflows/scheduled-build.yml`)

Chaque lundi 06:00 UTC, une GitHub Action appelle un **build hook Netlify**
(une URL secrète qui relance le build). Comme la date a avancé, les communes de la
nouvelle vague passent en ligne — sans aucune action manuelle.

Mise en place : créer le build hook côté Netlify, puis l'ajouter en secret GitHub
nommé `NETLIFY_BUILD_HOOK` (Settings → Secrets and variables → Actions).

---

## Déploiement Netlify (gratuit) — résumé

1. Pousser le projet sur GitHub.
2. Netlify → *Add new site* → *Import from GitHub* → choisir le dépôt.
3. Build command : `npm run build` · Publish directory : `dist` → *Deploy*.
4. Vérifier `site:` dans `astro.config.mjs` = domaine final.
5. *Site settings → Build & deploy → Build hooks* → créer un hook → copier l'URL
   dans le secret GitHub `NETLIFY_BUILD_HOOK`.
6. Search Console → soumettre `sitemap-index.xml`.

L'offre gratuite (≈300 build minutes ou 300 crédits/mois selon l'ancienneté du compte)
couvre très largement un build hebdomadaire + les pushes de développement.
