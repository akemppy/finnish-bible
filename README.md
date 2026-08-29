# Raamattu — suomenkielinen lukija (+ KJV)

Staattinen, helppokäyttöinen Raamatun lukija GitHub Pagesille. Mukana kolme julkista käännöstä:

- **Biblia** — vuoden 1776 suomalainen Biblia
- **KR 1938** — Kirkkoraamattu 1933/1938
- **KJV** — King James Version (Authorized 1769), public domain

Ei tilejä, ei kommentteja, ei taustapalvelinta. Haku, viitehyppy (`Joh 3:16`, `1 Moos 1`, `John 3:16`) ja viimeisin kohta jäävät selaimeen (`localStorage`).

## Rinnakkain

Paina otsikon **Rinnakkain**-nappia. Vasemmalta valitaan ensisijainen käännös (haku käyttää tätä), oikealta toinen. Sama kirja ja luku näkyvät molemmissa ruuduissa; kirjanvalitsin ja luku-nuolet synkkaavat molemmat. Kapealla näytöllä ruudut pinoontuvat, työpöydällä ne ovat vierekkäin.

Osoite voi olla esim. `#biblia+kjv/jhn/3/16`.

## Avaa paikallisesti

Selain ei yleensä lataa JSON-tiedostoja `file://`-osoitteesta. Käynnistä kansioon pieni palvelin:

```bash
cd finnish-bible
python3 -m http.server 8080
```

Avaa sitten http://localhost:8080/

## GitHub Pages

1. Julkaise tämän kansion sisältö repositorion juureen (tai `/docs`).
2. Settings → Pages → Deploy from branch.
3. Sivusto aukeaa osoitteessa `https://<käyttäjä>.github.io/<repo>/`.

Sivun juuritiedosto on `index.html`. Älä poista `.nojekyll`-tiedostoa.

Pelkkä `index.html` tiedostona toimii myös: jos JSON-`fetch` estyy, sovellus lataa `data/biblia.js`, `data/kr1938.js` ja `data/kjv.js`.

## Tekstit

Käännökset on muunnettu tiiviiksi JSON-tiedostoiksi (`data/biblia.json`, `data/kr1938.json`, `data/kjv.json`) ja bundlattu sivustoon. Ajonaikana ei haeta tekstejä kolmansilta osapuolilta.

| Käännös | Kirjoja | Lukuja | Jakeita |
|---------|---------|--------|---------|
| Biblia 1776 | 66 | 1189 | 31102 |
| KR 1933/1938 | 66 | 1189 | 31090 (3 tyhjää jaetta lähteessä: Matt 17:21, Mark 11:26, Apt 28:29) |
| KJV 1769 | 66 | 1189 | 31102 |

Lähteet:

- Biblia 1776 USFM: https://github.com/refdoc/Archive-Bible-Finnish (`usfm/`)
- KR 1933/1938 USFM: https://github.com/raamattu/raamattu (`tekstit/`)
- KJV (Authorized 1769), public domain: https://github.com/aruljohn/Bible-kjv

Uudelleenmuunnos (valinnainen, vaatii lähde-zipit):

```bash
python3 scripts/convert.py
python3 scripts/convert_kjv.py
```

Jakeita ei ole keksitty: tyhjät jakeet KR 1938:ssa ovat lähteen tyhjiä `\v`-merkintöjä (myöhäisempiä lisäyksiä, joita tämä laitos ei sisällä).
