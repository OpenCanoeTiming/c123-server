# Canoe123 XML Format

This document describes the XML export format from Canoe123 (Siwidata) that C123 Server can read and serve via REST API.

> **Complete documentation:** For exhaustive XML format documentation, see `analysis/c123-xml-format.md` in the analysis repository.

---

## Overview

Canoe123 exports race data to an XML file that is continuously updated during the competition. C123 Server monitors this file and provides parsed data through REST API endpoints.

**Namespace:** `http://siwidata.com/Canoe123/Data.xsd`

---

## Main Sections

| Section | Description | REST Endpoint |
|---------|-------------|---------------|
| `Events` | Competition metadata (title, location, dates) | `/api/xml/events` |
| `Participants` | Competitors and teams | `/api/xml/participants` |
| `Classes` | Race categories | `/api/xml/classes` |
| `Schedule` | Race schedule | `/api/xml/schedule` |
| `Results` | Race results | `/api/xml/races/:raceId/results` |
| `CourseData` | Course configuration (gates) | `/api/xml/course` |

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
  <Id>12345.K1M.ST</Id>
  <ClassId>K1M-ST</ClassId>
  <EventBib>42</EventBib>
  <FirstName>Jan</FirstName>
  <LastName>Novak</LastName>
  <Club>TJ Slavia Praha</Club>
  <Nation>CZE</Nation>
</Participants>
```

### Classes (Race Categories)

```xml
<Classes>
  <ClassId>K1M-ST</ClassId>
  <ShortName>K1m</ShortName>
  <LongName>K1 Men - Medium Course</LongName>
  <Boat>K1</Boat>
  <Gender>M</Gender>
</Classes>
```

### Schedule (Race Runs)

```xml
<Schedule>
  <RaceId>K1M_ST_BR1_6</RaceId>
  <ClassId>K1M-ST</ClassId>
  <Name>K1m - Medium Course - 1st Run</Name>
  <MainTitle>K1m - Medium Course</MainTitle>
  <SubTitle>1st Run</SubTitle>
  <RaceType>BR1</RaceType>
  <SortOrder>101</SortOrder>
  <Status>5</Status>
</Schedule>
```

**Race Status Values:**
| Value | Meaning |
|-------|---------|
| `0` | Not started |
| `3` | Running |
| `5` | Finished |

**Race Types:**
| Type | Description |
|------|-------------|
| `BR1` | Best Run - 1st Run |
| `BR2` | Best Run - 2nd Run |
| `FIN` | Final |
| `SEM` | Semifinal |
| `QUA` | Qualification |

### Results

```xml
<Results>
  <RaceId>K1M_ST_BR1_6</RaceId>
  <Rank>1</Rank>
  <Bib>42</Bib>
  <Pen>2</Pen>
  <Time>8532</Time>
  <TotalTime>8732</TotalTime>
  <Gates>0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0</Gates>
  <Status>0</Status>
</Results>
```

**Time Values:** All times are in centiseconds (1/100 second).
- `Time`: Run time without penalties
- `TotalTime`: Run time + penalty seconds (each gate touch = 2s, miss = 50s)
- `Pen`: Total penalty seconds

**Gates Format:** Comma-separated values per gate:
- `0` = Clean
- `2` = Touch (2 second penalty)
- `50` = Miss (50 second penalty)

**Status Values:**
| Value | Meaning |
|-------|---------|
| `0` | Finished |
| `1` | Did Not Start (DNS) |
| `2` | Did Not Finish (DNF) |
| `3` | Disqualified (DSQ) |

---

## BR1/BR2 (Best Run Format)

Czech races typically use "Best Run" format where competitors have two runs and their better result counts.

**Race ID Pattern:** `{ClassId}_{Course}_{RunType}_{Gates}`
- Example: `K1M_ST_BR1_6` = K1 Men, Short course, 1st Run, 6 gates

**Important:** BR2 Results may contain BR1 values when BR1 was better. See [C123-PROTOCOL.md](C123-PROTOCOL.md#br1br2-two-run-handling) for details.

---

## Sample Files

For complete sample XML files, see:
- `analysis/captures/xboardtest02_jarni_v1.xml` - Test data with multiple categories
- `analysis/captures/2024-LODM-fin.xml` - Real competition data

---

## See Also

- [REST-API.md](REST-API.md) - XML data endpoints
- [C123-PROTOCOL.md](C123-PROTOCOL.md) - WebSocket protocol
- [INTEGRATION.md](INTEGRATION.md) - Scoreboard integration guide
