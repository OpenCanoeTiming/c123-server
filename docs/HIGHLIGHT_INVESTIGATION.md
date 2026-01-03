# Highlight při dojetí závodníka - Vyšetřování

**Datum:** 2026-01-02
**Status:** Nedořešeno - vyžaduje jiný přístup

---

## Problém

Při použití c123-serveru nefunguje highlight a scroll k výsledku závodníka po dojetí, zatímco při použití CLI to funguje správně.

---

## Klíčové zjištění

### Scoreboard nepoužívá HighlightBib přímo!

Scoreboard má **vlastní mechanismus detekce dojetí** v `ScoreboardContext.tsx`:

```tsx
// Detect finish by dtFinish transition (null -> timestamp)
for (const curr of newOnCourse) {
  const prevComp = state.onCourse.find(c => c.bib === curr.bib)
  if (prevComp && !prevComp.dtFinish && curr.dtFinish && curr.total) {
    // Competitor just finished - set pending highlight
    newState.pendingHighlightBib = curr.bib
    newState.pendingHighlightTotal = curr.total
    break
  }
}
```

A pak v `SET_RESULTS`:
```tsx
if (state.pendingHighlightBib && state.pendingHighlightTotal) {
  const result = action.results.find(r => r.bib.trim() === state.pendingHighlightBib)
  if (result && result.total === state.pendingHighlightTotal) {
    // Trigger highlight only when totals match exactly
    newState.highlightBib = state.pendingHighlightBib
    newState.highlightTimestamp = Date.now()
  }
}
```

**Klíčová podmínka:** `result.total === state.pendingHighlightTotal`

Highlight se spustí pouze když:
1. `dtFinish` se změní z null na timestamp (detekce dojetí)
2. `pendingHighlightTotal` (z oncourse) se **přesně rovná** `result.total` (z top zprávy)

---

## Rozdíly CLI vs C123 server

### Zachycené zprávy

| Pole | CLI | C123 server |
|------|-----|-------------|
| `Rank` v top | `"1"` (string) | `1` (number) → opraveno na string |
| `Pen` v top | `"8"` (string) | `8` (number) → opraveno na string |
| `RaceStatus` | `"In Progress"` | `"3"` |
| `Bib` v top | `"   9"` (padded) | `"   9"` (padded) ✓ |
| `dtStart`/`dtFinish` | lowercase | uppercase → opraveno na lowercase |
| Extra pole v CLI | `FamilyName`, `GivenName`, `myResult` | chybí |

### Struktura oncourse položky

Scoreboard parser (`parseCompetitor`) očekává:
- `Total` (ne `TotalTime`)
- `dtStart` lowercase
- `dtFinish` lowercase
- `Nat`, `RaceId`, `TTBDiff`, `TTBName`, `Rank`

---

## Provedené opravy

1. **HighlightBib typ:** `string` → `number`
2. **Bib padding:** přidán `padBib()` pro 4-znakový formát
3. **time/total typ:** `number` → `string` (zachování formátu z XML)
4. **Rank/Pen v top:** `number` → `string`
5. **dtStart/dtFinish:** uppercase → lowercase
6. **TotalTime → Total**
7. **Přidána pole:** `Nat`, `RaceId`, `TTBDiff`, `TTBName`

---

## Co NEFUNGOVALO

I po všech opravách highlight stále nefunguje. Pravděpodobné příčiny:

1. **Nesoulad `total` hodnot** - `pendingHighlightTotal` z oncourse se nerovná `result.total` z top zprávy
   - Možná jiný formát (desetinná místa, jednotky)
   - Možná timing - total se aktualizuje v jiný moment

2. **Chybějící nebo špatná `dtFinish` detekce** - scoreboard nedetekuje přechod null → timestamp

3. **Jiná struktura zpráv** - CLI možná posílá zprávy v jiném pořadí nebo s jinou frekvencí

---

## Možné další kroky

### Varianta A: Opravit c123-server
- Detailně porovnat `total` hodnoty z oncourse vs top v reálném čase
- Logovat v scoreboardu `pendingHighlightTotal` a `result.total` pro konkrétního závodníka
- Zjistit přesný formát a timing

### Varianta B: Upravit scoreboard
- Přidat fallback na `HighlightBib` z top zprávy (kromě dtFinish detekce)
- Scoreboard by mohl používat `HighlightBib` přímo když je nenulový

### Varianta C: CLI proxy
- C123 server pouze přeposílá CLI zprávy bez transformace
- Zachová 100% kompatibilitu s původním formátem

---

## Soubory k prozkoumání

### C123 server
- `src/output/MessageFormatter.ts` - formátování zpráv
- `src/output/types.ts` - typy zpráv
- `src/state/EventState.ts` - detekce dojetí, highlight logika

### Scoreboard
- `src/context/ScoreboardContext.tsx` - highlight logika (řádky 169-183, 255-266)
- `src/providers/utils/parseMessages.ts` - parsování `parseCompetitor()`
- `src/providers/utils/normalizeCompetitor.ts` - normalizace dat
- `src/hooks/useHighlight.ts` - hook pro highlight stav

---

## Debugovací příkazy

```bash
# Capture WebSocket zpráv z obou serverů
cat > scripts/ws-capture.ts << 'EOF'
import WebSocket from 'ws';
const c123 = new WebSocket('ws://192.168.68.108:27084');
const cli = new WebSocket('ws://192.168.68.108:8081');
// ... logging
EOF
npx tsx scripts/ws-capture.ts
```
