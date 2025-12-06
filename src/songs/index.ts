/**
 * Built-in Public Domain Songs
 *
 * Simple, well-known melodies for practice.
 * All songs are in the public domain.
 *
 * @module songs
 */

export interface BuiltInSong {
  id: string;
  title: string;
  composer: string;
  difficulty: 'beginner' | 'easy' | 'intermediate';
  xml: string;
}

/**
 * Mary Had a Little Lamb
 * Traditional nursery rhyme (public domain)
 * Very simple - great for absolute beginners
 */
const MARY_HAD_A_LITTLE_LAMB: BuiltInSong = {
  id: 'mary-lamb',
  title: 'Mary Had a Little Lamb',
  composer: 'Traditional',
  difficulty: 'beginner',
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Mary Had a Little Lamb</work-title></work>
  <identification><creator type="composer">Traditional</creator></identification>
  <part-list><score-part id="P1"><part-name print-object="no">Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="4">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="5">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="6">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="7">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="8">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`,
};

/**
 * Twinkle Twinkle Little Star
 * Traditional nursery rhyme (public domain)
 * Simple melody in C major
 */
const TWINKLE_TWINKLE: BuiltInSong = {
  id: 'twinkle',
  title: 'Twinkle Twinkle Little Star',
  composer: 'Traditional',
  difficulty: 'beginner',
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Twinkle Twinkle Little Star</work-title></work>
  <identification><creator type="composer">Traditional</creator></identification>
  <part-list><score-part id="P1"><part-name print-object="no">Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="4">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="5">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="6">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="7">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="8">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="9">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="10">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="11">
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="12">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`,
};

/**
 * Ode to Joy
 * Ludwig van Beethoven - Symphony No. 9 (public domain)
 * Simplified arrangement in C major
 */
const ODE_TO_JOY: BuiltInSong = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  composer: 'Ludwig van Beethoven',
  difficulty: 'beginner',
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Ode to Joy</work-title></work>
  <identification><creator type="composer">Ludwig van Beethoven</creator></identification>
  <part-list><score-part id="P1"><part-name print-object="no">Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="4">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="5">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="6">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="7">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
    <measure number="8">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><rest/><duration>4</duration><type>whole</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`,
};

/**
 * Happy Birthday
 * Traditional (public domain as of 2016)
 * In 3/4 time, C major
 */
const HAPPY_BIRTHDAY: BuiltInSong = {
  id: 'happy-birthday',
  title: 'Happy Birthday',
  composer: 'Traditional',
  difficulty: 'easy',
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Happy Birthday</work-title></work>
  <identification><creator type="composer">Traditional</creator></identification>
  <part-list><score-part id="P1"><part-name print-object="no">Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>half</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="4">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>half</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="5">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="6">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="7">
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="8">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>half</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><rest/><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`,
};

/**
 * Minuet in G Major
 * Johann Sebastian Bach (attr. Christian Petzold)
 * BWV Anh. 114 - from Anna Magdalena Notebook (public domain)
 * Simple arrangement, first 8 measures
 */
const MINUET_IN_G: BuiltInSong = {
  id: 'minuet-g',
  title: 'Minuet in G Major',
  composer: 'J.S. Bach (attr. Petzold)',
  difficulty: 'easy',
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Minuet in G Major</work-title></work>
  <identification><creator type="composer">J.S. Bach (attr. Petzold)</creator></identification>
  <part-list><score-part id="P1"><part-name print-object="no">Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>half</type><staff>2</staff></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>2</duration><type>quarter</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="4">
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>B</step><octave>2</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="5">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="6">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="7">
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
    <measure number="8">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>half</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>6</duration><type>half</type><dot/><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`,
};

/**
 * All available built-in songs
 */
export const BUILT_IN_SONGS: BuiltInSong[] = [
  MARY_HAD_A_LITTLE_LAMB,
  TWINKLE_TWINKLE,
  ODE_TO_JOY,
  HAPPY_BIRTHDAY,
  MINUET_IN_G,
];

/**
 * Get a built-in song by ID
 */
export function getSongById(id: string): BuiltInSong | undefined {
  return BUILT_IN_SONGS.find(s => s.id === id);
}

/**
 * Get songs filtered by difficulty
 */
export function getSongsByDifficulty(difficulty: BuiltInSong['difficulty']): BuiltInSong[] {
  return BUILT_IN_SONGS.filter(s => s.difficulty === difficulty);
}
