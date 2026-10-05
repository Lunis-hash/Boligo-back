# Polices de la marque

`PlusJakartaSans_*.ttf` sont les fichiers de `@expo-google-fonts/plus-jakarta-sans`
(licence SIL Open Font License 1.1), dont les ligatures standard (`liga`, `clig`,
`dlig` : « fi », « fl », « ff ») ont été désactivées. Le glyphe « fi » d'origine
s'affiche vide dans plusieurs navigateurs : « profil » devenait « profl ».

Régénérer après une mise à jour du paquet (Python, `pip install fonttools`) :

```python
from fontTools.ttLib import TTFont
for w in ['400Regular', '400Regular_Italic', '500Medium', '600SemiBold', '700Bold']:
    t = TTFont(f'node_modules/@expo-google-fonts/plus-jakarta-sans/{w}/PlusJakartaSans_{w}.ttf')
    for fr in t['GSUB'].table.FeatureList.FeatureRecord:
        if fr.FeatureTag in ('liga', 'clig', 'dlig'):
            fr.Feature.LookupListIndex = []
            fr.Feature.LookupCount = 0
    t.save(f'assets/fonts/PlusJakartaSans_{w}.ttf')
```
