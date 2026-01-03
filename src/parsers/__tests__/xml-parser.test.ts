import { describe, it, expect } from 'vitest';
import {
  parseXmlMessage,
  parseOnCourse,
  parseResults,
  parseTimeOfDay,
  parseRaceConfig,
  parseSchedule,
} from '../xml-parser.js';

describe('parseXmlMessage', () => {
  it('parses OnCourse message', () => {
    const xml = `<Canoe123 System="Main">
      <OnCourse Total="1" Position="1">
        <Participant
          StartOrder="9"
          Bib="9"
          Id="30034.K1M_ST"
          Name="KOPEČEK Michal"
          Club="VS Tábor"
          Nat="CZE"
          Race="K1m - střední trať - 2. jízda"
          RaceId="K1M_ST_BR2_6"
          Warning="" />
        <Result
          Type="C"
          Gates="0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,"
          Completed="N"
          chStart="1"
          dtStart="16:14:00.000"
          dtFinish="" />
        <Result
          Type="T"
          Pen="54"
          Time="8115"
          Total="8169"
          TTBDiff="+12.79"
          TTBName="J. KREJČÍ"
          Rank="8" />
      </OnCourse>
    </Canoe123>`;

    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('oncourse');

    const data = results[0].data;
    expect(data).not.toBeNull();
    if (data && 'competitors' in data) {
      expect(data.total).toBe(1);
      expect(data.competitors).toHaveLength(1);

      const comp = data.competitors[0];
      expect(comp.bib).toBe('9');
      expect(comp.name).toBe('KOPEČEK Michal');
      expect(comp.club).toBe('VS Tábor');
      expect(comp.nat).toBe('CZE');
      expect(comp.raceId).toBe('K1M_ST_BR2_6');
      expect(comp.raceName).toBe('K1m - střední trať - 2. jízda');
      expect(comp.startOrder).toBe(9);
      expect(comp.gates).toBe('0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,');
      expect(comp.completed).toBe(false);
      expect(comp.dtStart).toBe('16:14:00.000');
      expect(comp.dtFinish).toBeNull();
      expect(comp.pen).toBe(54);
      expect(comp.time).toBe('8115');
      expect(comp.total).toBe('8169');
      expect(comp.ttbDiff).toBe('+12.79');
      expect(comp.ttbName).toBe('J. KREJČÍ');
      expect(comp.rank).toBe(8);
    }
  });

  it('parses Results message', () => {
    const xml = `<Canoe123 System="Main">
      <Results
        RaceId="K1M_ST_BR2_6"
        ClassId="K1M_ST"
        Current="Y"
        MainTitle="K1m - střední trať"
        SubTitle="1st and 2nd Run">
        <Row Number="1">
          <Participant
            Bib="1"
            Id="12054.K1M_ST"
            Name="KREJČÍ Jakub"
            Club="TJ DUKLA Praha"
            Nat=""
            GivenName="Jakub"
            FamilyName="KREJČÍ"
            StartOrder="1"
            StartTime="10:06:45" />
          <Result
            Type="T"
            HeatNr="0"
            Pen="2"
            Gates="0 0 0 0 0 0 0 0 0 0 0 0 2 0 2 0 2 0 0 0 0 0 0 0"
            Time="79.99"
            Total="78.99"
            Rank="1"
            Behind="" />
        </Row>
        <Row Number="2">
          <Participant
            Bib="5"
            Name="NOVÁK Jan"
            Club="SK Praha"
            GivenName="Jan"
            FamilyName="NOVÁK"
            StartOrder="5"
            StartTime="10:10:45" />
          <Result
            Type="T"
            Pen="0"
            Time="80.50"
            Total="80.50"
            Rank="2"
            Behind="+1.51" />
        </Row>
      </Results>
    </Canoe123>`;

    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('results');

    const data = results[0].data;
    expect(data).not.toBeNull();
    if (data && 'rows' in data) {
      expect(data.raceId).toBe('K1M_ST_BR2_6');
      expect(data.classId).toBe('K1M_ST');
      expect(data.isCurrent).toBe(true);
      expect(data.mainTitle).toBe('K1m - střední trať');
      expect(data.subTitle).toBe('1st and 2nd Run');
      expect(data.rows).toHaveLength(2);

      const row1 = data.rows[0];
      expect(row1.rank).toBe(1);
      expect(row1.bib).toBe('1');
      expect(row1.name).toBe('KREJČÍ Jakub');
      expect(row1.givenName).toBe('Jakub');
      expect(row1.familyName).toBe('KREJČÍ');
      expect(row1.club).toBe('TJ DUKLA Praha');
      expect(row1.startOrder).toBe(1);
      expect(row1.startTime).toBe('10:06:45');
      expect(row1.pen).toBe(2);
      expect(row1.time).toBe('79.99');
      expect(row1.total).toBe('78.99');
      expect(row1.behind).toBe('');

      const row2 = data.rows[1];
      expect(row2.rank).toBe(2);
      expect(row2.bib).toBe('5');
      expect(row2.behind).toBe('+1.51');
    }
  });

  it('parses TimeOfDay message', () => {
    const xml = `<Canoe123 System="Main">
      <TimeOfDay>19:04:20</TimeOfDay>
    </Canoe123>`;

    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('timeofday');

    const data = results[0].data;
    expect(data).not.toBeNull();
    if (data && 'time' in data) {
      expect(data.time).toBe('19:04:20');
    }
  });

  it('parses RaceConfig message', () => {
    const xml = `<Canoe123 System="Main">
      <RaceConfig
        NrSplits="0"
        NrGates="24"
        GateConfig="NNRNNRNRNNNRNNRNRNNRNNRN"
        GateCaptions="1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24" />
    </Canoe123>`;

    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('raceconfig');

    const data = results[0].data;
    expect(data).not.toBeNull();
    if (data && 'nrGates' in data) {
      expect(data.nrSplits).toBe(0);
      expect(data.nrGates).toBe(24);
      expect(data.gateConfig).toBe('NNRNNRNRNNNRNNRNRNNRNNRN');
      expect(data.gateCaptions).toBe('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24');
    }
  });

  it('parses Schedule message', () => {
    const xml = `<Canoe123 System="Main">
      <Schedule>
        <Race
          Order="101"
          RaceId="K1M_ST_BR1_6"
          Race="K1m - střední trať - 1. jízda"
          MainTitle="K1m - střední trať"
          SubTitle="1st Run"
          ShortTitle="K1m - střední trať - 1. jízda"
          RaceStatus="5">
          <StartTime />
        </Race>
        <Race
          Order="102"
          RaceId="K1M_ST_BR2_6"
          Race="K1m - střední trať - 2. jízda"
          MainTitle="K1m - střední trať"
          SubTitle="2nd Run"
          ShortTitle="K1m - střední trať - 2. jízda"
          RaceStatus="3">
          <StartTime />
        </Race>
      </Schedule>
    </Canoe123>`;

    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('schedule');

    const data = results[0].data;
    expect(data).not.toBeNull();
    if (data && 'races' in data) {
      expect(data.races).toHaveLength(2);

      const race1 = data.races[0];
      expect(race1.order).toBe(101);
      expect(race1.raceId).toBe('K1M_ST_BR1_6');
      expect(race1.race).toBe('K1m - střední trať - 1. jízda');
      expect(race1.mainTitle).toBe('K1m - střední trať');
      expect(race1.subTitle).toBe('1st Run');
      expect(race1.raceStatus).toBe(5);

      const race2 = data.races[1];
      expect(race2.order).toBe(102);
      expect(race2.raceStatus).toBe(3);
    }
  });

  it('returns unknown for invalid XML', () => {
    const xml = 'not xml at all';
    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('unknown');
    expect(results[0].data).toBeNull();
  });

  it('returns unknown for non-Canoe123 XML', () => {
    const xml = '<SomeOtherRoot><Data /></SomeOtherRoot>';
    const results = parseXmlMessage(xml);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('unknown');
  });
});

describe('parseOnCourse', () => {
  it('handles multiple competitors', () => {
    // Simulate parsed XML structure with nested OnCourse elements
    const element = {
      '@_Total': '2',
      OnCourse: [
        {
          '@_Position': '1',
          Participant: {
            '@_Bib': '9',
            '@_Name': 'KOPEČEK Michal',
            '@_Club': 'VS Tábor',
          },
          Result: [
            { '@_Type': 'C', '@_Gates': '0,0,2', '@_dtFinish': '' },
            { '@_Type': 'T', '@_Time': '5000', '@_Rank': '1' },
          ],
        },
        {
          '@_Position': '2',
          Participant: {
            '@_Bib': '10',
            '@_Name': 'NOVÁK Jan',
            '@_Club': 'SK Praha',
          },
          Result: [
            { '@_Type': 'C', '@_Gates': '0,0,0' },
            { '@_Type': 'T', '@_Time': '3000', '@_Rank': '2' },
          ],
        },
      ],
    };

    const result = parseOnCourse(element);
    expect(result).not.toBeNull();
    expect(result?.total).toBe(2);
    expect(result?.competitors).toHaveLength(2);
    expect(result?.competitors[0].bib).toBe('9');
    expect(result?.competitors[0].position).toBe(1);
    expect(result?.competitors[1].bib).toBe('10');
    expect(result?.competitors[1].position).toBe(2);
  });

  it('handles single competitor', () => {
    const element = {
      '@_Total': '1',
      '@_Position': '1',
      Participant: {
        '@_Bib': '5',
        '@_Name': 'TEST Name',
      },
      Result: { '@_Type': 'T', '@_Time': '6000' },
    };

    const result = parseOnCourse(element);
    expect(result).not.toBeNull();
    expect(result?.total).toBe(1);
    expect(result?.competitors).toHaveLength(1);
    expect(result?.competitors[0].bib).toBe('5');
  });

  it('returns null for invalid element', () => {
    expect(parseOnCourse(null)).toBeNull();
    expect(parseOnCourse(undefined)).toBeNull();
    expect(parseOnCourse('string')).toBeNull();
  });
});

describe('parseResults', () => {
  it('sorts results by rank', () => {
    const element = {
      '@_RaceId': 'TEST',
      '@_Current': 'N',
      Row: [
        {
          '@_Number': '3',
          Participant: { '@_Bib': '3' },
          Result: { '@_Type': 'T', '@_Rank': '3' },
        },
        {
          '@_Number': '1',
          Participant: { '@_Bib': '1' },
          Result: { '@_Type': 'T', '@_Rank': '1' },
        },
        {
          '@_Number': '2',
          Participant: { '@_Bib': '2' },
          Result: { '@_Type': 'T', '@_Rank': '2' },
        },
      ],
    };

    const result = parseResults(element);
    expect(result?.rows).toHaveLength(3);
    expect(result?.rows[0].rank).toBe(1);
    expect(result?.rows[1].rank).toBe(2);
    expect(result?.rows[2].rank).toBe(3);
  });

  it('uses Row Number as fallback rank', () => {
    const element = {
      '@_RaceId': 'TEST',
      Row: {
        '@_Number': '5',
        Participant: { '@_Bib': '99' },
        Result: { '@_Type': 'T' },
      },
    };

    const result = parseResults(element);
    expect(result?.rows[0].rank).toBe(5);
  });
});

describe('parseTimeOfDay', () => {
  it('parses string value', () => {
    expect(parseTimeOfDay('10:30:00')?.time).toBe('10:30:00');
  });

  it('parses object with text content', () => {
    expect(parseTimeOfDay({ '#text': '12:45:30' })?.time).toBe('12:45:30');
  });

  it('returns null for null/undefined', () => {
    expect(parseTimeOfDay(null)).toBeNull();
    expect(parseTimeOfDay(undefined)).toBeNull();
  });
});

describe('parseRaceConfig', () => {
  it('parses all attributes', () => {
    const element = {
      '@_NrSplits': '2',
      '@_NrGates': '20',
      '@_GateConfig': 'NRNRNRNRNRNRNRNRNRNR',
      '@_GateCaptions': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20',
    };

    const result = parseRaceConfig(element);
    expect(result?.nrSplits).toBe(2);
    expect(result?.nrGates).toBe(20);
    expect(result?.gateConfig).toBe('NRNRNRNRNRNRNRNRNRNR');
  });

  it('defaults missing values to 0 or empty string', () => {
    const result = parseRaceConfig({});
    expect(result?.nrSplits).toBe(0);
    expect(result?.nrGates).toBe(0);
    expect(result?.gateConfig).toBe('');
  });
});

describe('parseSchedule', () => {
  it('handles single race', () => {
    const element = {
      Race: {
        '@_Order': '1',
        '@_RaceId': 'K1M',
        '@_RaceStatus': '3',
      },
    };

    const result = parseSchedule(element);
    expect(result?.races).toHaveLength(1);
    expect(result?.races[0].raceId).toBe('K1M');
    expect(result?.races[0].raceStatus).toBe(3);
  });

  it('handles empty schedule', () => {
    const result = parseSchedule({});
    expect(result?.races).toHaveLength(0);
  });
});
