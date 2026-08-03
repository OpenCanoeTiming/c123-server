# Canoe123 XML Format

This document describes the XML export format from Canoe123 (Siwidata) that C123 Server can read and serve via REST API.

> **Complete documentation:** For exhaustive XML format documentation, see `../c123-protocol-docs/c123-xml-format.md`.

---

## Overview

Canoe123 exports race data to an XML file that is continuously updated during the competition. C123 Server monitors this file and provides parsed data through REST API endpoints.

**Namespace:** `http://siwidata.com/Canoe123/Data.xsd`

---

## Main Sections

| Section | Description | REST Endpoint |
|---------|-------------|---------------|
| `Events` | Competition metadata (title, location, dates) | *not exposed directly* — event name via `/api/event` |
| `Participants` | Competitors and teams | `/api/xml/participants` |
| `Classes` | Race categories | *not exposed directly* — `classId` appears in `/api/xml/schedule` and `/api/xml/races` |
| `Schedule` | Race schedule | `/api/xml/schedule` |
| `Results` | Race results | `/api/xml/races/:id/results` |
| `CourseData` | Course configuration (gates) | `/api/xml/courses` |

> The endpoint list above is a convenience index, not the API reference.
> [REST-API.md](REST-API.md) is authoritative for routes, parameters and
> response shapes.

---

## XML Structure Examples

### Root Element

```xml
<?xml version="1.0" standalone="yes"?>
<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">
  <Events>...</Events>
  <Participants>...</Participants>
  <Classes>...</Classes>
  <Schedule>...</Schedule>
  <Results>...</Results>
</Canoe123Data>
```

### Events (Competition Metadata)

```xml
<Events>
  <EventId>CZE2.2024062500</EventId>
  <MainTitle>Czech Canoe Slalom Cup</MainTitle>
  <SubTitle>Race 1</SubTitle>
  <Location>Prague</Location>
  <Facility>Troja Whitewater Course</Facility>
  <StartDate>2024-06-25T08:00:00+02:00</StartDate>
  <EndDate>2024-06-27T18:00:00+02:00</EndDate>
  <CanoeDiscipline>Slalom</CanoeDiscipline>
  <TimeMode>Points100</TimeMode>
</Events>
```

### Participants (Competitors)

```xml
<Participants>
  <Id>60070.C1M.ZS</Id>
  <ClassId>C1M-ZS</ClassId>
  <EventBib>1</EventBib>
  <ICFId>60070</ICFId>
  <FamilyName>NOVAK</FamilyName>
  <GivenName>Jan</GivenName>
  <NOC>CZE</NOC>
  <Club>TJ Slavia Praha</Club>
  <Year>2010</Year>
  <CatId>ZS</CatId>
  <IsTeam>false</IsTeam>
</Participants>
```

C2 crews carry a second paddler in `FamilyName2` / `GivenName2` / `ICFId2`;
teams set `IsTeam` to `true` and reference their members in `Member1`-`Member3`.

### Classes (Race Categories)

```xml
<Classes>
  <ClassId>K1M-ZS</ClassId>
  <Class>K1 Senior Men</Class>
  <LongTitle>Kayak Senior Men</LongTitle>
  <Categories>
    <CatId>ZS</CatId>
    <ClassId>K1M-ZS</ClassId>
    <Category>Seniors</Category>
    <FirstYear>1990</FirstYear>
    <LastYear>2006</LastYear>
  </Categories>
</Classes>
```

### Schedule (Race Runs)

```xml
<Schedule>
  <RaceId>K1M-ZS_BR1_25</RaceId>
  <RaceOrder>10</RaceOrder>
  <StartTime>2024-06-25T13:30:00+02:00</StartTime>
  <Time>13:30:00</Time>
  <ClassId>K1M-ZS</ClassId>
  <DisId>BR1</DisId>
  <FirstBib>1</FirstBib>
  <StartInterval>1:00</StartInterval>
  <JuryNr>1</JuryNr>
  <CourseNr>1</CourseNr>
  <RaceStatus>5</RaceStatus>
</Schedule>
```

An optional `CustomTitle` carries a display name such as
`K1m - short track - 1st run`; there are no separate `MainTitle` / `SubTitle`
elements at schedule level.

**RaceStatus Values:**
| Value | Meaning |
|-------|---------|
| `0` | Not started |
| `3` | Running |
| `4` | Finished, results not yet official |
| `5` | Finished |

Values `0`, `3`, `4` and `5` all occur in the reference samples. Treat any
other value as unknown rather than assuming the list is exhaustive.

**DisId (Run Type):**
| Type | Description |
|------|-------------|
| `BR1` | Best Run - 1st Run |
| `BR2` | Best Run - 2nd Run |
| `TSR` | Team Single Run |
| `SR` | Single Run |
| `XT` / `X4` / `XS` / `XF` / `XER` | Kayak cross phases (time trial, heats, semi, final, elimination) |

`FIN`, `SEM` and `QUA` exist in Canoe123 for international formats but do not
appear in any sample we hold. See `../c123-protocol-docs/c123-xml-format.md`
for the full source-verified list.

### Results

```xml
<Results>
  <RaceId>K1M_ST_BR1_6</RaceId>
  <Id>12054.K1M_ST</Id>
  <StartOrder>1</StartOrder>
  <Bib>   1</Bib>
  <Status />
  <dtStart>08:30:10.780</dtStart>
  <dtFinish>08:31:27.770</dtFinish>
  <Time>76990</Time>
  <Gates>  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  2</Gates>
  <Pen>2</Pen>
  <Total>78990</Total>
  <Rnk>1</Rnk>
</Results>
```

**Time Values:** Run times are in milliseconds (76990 = 76.99 seconds).
- `Time`: Run time without penalties
- `Total`: Run time + penalty seconds, i.e. `Time + Pen × 1000`
- `Pen`: Total penalty in whole seconds (each gate touch = 2s, miss = 50s)

The rank element is `Rnk`, not `Rank`. BR2 rows additionally carry the first
run under the `Prev*` elements (`PrevTime`, `PrevTotal`, `PrevPen`, ...).

**Gates Format:** Fixed-width fields, three characters per gate, right-aligned
and space-padded — *not* comma-separated. A course with 24 gates yields a
72-character string, which is the reliable way to count gates:
- `0` = Clean
- `2` = Touch (2 second penalty)
- `50` = Miss (50 second penalty)

**Status Values:** A string, not a number. Empty (`<Status />`) for a valid run:

| Value | Meaning |
|-------|---------|
| *(empty)* | Finished, valid run |
| `DNS` | Did Not Start |
| `DNF` | Did Not Finish |
| `DSQ` | Disqualified |
| `RAL` | Rallied / re-run (seen in the 2024 LODM sample) |

This list is what occurs in the reference samples; treat unknown values as
invalid rather than assuming completeness.

---

## BR1/BR2 (Best Run Format)

Czech races typically use "Best Run" format where competitors have two runs and their better result counts.

**Race ID Pattern:** `{ClassId}_{DisId}_{DayOfMonth}`
- Example: `K1M_ST_BR1_6` = class `K1M_ST`, 1st run, 6th day of the month
- Example: `K1M-ZS_BR1_25` = class `K1M-ZS`, 1st run, 25th day of the month

The trailing number is the day of month, not a gate count: in
`xboardtest02_jarni_v1.xml` race `K1M_ST_BR1_6` starts `2024-04-06`, and in
`2024-LODM-fin.xml` race `K1M-ZS_BR1_25` starts `2024-06-25`. Do not parse it
for anything else — use the `Gates` field width to count gates.

**Important:** BR2 Results may contain BR1 values when BR1 was better. See [C123-PROTOCOL.md](C123-PROTOCOL.md#br1br2-two-run-handling) for details.

---

## Sample Files

For complete sample XML files, see:
- `../c123-protocol-docs/samples/xboardtest02_jarni_v1.xml` - Test data with multiple categories
- `../c123-protocol-docs/samples/2024-LODM-fin.xml` - Real competition data (incl. kayak cross and teams)

Every example and value list in this document was checked against those two
files.

---

## See Also

- [REST-API.md](REST-API.md) - XML data endpoints
- [C123-PROTOCOL.md](C123-PROTOCOL.md) - WebSocket protocol
- [INTEGRATION.md](INTEGRATION.md) - Scoreboard integration guide
