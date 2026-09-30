export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  placeholder: string;
  regions: string[];
}

// ─── Base de données complète des pays & indicatifs ─────────────────
export const COUNTRIES: Country[] = [
  // ── Europe ──
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', placeholder: '06 12 34 56 78', regions: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Strasbourg', 'Lille', 'Nice', 'Rennes', 'Montpellier'] },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32', placeholder: '0470 12 34 56', regions: ['Bruxelles', 'Anvers', 'Gand', 'Liège', 'Bruges', 'Namur', 'Charleroi', 'Mons'] },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', dialCode: '+41', placeholder: '079 123 45 67', regions: ['Genève', 'Lausanne', 'Zurich', 'Berne', 'Bâle', 'Lucerne', 'Fribourg', 'Neuchâtel'] },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352', placeholder: '621 123 456', regions: ['Luxembourg-Ville', 'Esch-sur-Alzette', 'Differdange', 'Dudelange'] },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', dialCode: '+377', placeholder: '06 12 34 56 78', regions: ['Monaco', 'Monte-Carlo', 'La Condamine', 'Fontvieille'] },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44', placeholder: '07123 456789', regions: ['Londres', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Édimbourg', 'Glasgow'] },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49', placeholder: '0151 1234567', regions: ['Berlin', 'Hambourg', 'Munich', 'Francfort', 'Cologne', 'Stuttgart', 'Düsseldorf'] },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', dialCode: '+34', placeholder: '612 34 56 78', regions: ['Madrid', 'Barcelone', 'Valence', 'Séville', 'Malaga', 'Bilbao'] },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', dialCode: '+39', placeholder: '312 345 6789', regions: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Bologne', 'Palerme'] },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351', placeholder: '912 345 678', regions: ['Lisbonne', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Funchal'] },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dialCode: '+31', placeholder: '06 12345678', regions: ['Amsterdam', 'Rotterdam', 'La Haye', 'Utrecht', 'Eindhoven'] },
  { code: 'SE', name: 'Suède', flag: '🇸🇪', dialCode: '+46', placeholder: '070 123 45 67', regions: ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala'] },
  { code: 'NO', name: 'Norvège', flag: '🇳🇴', dialCode: '+47', placeholder: '412 34 567', regions: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'] },
  { code: 'DK', name: 'Danemark', flag: '🇩🇰', dialCode: '+45', placeholder: '20 12 34 56', regions: ['Copenhague', 'Aarhus', 'Odense', 'Aalborg'] },
  { code: 'IE', name: 'Irlande', flag: '🇮🇪', dialCode: '+353', placeholder: '085 123 4567', regions: ['Dublin', 'Cork', 'Galway', 'Limerick'] },
  { code: 'AT', name: 'Autriche', flag: '🇦🇹', dialCode: '+43', placeholder: '0664 1234567', regions: ['Vienne', 'Salzbourg', 'Graz', 'Innsbruck', 'Linz'] },
  { code: 'PL', name: 'Pologne', flag: '🇵🇱', dialCode: '+48', placeholder: '512 345 678', regions: ['Varsovie', 'Cracovie', 'Wrocław', 'Gdańsk', 'Poznań'] },
  { code: 'RO', name: 'Roumanie', flag: '🇷🇴', dialCode: '+40', placeholder: '0712 345 678', regions: ['Bucarest', 'Cluj-Napoca', 'Timișoara', 'Iași'] },
  { code: 'GR', name: 'Grèce', flag: '🇬🇷', dialCode: '+30', placeholder: '691 234 5678', regions: ['Athènes', 'Thessalonique', 'Patras', 'Héraklion'] },

  // ── Afrique ──
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225', placeholder: '07 01 02 03 04', regions: ['Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Yamoussoukro', 'San-Pédro', 'Divo', 'Gagnoa'] },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221', placeholder: '77 123 45 67', regions: ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Touba', 'Mbour'] },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237', placeholder: '6 71 23 45 67', regions: ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda', 'Maroua', 'Kribi'] },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212', placeholder: '06 12 34 56 78', regions: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Oujda'] },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dialCode: '+213', placeholder: '05 12 34 56 78', regions: ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna'] },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216', placeholder: '98 123 456', regions: ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès'] },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223', placeholder: '71 23 45 67', regions: ['Bamako', 'Sikasso', 'Mopti', 'Gao', 'Kayes', 'Ségou'] },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', dialCode: '+224', placeholder: '621 12 34 56', regions: ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé'] },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228', placeholder: '90 12 34 56', regions: ['Lomé', 'Sokodé', 'Kara', 'Atakpamé', 'Bassar', 'Tsévié'] },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229', placeholder: '97 12 34 56', regions: ['Cotonou', 'Porto-Novo', 'Parakou', 'Djougou', 'Bohicon', 'Abomey'] },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226', placeholder: '70 12 34 56', regions: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora'] },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227', placeholder: '90 12 34 56', regions: ['Niamey', 'Zinder', 'Maradi', 'Tahoua', 'Agadez'] },
  { code: 'CD', name: 'Congo RDC', flag: '🇨🇩', dialCode: '+243', placeholder: '81 123 4567', regions: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma', 'Bukavu'] },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242', placeholder: '06 123 4567', regions: ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi'] },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241', placeholder: '074 12 34 56', regions: ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem'] },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dialCode: '+261', placeholder: '034 12 345 67', regions: ['Antananarivo', 'Toamasina', 'Antsirabe', 'Mahajanga'] },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250', placeholder: '078 123 4567', regions: ['Kigali', 'Butare', 'Gisenyi', 'Ruhengeri'] },
  { code: 'MU', name: 'Maurice', flag: '🇲🇺', dialCode: '+230', placeholder: '5123 4567', regions: ['Port-Louis', 'Beau-Bassin', 'Vacoas', 'Curepipe'] },

  // ── Amériques & Outre-Mer ──
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', placeholder: '514 123 4567', regions: ['Montréal', 'Québec', 'Toronto', 'Vancouver', 'Ottawa', 'Calgary'] },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1', placeholder: '202 555 0123', regions: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Atlanta'] },
  { code: 'HT', name: 'Haïti', flag: '🇭🇹', dialCode: '+509', placeholder: '34 12 3456', regions: ['Port-au-Prince', 'Cap-Haïtien', 'Les Cayes', 'Gonaïves'] },
  { code: 'MQ', name: 'Martinique', flag: '🇲🇶', dialCode: '+596', placeholder: '0696 12 34 56', regions: ['Fort-de-France', 'Le Lamentin', 'Schoelcher', 'Sainte-Marie'] },
  { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵', dialCode: '+590', placeholder: '0690 12 34 56', regions: ['Pointe-à-Pitre', 'Les Abymes', 'Baie-Mahault', 'Le Gosier'] },
  { code: 'RE', name: 'La Réunion', flag: '🇷🇪', dialCode: '+262', placeholder: '0692 12 34 56', regions: ['Saint-Denis', 'Saint-Paul', 'Saint-Pierre', 'Le Tampon'] },
  { code: 'GF', name: 'Guyane', flag: '🇬🇫', dialCode: '+594', placeholder: '0694 12 34 56', regions: ['Cayenne', 'Matoury', 'Saint-Laurent-du-Maroni', 'Kourou'] },
];

// ─── Détection Dynamique du Pays Utilisateur ────────────────────────
export function detectUserCountry(): Country {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    
    // Mapping Timezone vers Code Pays
    if (timeZone.startsWith('Europe/Paris') || timeZone.startsWith('Europe/Monaco')) {
      return COUNTRIES.find(c => c.code === 'FR') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Brussels')) {
      return COUNTRIES.find(c => c.code === 'BE') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Zurich')) {
      return COUNTRIES.find(c => c.code === 'CH') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Luxembourg')) {
      return COUNTRIES.find(c => c.code === 'LU') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/London')) {
      return COUNTRIES.find(c => c.code === 'GB') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Berlin')) {
      return COUNTRIES.find(c => c.code === 'DE') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Madrid')) {
      return COUNTRIES.find(c => c.code === 'ES') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Rome')) {
      return COUNTRIES.find(c => c.code === 'IT') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Lisbon')) {
      return COUNTRIES.find(c => c.code === 'PT') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Europe/Amsterdam')) {
      return COUNTRIES.find(c => c.code === 'NL') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Africa/Abidjan')) {
      return COUNTRIES.find(c => c.code === 'CI') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Africa/Dakar')) {
      return COUNTRIES.find(c => c.code === 'SN') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Africa/Douala')) {
      return COUNTRIES.find(c => c.code === 'CM') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Africa/Casablanca')) {
      return COUNTRIES.find(c => c.code === 'MA') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Africa/Algiers')) {
      return COUNTRIES.find(c => c.code === 'DZ') || COUNTRIES[0];
    }
    if (timeZone.startsWith('Africa/Tunis')) {
      return COUNTRIES.find(c => c.code === 'TN') || COUNTRIES[0];
    }
    if (timeZone.startsWith('America/Montreal') || timeZone.startsWith('America/Toronto') || timeZone.startsWith('America/Vancouver')) {
      return COUNTRIES.find(c => c.code === 'CA') || COUNTRIES[0];
    }
    if (timeZone.startsWith('America/New_York') || timeZone.startsWith('America/Chicago') || timeZone.startsWith('America/Los_Angeles')) {
      return COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0];
    }
  } catch (e) {
    console.log('Error detecting timezone country:', e);
  }

  // Par défaut : France (ou premier pays d'Europe)
  return COUNTRIES.find(c => c.code === 'FR') || COUNTRIES[0];
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());
}

export function getCountryByDialCode(dialCode: string): Country | undefined {
  const clean = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  return COUNTRIES.find(c => c.dialCode === clean);
}
