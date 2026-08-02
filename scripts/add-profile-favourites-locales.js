const fs = require('fs');

const enPath = 'src/locales/en.json';
const frPath = 'src/locales/fr.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

en.profile.favourites = 'Favourites';
en.profile.favouritesSub = 'View & manage your saved listings';

fr.profile.favourites = 'Favoris';
fr.profile.favouritesSub = 'Voir et gérer vos annonces enregistrées';

fs.writeFileSync(enPath, JSON.stringify(en));
fs.writeFileSync(frPath, JSON.stringify(fr));

console.log('verified:', en.profile.favourites, '/', fr.profile.favourites);

