# Home Assistant -paketit

YAML-tiedostot kopioidaan Home Assistantin `config/packages/`-hakemistoon.

## Käyttöönotto

1. Kopioi `packages/*.yaml` → HA:n `config/packages/`
2. Varmista että `configuration.yaml` sisältää:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

3. **Asetukset → Järjestelmä → YAML-konfiguraation lataus**

## Tiedostot

| Tiedosto | Kuvaus |
|----------|--------|
| `packages/packages-keittio_ilp.yaml` | Keittiön ilmalämpöpumppu |
| `packages/packages-aurinkolampo.yaml` | Aurinkolämmön kWh-seuranta |
| `lovelace/lovelace-snippet-aurinkolampo-kwh.yaml` | Chipit/kortti lämmitysnäkymään |

## Virhe "Failed to load file / not_found"

Tämä tulee jos HA:n tiedostoeditorissa yritetään avata tiedostoa jota **ei ole vielä HA:n levyllä**.
Ratkaisu: kopioi tiedostot ensin `config/packages/`-kansioon (scp, Samba, File editor upload), **sitten** lataa YAML.
