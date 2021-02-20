---
layout: process.njk
title: libraries
stepNo: 4
active: true
date: 2021-02-16
---

# project

I’ve always been enamored with machines that make music, especially when those
machines weren't originally intended for making music or even sound at all.
This sort of thing is all over YouTube—you can find videos of everything from
3D printers to toothbrushes to hard drives to credit card readers playing
whatever song the kids are listening to these days. Many of these devices use
stepper motors to make the sound, because it's fairly easy to drive stepper
motors at very precise speeds, which is perfect for controlling their pitch.

I was delighted to discover that we have a stepper motor in our kits, as I've
always wanted to make one of these myself. I present the Stepper Motor Jukebox,
complete with handy dandy remote control! Press one of the ten numbered buttons
on the remote to play a little diddy—with no speaker in sight!

# hardware

## schematic

<a href="https://cdn.yoonbuck.com/hcde439-www/4-libraries/schematic.png" target="_blank" title="Click to view larger">![](https://cdn.yoonbuck.com/hcde439-www/4-libraries/schematic.png)</a>

## circuit

![](https://cdn.yoonbuck.com/hcde439-www/4-libraries/image.jpg)

## code

```cpp
#include <Arduino.h>
#include <Stepper.h>
#include <IRremote.h>

// maximum number of notes per song
#define MAX_SONG_NOTES 50

// note duration values (out of 1024)
const long WHOLE = 1024;
const long HALF = 512;
const long QUARTER = 256;
const long EIGHTH = 128;
const long SIXTEENTH = 64;

// beats per minute
int globalBPM = 180;
// note duration bpm applies to
const long BPM_BASE = QUARTER;

// data structure to define a note
struct Note {
  uint8_t pitch;    // note has a pitch
  uint8_t duration; // and a duration
};
// pitch value used to denote rests
const uint8_t REST = 255;
// macro to more easily insert rests
#define Rest(duration) {REST, duration}

// data structure to define a song
struct Song {
  uint8_t duration;           // how many notes in the song
  uint8_t bpm;                // tempo of the song
  uint8_t noteOffset;         // all note values are lowered by this offset
  long tempoMultiplier;       // base note duration unit
  Note notes[MAX_SONG_NOTES]; // the notes in the song
};

// here's the songs! I really wanted to get this into program memory
// because this ends up getting copied into RAM, and uses a lot of
// it up—which is why we have to be conservative with song length.
// ultimately I got too tangled up in pointers and decided to just
// optimize my songs instead :)
const Song songbook[] = {
  { 37, 160, 32, QUARTER, { // 0: chromatic scale - full range
    {0,1},{1,1},{2,1},{3,1},{4,1},{5,1},{6,1},{7,1},
    {8,1},{9,1},{10,1},{11,1},{12,1},{13,1},{14,1},{15,1},
    {16,1},{17,1},{18,1},{19,1},{20,1},{21,1},{22,1},{23,1},
    {24,1},{25,1},{26,1},{27,1},{28,1},{29,1},{30,1},{31,1},
    {32,1},{33,1},{34,1},{35,1},{36,1}
  }},
  { 27, 180, 8, EIGHTH, { // 1: happy birthday
    {0,2},{0,1},{2,3},{0,3},{5,3},{4,3},Rest(3),{0,2},
    {0,1},{2,3},{0,3},{7,3},{5,3},Rest(3),{0,2},{0,1},
    {12,3},{9,3},{5,3},{4,3},{2,3},{10,2},{10,1},{9,3},
    {5,3},{7,3},{5,6}
  }},
  { 38, 120, 8, EIGHTH, { // 2: my heart will go on - intro
    {5,1},{7,1},{7,1},{9,1},{9,4},{7,1},{5,1},{7,1},
    {12,5},{10,1},{9,1},{5,4},{2,4},{0,8},{5,3},{5,1},
    {5,2},{5,2},{4,2},{5,4},{5,2},{4,2},{5,4},{7,2},
    {9,4},{7,4},{5,3},{5,1},{5,2},{5,2},{4,2},{5,4},
    {5,2},{0,8}
  }},
  { 24, 120, 8, EIGHTH, { // 3: my heart will go on - chorus
    {5,8},{7,6},{0,2},{12,4},{10,2},{9,2},{7,4},{9,2},
    {10,2},{9,4},{7,2},{5,2},{4,2},{5,4},{5,2},{4,2},
    {5,4},{7,2},{9,2},{10,1},{9,1},{7,3},{5,1},{5,8}
  }},
  { 50, 114, 12, EIGHTH, { // 4: mii channel music
    {6,2},{9,1},{13,1},Rest(1),{9,1},Rest(1),{6,1},{2,1},
    {2,1},{2,1},Rest(4),{1,1},{2,1},{6,1},{9,1},{13,1},
    Rest(1),{9,1},Rest(1),{6,1},{16,3},{15,1},{14,2},Rest(2),
    {8,2},{13,1},{6,1},Rest(1),{13,1},Rest(1),{8,1},Rest(1),
    {13,1},Rest(1),{7,1},{6,1},Rest(1),{4,1},Rest(1),{0,1},
    {0,1},{0,1},Rest(3),{0,1},{0,1},{0,1},Rest(3),{3,2},
    {2,2},{1,1}
  }},
  { 7, 140, 5, EIGHTH, { // 5: THE LICC
    {2, 1}, {4, 1}, {5, 1}, {7, 1}, {4, 2}, {0, 1}, {2, 5}
  }},
  { 48, 160, 4, SIXTEENTH, { // 6: (very short!) flight of the bumblebee
    {5,1},{4,1},{3,1},{2,1},{1,1},{6,1},{5,1},{4,1},
    {5,1},{4,1},{3,1},{2,1},{1,1},{2,1},{3,1},{4,1},
    {5,1},{4,1},{3,1},{2,1},{1,1},{6,1},{5,1},{4,1},
    {5,1},{4,1},{3,1},{2,1},{1,1},{2,1},{3,1},{4,1},
    {5,1},{4,1},{3,1},{2,1},{3,1},{2,1},{1,1},{0,1},
    {1,1},{2,1},{3,1},{4,1},{5,1},{6,1},{5,1},{4,1}
  }},
  { 32, 142, 11, EIGHTH, { // 7: epic III ("They danced...") (Hadestown)
    Rest(2),{10,1},{12,1},{14,2},Rest(2),{15,2},{14,2},Rest(2),
    {9,1},{10,1},{12,2},{15,2},{14,2},{7,2},Rest(2),{7,1},
    {9,1},{10,2},{12,2},{9,1},{10,2},{5,1},{3,1},{2,1},
    {3,2},{2,2},{0,1},{2,1},{3,1},{5,1},{7,1},{9,1}
  }},
  { 26, 172, 12, EIGHTH, { // 8: defying gravity
    {7,1},{7,2},{14,3},{12,6},{4,1},{7,7},{0,2},{4,3},
    {2,1},{2,6},{7,1},{7,2},{14,3},{12,6},{4,1},{7,5},
    {12,4},{4,3},{2,1},{2,3},{0,1},{5,1},{4,2},{2,2},
    {0,3},{0,4}
  }},
  { 48, 68, 13, SIXTEENTH, { // 9: electricity (Billy Elliot)
    {12,1},{12,1},{14,3},{17,2},{16,2},{16,4},Rest(6),{12,1},
    {14,1},{17,2},{16,2},{16,1},{12,2},{7,5},Rest(4),{16,2},
    {14,2},{14,2},{12,2},{12,2},{7,2},{7,1},{12,2},{7,1},
    {16,2},{14,1},{14,3},{12,1},{14,5},Rest(3),{14,1},{17,2},
    {16,1},{16,2},{14,3},{14,1},{12,3},Rest(4),{17,2},{16,2},
    {16,1},{14,1},{12,4},{12,2},{12,1},{14,3},{14,1},{12,1},
  }},
  { 21, 68, 13, SIXTEENTH, { // electricity, continued
    {12,2},Rest(8),{9,2},{12,2},{16,1},{14,1},{14,2},Rest(8),
    {12,2},{14,2},{17,2},{16,1},{16,5},Rest(6),{7,1},{7,1},
    {16,4},Rest(4),{14,4},Rest(4),{12,8}
  }},
};

// lookup table for remote button values
const PROGMEM int BTN_LUT[] = {
  0x16, 0x0C, 0x18, 0x5E, 0x08, 0x1C, 0x5A, 0x42, 0x52, 0x4A
};

// look up which button was pressed from the command value
int lookupButton(int cmd) {
  // loop over each of the possibilities
  for (int i = 0; i < 10; i++) {
    // and check if that value matches
    if (cmd == pgm_read_byte(&BTN_LUT[i])) {
      // if so, return it
      return i;
    }
  }
  // if not, return -1
  return -1;
}

// speed lookup table - frequency * 15 (e.g., A440 -> 6600)
// faster than floating point math: 15 * 440 * pow(2, (note - 36) / 12)
// although it doesn't really matter here
// (*60 for rpm, /4 because we said 4 steps per rotation)
const PROGMEM long SPEED_LUT[] = {
  1650, 1748, 1852, 1962, 2078, 2202, 2333, 2472,
  2619, 2774, 2939, 3114, 3300, 3496, 3704, 3924,
  4157, 4404, 4666, 4944, 5238, 5549, 5879, 6229,
  6600, 6992, 7408, 7848, 8315, 8809, 9333, 9888,
  10476, 11099, 11759, 12459, 13200
};

// look up a speed given a note value
long lookupSpeed(int note) {
  // add 32 to the note, and return the corresponding value from the table
  return pgm_read_word(&SPEED_LUT[note + 32]);
}

// initialize the stepper library on pins 8 through 11:
// 4 as first arg is steps per revolution - needs to be 4
// (not 1, even though the math would be easier)
// to actually use all stepper stages
Stepper stepper(4, 8, 10, 9, 11);

// cut all power to the motor.
// you probably wouldn't want to do this if you were using
// your stepper motor for its intended purpose, as I'm sure
// it messes up the position, if you're keeping track.
// but the motor gets hot when it's passing current and that
// kinda scares me, so this will make sure it isn't when
// it's not moving, instead of keeping the windings on.
// I've measured the current draw at about 800mA for the
// lowest pitches to 500mA at the highest pitches. freaky-deaky!
void clearMotor() {
  // turn pins 8-11 off
  // I guess I could use a loop, but with only four values it seems
  // like the compiler would probably end up unrolling it anyway
  digitalWrite(8, LOW);
  digitalWrite(10, LOW);
  digitalWrite(9, LOW);
  digitalWrite(11, LOW);
}

// setup code: runs once when the arduino turns on
void setup() {
  // initialize the serial port
  Serial.begin(9600);
  // set pin 12 as input and pin 13 as output
  // these are used for the ir remote receiver
  // yeah, I *should* wire it to power properly,
  // but it fits in so nice there!
  pinMode(12, INPUT);
  pinMode(13, OUTPUT);
  // tie pin 13 high, so it's always 5V for the receiver
  digitalWrite(13, HIGH);
  // begin listening for signals from the remote on pin 12
  IrReceiver.begin(12, false);
}

// direction the last note was played in
bool last_direction = false;
// play the given note for the given duration
void playNote(int note, int duration) {
  // check if note is in playable bounds
  if (note >= -32 && note <= 4) {
    // switch direction
    // this creates a nice crunchy attack on the note
    last_direction = !last_direction;
    // map direction (0/1) to (-1/1)
    int dir = last_direction * 2 - 1;
    // determine note speed
    long speed = lookupSpeed(note);
    // set stepper motor speed
    stepper.setSpeed(speed);
    // step, based on direction, speed, duration, and bpm
    stepper.step(dir * speed * duration * 4 / globalBPM / BPM_BASE);
  }
}

// rest (play no note) for the given duration
void rest(int duration) {
  // turn all motor signals off
  clearMotor();
  // wait the appropriate duration
  delay(1000l * duration * 60 / globalBPM / BPM_BASE);
}

// play a song!
// I suspect this parameter should probably be a pointer?
// I'm sorry, Arduino, if I'm making you copy these songs
// around yet another time :((
void playSong(Song s) {
  // print out the new bpm to the serial port
  Serial.print("Setting BPM: ");
  Serial.println(s.bpm);
  // update the global bpm
  globalBPM = s.bpm;
  // grab the length of the song
  int songLength = s.duration;
  // for each note in the song:
  for (uint8_t i = 0; i < songLength; i++) {
    // grab the pitch
    uint8_t pitch = s.notes[i].pitch;
    // print out details about the note pitch and duration to the serial port
    Serial.print("Playing note: ");
    Serial.print(s.notes[i].pitch);
    Serial.print(" \tfor duration ");
    Serial.println(s.notes[i].duration);

    // if the note is a rest
    if (pitch == REST) {
      // then rest for the appropriate duration
      rest(s.tempoMultiplier * s.notes[i].duration);
    } else {
      // otherwise, play the note!
      playNote(
        (int) pitch - s.noteOffset, s.tempoMultiplier * s.notes[i].duration
      );
    }
  }
  // song's over, turn the motor off
  clearMotor();
}

// do this forever
void loop() {
  // if a button was pressed on the remote
  if (IrReceiver.decode()) {
    // stop listening for button presses - otherwise, pressing a button
    // during the song will queue that up and play it immediately after
    // the current song finishes. I guess that could be a feature...
    IrReceiver.stop();
    // figure out which number button was pressed
    int val = lookupButton(IrReceiver.decodedIRData.command);
    // print out which button was pressed to the serial port
    Serial.print("Button pressed: ");
    Serial.println(val);
    // if it was a number button:
    if (val > -1) {
      // print that the song is beginning to the serial port
      Serial.println("[BEGIN SONG]");
      // play the song!
      playSong(songbook[val]);
      // special case for song 9
      if (val == 9) {
        // to get around our length restriction, play song 10 right after
        playSong(songbook[10]);
      }
      // print that the song is ending to the serial port
      Serial.println("[END SONG]");
    }
    // begin listening for button presses again
    IrReceiver.start();
  }
}
```

# all together now!

The video below shows the Jukebox playing each of the songs in its songbook.

<div style="padding:56.25% 0 0 0;position:relative;" class="media"><iframe src="https://player.vimeo.com/video/512827839?color=5daaf1&title=0&byline=0&portrait=0" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="fullscreen" allowfullscreen></iframe></div>

<div style="font-feature-settings: 'tnum';">

**0:01** - song 0: Chromatic scale (full range)  
**0:16** - song 1: Happy Birthday  
**0:30** - song 2: My heart will go on (intro)  
**0:56** - song 3: My heart will go on (chorus)  
**1:16** - song 4: Mii channel music  
**1:34** - song 5: THE LICC  
**1:38** - song 6: (very short!) Flight of the Bumblebee  
**1:44** - song 7: Epic III ("They danced...") (Hadestown)  
**1:57** - song 8: Defying Gravity (Wicked)  
**2:12** - song 9: Electricity (Billy Elliot)

</div>
