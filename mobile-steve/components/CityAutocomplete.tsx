import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { CitySuggestion, SEARCH_DEBOUNCE_MS, searchCities } from '@/services/citySearch';

interface Props {
  /** Ville saisie (texte libre, toujours modifiable). */
  value: string;
  onChangeText: (text: string) => void;
  /** Suggestion choisie dans la liste. */
  onSelect: (s: CitySuggestion) => void;
  /** Pays choisi (code ISO) : oriente la recherche. */
  countryCode?: string | null;
  placeholder?: string;
  error?: string | null;
  testID?: string;
  inputStyle?: TextInputProps['style'];
  onBlur?: () => void;
}

/**
 * Champ ville avec autocomplétion tolérante aux fautes (services/citySearch).
 * La saisie libre reste valable : une ville absente des suggestions est
 * enregistrée telle quelle. Anti-rebond de 400 ms ; la requête précédente
 * est annulée à chaque frappe.
 */
export default function CityAutocomplete({
  value,
  onChangeText,
  onSelect,
  countryCode,
  placeholder = 'Tapez votre ville',
  error,
  testID = 'city-input',
  inputStyle,
  onBlur,
}: Props) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // Texte qui vient d'être choisi : ne relance pas de recherche.
  const chosen = useRef<string | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (!open || q.length < 2 || chosen.current === value) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await searchCities(q, { countryCode, signal: ctrl?.signal }).catch(() => []);
      if (ctrl?.signal.aborted) return;
      setSuggestions(res);
      setLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl?.abort();
    };
  }, [value, countryCode, open]);

  const choose = (s: CitySuggestion) => {
    chosen.current = s.name;
    setOpen(false);
    setSuggestions([]);
    onSelect(s);
  };

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, inputStyle, error ? styles.inputError : null]}
          value={value}
          onChangeText={(t) => {
            chosen.current = null;
            setOpen(true);
            // La virgule sépare la ville du pays dans « Ville, Pays ».
            onChangeText(t.replace(/,/g, ' '));
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Laisse le temps au clic sur une suggestion (web).
            setTimeout(() => setOpen(false), 200);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.primary40}
          autoCorrect={false}
          autoCapitalize="words"
          autoComplete={(Platform.OS === 'web' ? 'address-level2' : 'postal-address-locality') as any}
          textContentType="addressCity"
          returnKeyType="done"
          accessibilityLabel="Ville"
          testID={testID}
        />
        {loading ? <ActivityIndicator size="small" color={Colors.primary.red} /> : null}
      </View>
      {error ? <Text style={styles.error} testID={`${testID}-error`}>{error}</Text> : null}
      {open && suggestions.length > 0 ? (
        <View style={styles.list} testID={`${testID}-suggestions`}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={`${s.name}-${s.countryCode}-${s.department ?? ''}-${i}`}
              style={[styles.item, i > 0 && styles.itemBorder]}
              onPress={() => choose(s)}
              activeOpacity={0.7}
              accessibilityRole="button"
              testID={`${testID}-suggestion-${i}`}
            >
              <MapPin size={16} color={Colors.primary.red} />
              <View style={styles.itemText}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {s.name}
                  {s.country && s.country.code !== countryCode ? `  ${s.country.flag}` : ''}
                </Text>
                {s.detail ? <Text style={styles.itemDetail} numberOfLines={1}>{s.detail}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
          {suggestions[0]?.source === 'local' ? (
            <Text style={styles.offline}>Hors ligne : suggestions de la liste BOLIGO.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 18,
    color: Colors.text.primary100,
    paddingVertical: 6,
  },
  inputError: { color: Colors.text.primary100 },
  error: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    color: Brand.danger,
    marginTop: 4,
  },
  list: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: 12,
    backgroundColor: Colors.neutral.white,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.neutral.border },
  itemText: { flex: 1, minWidth: 0 },
  itemName: { fontFamily: Typography.fontFamily.semiBold, fontSize: 15, color: Colors.text.primary100 },
  itemDetail: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.text.primary40, marginTop: 1 },
  offline: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.text.primary40,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
