---
layout: process.njk
title: web
stepNo: 6
active: true
date: 2021-03-01
---

# project

This week's project introduces an exciting new development: two-way serial
communication that allows the arduino to interact with a webpage! I wanted
to spice things up by not only controlling something on the webpage, but
also reaching out and controlling some other real-world system using an
API. I've used Spotify's API a bunch before, and it usually makes for
pretty fun demos, so I popped over to check out what I might be able to do
with that.

Spotify's <a href="https://developer.spotify.com/documentation/web-api/reference/#category-player" target="_blank">Player
API</a> is the perfect candidate for this project, since it allows
real-time control of a user's Spotify Player. I hadn't used the Player API
before, but it turned out to be very straightforward.

My project is a Spotify display and controller that uses the arduino, LCD
screen, and IR remote control. The screen displays information about the
current song, playing status, and current position in the track. When the
user adjusts the volume or position, the screen changes to reflect that
change.

# hardware

## schematic

<a href="https://cdn.yoonbuck.com/hcde439-www/6-web/schematic.png" target="_blank" title="Click to view larger">![](https://cdn.yoonbuck.com/hcde439-www/6-web/schematic.png)</a>

## circuit

![](https://cdn.yoonbuck.com/hcde439-www/6-web/image.jpg)

# code

For simplicity, I decided to implement the arduino essentially as a "thin client"
for the webapp. This allowed me to simply send display data as a single buffer
instead of needing to design some sort of protocol to send the different player
attributes (such as position, title, volume, etc.). This also meant I could write
the display controller functionality (layout, mode switching, etc.) in Javascript,
where I am more comfortable and have more flexibility than the C++ code for
the arduino itself.

<a href="https://github.com/yoonbuck/arduino-spotify-controller" target="_blank">Full project code and associated tooling is available on github.</a>

## arduino

The arduino's job is to listen for serial data and write it directly to the screen.
It also receives commands from the IR sensor and writes these over Serial. That is,
the arduino does essentially no processing of the display data or remote commands,
other than the work the IRRemote library does to decode the commands.

I also designed a few custom glyphs that are not included in this code for brevity.
<a href="https://github.com/yoonbuck/arduino-spotify-controller/tree/main/arduino/src" target="_blank">These
can be found, along with all of the other code, on github</a>.

```cpp
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal.h>
#include <IRremote.h>

#include "./glyphs.cpp"

// create the lcd display controller object
LiquidCrystal lcd(12, 11, 4, 5, 6, 7);

// splash screens
const char splash1[] PROGMEM = "\7 \7  please  \7 \7";
const char splash2[] PROGMEM = " \7 connect me \7 ";

// write a string stored in program memory to the lcd
void printmem(const char* str, byte len = 16) {
  // loop over the appropriate length
  for (byte i = 0; i < len; i++) {
    // and write each character
    lcd.write(pgm_read_byte(&str[i]));
  }
}

// write a string stored in... idk. not program memory.
void printstr(const char* str, byte len = 16) {
  // loop over the appropriate length
  for (byte i = 0; i < len; i++) {
    // and write each character
    lcd.write(str[i]);
  }
}

// runs once at start
void setup() {
  // begin the lcd or something
  lcd.begin(16, 2);
  // tell it not to scroll automatically
  // I think this is the default? but sometimes
  // it does anyway. this probably doesn't help.
  lcd.noAutoscroll();
  // listen for ir remote commands on pin 8
  IrReceiver.begin(8, false);
  // initialize the serial port
  Serial.begin(57600);
  // set a reasonable-ish timeout
  // (we later use 0xFF to synchronize serial data)
  Serial.setTimeout(250);

  // program custom glyphs into lcd
  for (byte i = 0; i < 8; i++) {
    // for each byte in the glyph table (see glyphs.cpp), program that
    // as a custom glyph
    lcd.createChar(i, (const char*) pgm_read_byte(&glyphs_table[i]));
  }

  // move to the first line
  lcd.setCursor(0, 0);
  // print the splash screen
  printmem(splash1);
  // move to the second line
  lcd.setCursor(0, 1);
  // print the splash screen
  printmem(splash2);

  // wait a second, just so everything gets a chance to settle?
  // idk. this helped with the serial stuff.
  delay(1000);
}

// send a ir command over the serial port
void sendCommand(byte command) {
  Serial.print(F("{\"type\":\"ircommand\",\"command\":"));
  Serial.print(command);
  Serial.print(F(",\"time\":"));
  Serial.print(millis());
  Serial.println('}');
}

// buffer for display data
char buf[33];

// run forever and ever!
void loop() {
  // got anything from the remote?
  if (IrReceiver.decode()) {
    // read the command
    byte cmd = IrReceiver.decodedIRData.command;
    // and send it over the serial port
    sendCommand(cmd);
    // resume listening for another command
    IrReceiver.resume();
  }
  // if there's data ready from the serial port
  if (Serial.available()) {
    // put it in the buffer, stopping at 33 bytes or 0xFF
    int bytes_read = Serial.readBytesUntil(0xFF, &buf[0], 33);

    // if we got all 32 bytes (plus the stop character)
    if (bytes_read == 33) {
      // dump it all to the screen
      lcd.setCursor(0, 0); // line 1
      printstr(&buf[0]);   // print to line 1
      lcd.setCursor(0, 1); // line 2
      printstr(&buf[16]);  // print to line 2
    } else {
      // otherwise, print an error to the serial port
      Serial.print(F("{\"type\":\"debug\",\"message\":\"expected 33; got only "));
      Serial.print(bytes_read);
      Serial.println(F(" bytes of data\"}"));
    }
  }
}
```

## web

On the web side of things, the application listens for remote commands sent over serial,
handles these commands by interacting with the Spotify API, and updates the state
of the display controller accordingly. The display controller regularly pushes the
full display buffer over the serial port back to the arduino.

The TypeScript code shown on this page is only my p5 sketch and makes use of
a number of other modules (display, remote, and spotify).
<a href="https://github.com/yoonbuck/arduino-spotify-controller/tree/main/www/src" target="_blank">The
full webapp code can also be found on github.</a>

```ts
import type P5 from "p5";
import DisplayController from "./lib/display";
import RemoteThrottler from "./lib/remote";
import {
  getStatus,
  pause,
  play,
  setPosition,
  setVolume,
  skipNext,
  skipPrevious,
} from "./lib/spotify";
import SerialPort from "./vendor/p5.serialport";

/**
 * How often to fetch player status from spotify
 */
const REFRESH_FREQ = 1000;

/**
 * amount volume +/- buttons adjust volume by
 */
const VOLUME_BUMP = 8;

/**
 * amount time jumps adjust position by (ms)
 */
const POSITION_BUMP = 5 * 1000;

export default function (s: P5) {
  /** serial port object (from p3.serialport) */
  let serial: SerialPort;

  /** display controller */
  let display: DisplayController;
  /** remote button press throttler */
  let remote: RemoteThrottler;

  /**
   * hook used to cancel the current update
   * (not sure if this actually works)
   */
  let cancelUpdate: () => void;

  // setup function (runs once)
  s.setup = () => {
    // create and open the serial port
    serial = new SerialPort();
    serial.open("/dev/tty.usbmodem14101", { baudRate: 57600 });
    // add event handlers for data and open
    serial.on("data", serialRecv);
    serial.on("open", ready);
    // create the display controller
    display = new DisplayController(serial);
    // create the remote throttler
    remote = new RemoteThrottler();

    // add event listeners for appropriate remote buttons
    remote.on(0x46, volumeUp, 150); // vol+
    remote.on(0x15, volumeDown, 150); // vol-
    remote.on(0x44, previous, 500); // prev
    remote.on(0x43, next, 500); // next
    remote.on(0x40, playPause, 500); // play
    remote.on(0x09, jumpForward, 150); // arrow up
    remote.on(0x07, jumpBackward, 150); // arrow down

    // trigger the first update from spotify
    update();
  };

  /** callback on ready */
  function ready() {
    // update status indicator on the page
    document.getElementById("status").textContent = "Connected.";
  }

  /** callback for volume up */
  async function volumeUp() {
    // show volume on display
    display.showVolume();
    // update value
    display.volume = Math.min(100, display.volume + VOLUME_BUMP);
    // cancel update
    cancelUpdate?.();
    // ask spotify to change the volume
    await setVolume(display.volume);
    // trigger another update later
    createUpdate(200);
  }

  /** callback for volume down */
  async function volumeDown() {
    // show volume on display
    display.showVolume();
    // update value
    display.volume = Math.max(0, display.volume - VOLUME_BUMP);
    // cancel update
    cancelUpdate?.();
    // ask spotify to set the volume
    await setVolume(display.volume);
    // trigger another update later
    createUpdate(200);
  }

  /** callback for skip to previous */
  async function previous() {
    // cancel update
    cancelUpdate?.();
    // ask spotify to skip to previous
    await skipPrevious();
    // trigger another update later
    createUpdate(100);
  }

  /** callback for skip to next */
  async function next() {
    // cancel update
    cancelUpdate?.();
    // ask spotify to skip to next
    await skipNext();
    // trigger another update later
    createUpdate(100);
  }

  /** callback for play/pause */
  async function playPause() {
    // cancel update
    cancelUpdate?.();
    // flip stored playing value
    display.playing = !display.playing;
    // based on whether we are now playing or not
    if (display.playing) {
      // ask spotify to play
      await play();
    } else {
      // or ask spotify to pause
      await pause();
    }
    // and then update later
    createUpdate(100);
  }

  /** callback for jump backward */
  async function jumpBackward() {
    // show position on display
    display.showPosition();
    // set new position
    display.position = Math.floor(
      Math.max(0, display.position - POSITION_BUMP)
    );
    // update display's last update time
    display.lastUpdate = s.millis();
    // cancel update
    cancelUpdate?.();
    // ask spotify to set position
    await setPosition(display.position);
    // trigger another update later
    createUpdate(500);
  }

  /** callback for jump forward */
  async function jumpForward() {
    // show position on display
    display.showPosition();
    // set new position
    display.position = Math.floor(
      Math.min(display.duration, display.position + POSITION_BUMP)
    );
    // update display's last update time
    display.lastUpdate = s.millis();
    // cancel update
    cancelUpdate?.();
    // ask spotify to set position
    await setPosition(display.position);
    // trigger another update later
    createUpdate(500);
  }

  /** update! */
  async function update(getUpdateCanceled?: () => boolean) {
    try {
      // get new status from spotify
      let status = await getStatus();
      // if this update was canceled, get out
      if (getUpdateCanceled?.()) return;
      // update display values based on new status
      display.hasStatus = true;
      display.playing = status.is_playing;
      display.songName = status.item?.name ?? "Not playing";
      display.duration = status.item?.duration_ms ?? 1;
      display.position = status.progress_ms ?? 0;
      display.volume = status.device?.volume_percent ?? 0;
      display.lastUpdate = s.millis();
    } catch {
      // if something went wrong, indicate that we don't have a status
      display.hasStatus = false;
    }
    // trigger another update later
    createUpdate();
  }

  /** request another update in the future */
  function createUpdate(time = REFRESH_FREQ) {
    // cancel any exisiting pending update
    cancelUpdate?.();
    // yay closures! can't do this in python :D
    let shouldCancel = false;
    let getShouldCancel = () => shouldCancel;
    // use setTimeout to trigger the update later
    let handler = window.setTimeout(() => update(getShouldCancel), time);
    // update the cancel update callback...
    cancelUpdate = () => {
      // to mark that this update should be canceled
      shouldCancel = true;
      // and clear the timeout, if it's still active
      clearTimeout(handler);
    };
  }

  /** callback for received serial data */
  function serialRecv() {
    // read a line from the serial port
    let nextLine = serial.readLine();
    // it's probably nothing, so return if it is
    if (!nextLine) return;
    // if not,
    try {
      // try parsing as json
      let data = JSON.parse(nextLine);
      // if it's an IR command
      if (data.type === "ircommand") {
        // dispatch to the IR throttler
        remote.dispatch(data.command, data.time);
      } else if (data.type === "debug") {
        // if it's a debug message, print to the console
        console.warn(data);
      }
    } catch (e) {
      // if something else horrible happened, print that out
      console.warn("[sketch] parse error", e);
    }
  }

  // draw loop called every frame
  s.draw = () => {
    // update the display
    display.tic(s.deltaTime, s.millis());
  };
}
```

# all together now!

The video below shows a short demo of all the available functionality of the device,
including play/pause, skip forward/backward, nudging position in the same track, and
volume control. At the end of the video, I make some changes in the Spotify app and
show that those are reflected on my controller device.

<video controls>
    <source src="https://cdn.yoonbuck.com/hcde439-www/6-web/web.webm" type="video/webm">
    <source src="https://cdn.yoonbuck.com/hcde439-www/6-web/web.mp4" type="video/mp4">
</video>
