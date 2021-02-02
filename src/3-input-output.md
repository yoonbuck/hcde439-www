---
layout: process.njk
title: io
stepNo: 3
active: true
date: 2021-02-01
needsKatex: true
---

# project

Look out! You are being attacked by evil, sweaty robots sent by disgraced United States
Senator Rafael Edward (“Ted”) Cruz. Use your second amendment right—which the senator has so
valiantly fought for—to defend yourself against the evil CruzBots for as long as you can.

When an evil CruzBot enters range, aim your Futurey Laser Weapon&trade; and blast that evil
CruzBot directly to hell. Your Futurey Laser Weapon&trade; operates using solar power and will
need to recharge after each blast, so you should move the charging array into the sun to ensure
maximum charging speed.

The evil CruzBots will approach faster as the game goes on! Survive for as long as you can.

# hardware

## calculations

I've previously shown how I calculate resistor values to use with LEDs.
The values for this project are summarized in the following table:

| LED Color | Approximate LED voltage drop | Desired resistance | Resistor used |
| --------- | ---------------------------- | ------------------ | ------------- |
| Red       | $$2\text{V}$$                | $$150\Omega$$      | $$220\Omega$$ |
| Amber     | $$2.1\text{V}$$              | $$145\Omega$$      | $$220\Omega$$ |
| Green     | $$2.2\text{V}$$              | $$140\Omega$$      | $$220\Omega$$ |
| Blue      | $$3.2\text{V}$$              | $$90\Omega$$       | $$100\Omega$$ |

I measured the range of the photoresistor to be around $$300\Omega$$ – $$3200\Omega$$.
I chose to use a $$500\Omega$$ resistor in my voltage divider to acheive a wide range of
measurable voltages. The calculation for the measured voltage is:

<div style="text-align:center">$$V=5\text{V}\cdot\frac{\text{R}}{\text{R}+500\Omega}$$</div>

which leads to a range of approximately $$1.88\text{V}$$ – $$4.32\text{V}$$.

## schematic

<a href="https://cdn.yoonbuck.com/hcde439-www/3-io/schematic.png" target="_blank" title="Click to view larger">![](https://cdn.yoonbuck.com/hcde439-www/3-io/schematic.png)</a>

<a href="https://cdn.yoonbuck.com/hcde439-www/3-io/schematic.png" target="_blank">View larger</a>

## circuit

![](https://cdn.yoonbuck.com/hcde439-www/3-io/image.jpg)

# code

```cpp
#include <Arduino.h>

// CONSTANTS
// output pins to display cruzbots in range
const int TARGET_PINS[] = { 13, 12, 8, 7, 4 };
// output pins for player aim
const int PLAYER_PINS[] = { 3, 5, 6, 9, 10 };

// number of cruzbots & aim pins
const int PIN_COUNT = sizeof(TARGET_PINS) / sizeof(TARGET_PINS[0]);

// range in which to illuminate aim indicators
const int PROXIMITY_RANGE = 150;
// range in which an attack will successfully deliver the cruzbot
// directly to the fiery pits of hell
const int ACCURACY_THRESHOLD = 40;

// output pin indicating weapon charge
const int CHARGE_PIN = 11;
// output pin indicating weapon ready
const int READY_PIN = 2;

// input pins
const int FIRE_IN = A3; // button to fire weapon
const int AIM_IN = A5;  // potentiometer to aim
const int SUN_IN = A0;  // photoresistor to charge weapon

// using an analog pin for the button because I ran out of the other pins!
// had trouble with pins 0 and 1 - I think they're used for serial commuication
// so this is the threshold above which the analog value from the button will
// be considered pressed
const int FIRE_THRESHOLD = 900;

// minimum value for aiming - determined via inspection of analog input values
const int AIM_LOW = 20;
// maximum value for aiming - determined via inspection of analog input values
const int AIM_HIGH = 1010;

// amount weapon needs to charge before firing again
const int FIRE_DELAY = 10000;
// influence of photoresistor on charge level - higher = more resolution, slower
const int SUN_FACTOR = 10;
// (scale FIRE_DELAY and SUN_FACTOR together to increase resolution without
// changing charge time.)

// how much should the cruzbot delay go down, each time one appears?
// higher = faster, more difficult
const int DIFFICULTY_RAMP = 150;

// gamma lookup table coming later!
extern const uint8_t GAMMA_LUT[];

// GAME STATE

// bitmask for cruzbot positions
int targets;
// player score
int score;

// stores the previous result of millis() to determine elapsed time
unsigned long lastTime;

// current delay for new cruzbots
long newTargetTime;
// time until new cruzbot appears
long targetTimeout;
// time until weapon is ready to fire again
long fireTimeout;

// reset game state
void setupGame() {
  // remove targets
  targets = 0;
  // reset score
  score = 0;

  // reset last time marker
  lastTime = millis();

  // reset new cruzbot time
  newTargetTime = 4000;
  // reset cruzbot timeout
  targetTimeout = 4000;
  // reset fire timeout
  fireTimeout = 1000;

  // print game start message over serial port
  Serial.println("Watch out! Evil CruzBots are attacking!");
}

// check whether cruzbots are in all the positions
bool allOn(int t) {
  // repeat based on number of potential positions
  for (int i = 0; i < PIN_COUNT; i++) {
    // if there's no cruzbot in front
    if (!(t & 1)) {
      // return false 🙄
      return false;
    }
    // bitshift to look at the next cruzbot spot
    t >>= 1;
  }
  // if all the positions were full,
  return true;
}

// run once at startup
void setup() {
  // open the serial port
  Serial.begin(9600);

  // repeat for each player/target pin
  for (int i = 0; i < PIN_COUNT; i++) {
    // set the ith target pin to be an output
    pinMode(TARGET_PINS[i], OUTPUT);
    // set the ith player pin to be an output
    pinMode(PLAYER_PINS[i], OUTPUT);
  }
  // set the charge pin to be an output
  pinMode(CHARGE_PIN, OUTPUT);
  // set the ready pin to be an output
  pinMode(READY_PIN, OUTPUT);

  // initialize the game state
  setupGame();
}

void loop() {
  // read the current aim direction
  long d = analogRead(AIM_IN);

  // for each player pin,
  for (int i = 0; i < PIN_COUNT; i++) {
    // determine the corresponding target's position
    long target = AIM_LOW + (AIM_HIGH - AIM_LOW) * (2 * i + 1) / (2 * PIN_COUNT);
    // find the distance between that position and the player's aim
    long dist = abs(d - target);
    // constrain based on the proximity range for aim indicator brightness
    dist = constrain(dist, 0, PROXIMITY_RANGE);
    // map distance to a brightness level
    int brightness = map(dist, 0, PROXIMITY_RANGE, 0, 255);
    // set pin to that brightness
    analogWrite(PLAYER_PINS[i], pgm_read_byte(&GAMMA_LUT[brightness]));
  }

  // for each target pin,
  for (int i = 0; i < PIN_COUNT; i++) {
    // turn it on if there's a target there
    digitalWrite(TARGET_PINS[i], targets & (1 << i));
  }

  // tick times
  // get the current time
  long nowTime = millis();
  // calculate the elapsed time
  long elapsedTime = nowTime - lastTime;
  // set the last time for next time
  lastTime = nowTime;

  // if the weapon is still charging,
  if (fireTimeout) {
    // charge based on the current sun level
    fireTimeout -= elapsedTime * analogRead(SUN_IN) / SUN_FACTOR;
    // if overcharged,
    if (fireTimeout < 0) {
      // set to zero to indicate done charging
      fireTimeout = 0;
    }
  }

  // decrease target time:
  if (elapsedTime > targetTimeout) {
    // if we're over, set to zero
    targetTimeout = 0;
  } else {
    // otherwise, decrease based on elapsed time
    targetTimeout -= elapsedTime;
  }

  // if the weapon is being charged
  if (fireTimeout) {
    // calculate a brightness for the charge pin
    int brightness = map(fireTimeout, 0, FIRE_DELAY, 0, 255);
    // set the charge pin to that brightness
    analogWrite(CHARGE_PIN, pgm_read_byte(&GAMMA_LUT[brightness]));
    // turn the ready pin off
    digitalWrite(READY_PIN, HIGH);
  } else { // otherwise, if it's not,
    // if the fire button is pressed,
    if (analogRead(FIRE_IN) > FIRE_THRESHOLD) {
      // turn the ready pin off
      digitalWrite(READY_PIN, HIGH);
      // reset the fire timeout
      fireTimeout = FIRE_DELAY;
      // for each target
      for (int i = 0; i < PIN_COUNT; i++) {
        // find the target's position
        long target = AIM_LOW + (AIM_HIGH - AIM_LOW) * (2 * i + 1) / (2 * PIN_COUNT);
        // find the distance from the player's aimed position
        long dist = abs(d - target);
        // if it's close enough and there's a cruzbot there
        if (dist <= ACCURACY_THRESHOLD && (targets & (1 << i))) {
          // increase score
          score++;
          // print message to serial port
          Serial.print("Nice shot! You took down the evil CruzBot. Current score: ");
          // print score to serial port
          Serial.println(score);
          // remove the cruzbot
          bitClear(targets, i);
        }
      }
    } else { // fire button is not pressed
      // turn the ready pin on
      digitalWrite(READY_PIN, LOW);
    }
  }

  // if it's time for a new cruzbot
  if (!targetTimeout) {
    // if we're already full of cruzbots
    if (allOn(targets)) {
      // ready pin off
      digitalWrite(READY_PIN, HIGH);
      // charge pin on
      digitalWrite(CHARGE_PIN, HIGH);
      // each player pin:
      for (int i = 0; i < PIN_COUNT; i++) {
        // turn off
        digitalWrite(PLAYER_PINS[i], HIGH);
      }

      // print game over message
      Serial.println("Oh no! The evil CruzBots overwhelmed you!");
      // still printing the game over message
      Serial.println("You held off as long as you could!");
      // more of the game over message
      Serial.print("Final score: ");
      // the game over message ends with the player's score
      Serial.println(score);

      // wait until the fire button isn't pressed
      while (analogRead(FIRE_IN) > FIRE_THRESHOLD) {}
      // wait 500ms
      delay(500);

      // print a blank line
      Serial.println();
      // ask if the user wants to play again
      Serial.println("Play again?");

      // until the user presses the button
      for (bool b = false; analogRead(FIRE_IN) < FIRE_THRESHOLD; b = !b) {
        // blink the charge LED
        digitalWrite(CHARGE_PIN, b);
        // wait 250ms
        delay(250);
      }

      // reset the game state
      setupGame();
    } else { // at least one spot left!
      // reset the new target countdown
      targetTimeout = newTargetTime;
      // decrease the new target time to make the next one faster
      newTargetTime -= DIFFICULTY_RAMP;
      // if faster than the player can possibly fire
      if (newTargetTime < FIRE_DELAY / 10) {
        // slow it back down to that level
        newTargetTime = FIRE_DELAY / 10;
      }

      // choose new spot to spawn a cruzbot
      int newPin;
      do {
        // pick one at random
        newPin = random(PIN_COUNT);
        // until it's in an empty spot
      } while (targets & (1 << newPin));
      // insert the new cruzbot spot in the bitmask
      targets |= 1 << newPin;
    }
  }
}

// lookup table for led brightness gamma
const uint8_t PROGMEM GAMMA_LUT[] = {
   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
   0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
   0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02,
   0x03, 0x03, 0x03, 0x03, 0x03, 0x04, 0x04, 0x04,
   0x04, 0x05, 0x05, 0x05, 0x05, 0x06, 0x06, 0x06,
   0x06, 0x07, 0x07, 0x07, 0x08, 0x08, 0x08, 0x09,
   0x09, 0x09, 0x0a, 0x0a, 0x0b, 0x0b, 0x0b, 0x0c,
   0x0c, 0x0d, 0x0d, 0x0d, 0x0e, 0x0e, 0x0f, 0x0f,
   0x10, 0x10, 0x11, 0x11, 0x12, 0x12, 0x13, 0x13,
   0x14, 0x14, 0x15, 0x16, 0x16, 0x17, 0x17, 0x18,
   0x19, 0x19, 0x1a, 0x1a, 0x1b, 0x1c, 0x1c, 0x1d,
   0x1e, 0x1e, 0x1f, 0x20, 0x21, 0x21, 0x22, 0x23,
   0x23, 0x24, 0x25, 0x26, 0x27, 0x27, 0x28, 0x29,
   0x2a, 0x2b, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30,
   0x31, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
   0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f,
   0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47,
   0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x51,
   0x52, 0x53, 0x54, 0x55, 0x57, 0x58, 0x59, 0x5a,
   0x5b, 0x5d, 0x5e, 0x5f, 0x61, 0x62, 0x63, 0x64,
   0x66, 0x67, 0x69, 0x6a, 0x6b, 0x6d, 0x6e, 0x6f,
   0x71, 0x72, 0x74, 0x75, 0x77, 0x78, 0x79, 0x7b,
   0x7c, 0x7e, 0x7f, 0x81, 0x82, 0x84, 0x85, 0x87,
   0x89, 0x8a, 0x8c, 0x8d, 0x8f, 0x91, 0x92, 0x94,
   0x95, 0x97, 0x99, 0x9a, 0x9c, 0x9e, 0x9f, 0xa1,
   0xa3, 0xa5, 0xa6, 0xa8, 0xaa, 0xac, 0xad, 0xaf,
   0xb1, 0xb3, 0xb5, 0xb6, 0xb8, 0xba, 0xbc, 0xbe,
   0xc0, 0xc2, 0xc4, 0xc5, 0xc7, 0xc9, 0xcb, 0xcd,
   0xcf, 0xd1, 0xd3, 0xd5, 0xd7, 0xd9, 0xdb, 0xdd,
   0xdf, 0xe1, 0xe3, 0xe5, 0xe7, 0xea, 0xec, 0xee,
   0xf0, 0xf2, 0xf4, 0xf6, 0xf8, 0xfb, 0xfd, 0xff
};
```

# all together now!

The video below shows an example playthrough of the game.

Note: I need to illuminate the breadboard quite brightly while recording to prevent
the LEDs from blowing everything out, so the weapon recharge rate is quite fast!
Under normal lighting conditions, it would be a bit slower.

<video controls muted>
    <source src="https://cdn.yoonbuck.com/hcde439-www/3-io/io.webm" type="video/webm">
    <source src="https://cdn.yoonbuck.com/hcde439-www/3-io/io.mp4" type="video/mp4">
</video>
## Example serial port output

```
Watch out! Evil CruzBots are attacking!
Nice shot! You took down the evil CruzBot. Current score: 1
Nice shot! You took down the evil CruzBot. Current score: 2
Nice shot! You took down the evil CruzBot. Current score: 3

...

Nice shot! You took down the evil CruzBot. Current score: 47
Nice shot! You took down the evil CruzBot. Current score: 48
Oh no! The evil CruzBots overwhelmed you!
You held off as long as you could!
Final score: 48

Play again?
```
