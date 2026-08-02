const fs = require('fs');

const enPath = 'src/locales/en.json';
const frPath = 'src/locales/fr.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

en.favourites = {
  title: 'Favourites',
  listing: 'listing',
  listings: 'listings',
  loading: 'Loading your favourites…',
  emptyTitle: 'No favourites yet',
  emptyDesc: 'Tap the heart on any property to save it here.',
  explore: 'Explore Properties',
  loginTitle: 'Login Required',
  loginDesc: 'Please log in to save properties to your favourites.',
};

fr.favourites = {
  title: 'Favoris',
  listing: 'annonce',
  listings: 'annonces',
  loading: 'Chargement de vos favoris…',
  emptyTitle: 'Aucun favori pour l’instant',
  emptyDesc: 'Appuyez sur le cœur d’un bien pour l’enregistrer ici.',
  explore: 'Explorer les biens',
  loginTitle: 'Connexion requise',
  loginDesc: 'Veuillez vous connecter pour enregistrer des biens dans vos favoris.',
};

fs.writeFileSync(enPath, JSON.stringify(en));
fs.writeFileSync(frPath, JSON.stringify(fr));

console.log('verified en.favourites:', JSON.stringify(en.favourites));
console.log('verified fr.favourites:', JSON.stringify(fr.favourites));

