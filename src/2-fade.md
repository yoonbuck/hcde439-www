---
layout: process.njk
title: fade
stepNo: 2
active: true
date: 2021-01-25
needsKatex: true
---

# project

For this project, I created a simple game where the player tries to guess which
LED will stay on. The player makes a choice, then LEDs are removed until
only one remains. If the player chooses the correct LED, they win! After the
game ends, the game can be restarted by pressing either button.

# hardware

For this project, several LEDs as well as two buttons are connected to the Arduino.

## calculations

The appropriate resistor value for each color of LED was calculated as follows:

- **White LED:**

  - $$V_\text{White} = 3.2\text{V}$$
  - $$V_\text{R1} = 1.8\text{V}$$
  - $$R_\text{R1} = \frac{1.8\text{V}}{0.02\text{A}} = 90\Omega \approx 100\Omega$$

- **Green LED:**

  - $$V_\text{Green} = 2.2\text{V}$$
  - $$V_\text{R2} = 2.8\text{V}$$
  - $$R_\text{R2} = \frac{2.8\text{V}}{0.02\text{A}} = 140\Omega \approx 220\Omega$$

- **Red LED:**

  - $$V_\text{Red} = 2\text{V}$$
  - $$V_\text{R3} = 3\text{V}$$
  - $$R_\text{R3} = \frac{3\text{V}}{0.02\text{A}} = 150\Omega \approx 220\Omega$$

(LED voltage drops are approximate)

## schematic

<a href="https://cdn.yoonbuck.com/hcde439-www/2-fade/schematic.png" target="_blank" title="Click to view larger">![](https://cdn.yoonbuck.com/hcde439-www/2-fade/schematic.png)</a>

<a href="https://cdn.yoonbuck.com/hcde439-www/2-fade/schematic.png" target="_blank">View larger</a>

## circuit

![](https://cdn.yoonbuck.com/hcde439-www/2-fade/image.jpg)

The circuit was built using the Arduino, breadboard, LEDs, resistors, and push buttons from our kit.

# code

```cpp
#include <Arduino.h>

// pins to use for the selectable leds. should support pwm
const int LED_PINS[] = { 11, 10, 9, 6, 5 };
// number of LEDs user can select from. should be the length
// of LED_PINS - I should be able to do this automatically
// but apparently I don't understand how sizeof works :)
const int NUM_LEDS = 5;

// pin used for led to indicate the user won
const int SUCCESS_PIN = 7;
// pin used for led to indicate the user lost
const int FAILURE_PIN = 8;

// pin used for "select" button
const int SELECT_PIN = 3;
// pin used for "start" button
const int START_PIN = 2;

// the user's guess
int guess = 0;

// floating point math is slow, but a lookup table for gamma is fast!
// I found that a gamma of 2.2 seemed about right to me :)
extern const uint8_t GAMMA_LUT[];

// write brightness val to given pin, with gamma correction
void writeBrightness(uint8_t pin, int val) {
    // perform gamma adjustment lookup and write to a PWM pin
    analogWrite(pin, pgm_read_byte(&GAMMA_LUT[val]));
}

// wait until the given input pin is a certain value
void await(uint8_t pin, int val) {
    // do nothing until the pin reads as the value we want
    while (digitalRead(pin) != val) {}
}

// runs once, when the device is turned on
void setup() {
    // for as many option LEDs as there are...
    for (int i = 0; i < NUM_LEDS; i++) {
        // set the pin corresponding with each as output
        pinMode(LED_PINS[i], OUTPUT);
    }

    // set pin for success LED as output
    pinMode(SUCCESS_PIN, OUTPUT);
    // set pin for failure LED as output
    pinMode(FAILURE_PIN, OUTPUT);
    // set pin for select button as input
    pinMode(SELECT_PIN, INPUT);
    // set pin for start button as input
    pinMode(START_PIN, INPUT);

    // random is seeded using analog pin 0
    // leave this pin floating for more randomy random numbers
    // or, tie it high or low for a consistent sequence
    randomSeed(analogRead(0));
}

// repeat forever and ever, amen
void loop() {

    //// GET USER SELECTION

    // loop until start pressed
    while (!digitalRead(START_PIN)) {
        // if select pressed,
        if (digitalRead(SELECT_PIN)) {
            // increment user guess
            guess++;
            // wrap guess around to 0 if past last option
            guess %= NUM_LEDS;
            // wait a bit - poor man's debounce
            delay(100);
            // wait until button is not pressed anymore
            await(SELECT_PIN, LOW);
            // wait a bit more
            delay(100);
        }

        // update all leds:
        for (int i = 0; i < NUM_LEDS; i++) {
            // turn on only if selected
            digitalWrite(LED_PINS[i], guess == i);
        }
    }
    // wait until start not pressed
    await(START_PIN, LOW);

    // BEGIN DISPLAY SEQUENCE - FADE IN

    // turn guess LED on - it should already be!
    digitalWrite(LED_PINS[guess], 1);
    // fade from 0 to 255:
    for (int fade = 0; fade < 255; fade++) {
        // wait 4ms
        delay(4);
        // for each LED:
        for (int i = 0; i < NUM_LEDS; i++) {
            // unless it's the user's choice,
            if (i != guess) {
                // set its brightness to the current fade level
                writeBrightness(LED_PINS[i], fade);
            }
        }
    }
    // wait 1 sec before removing LEDs
    delay(1000);

    // DISPLAY SEQUENCE - REVEAL ANSWER

    // choose a correct answer
    int correct = random(NUM_LEDS);
    // bitmask for LEDs already turned off
    int available = 0;

    // fade out incorrect LEDs out randomly, one at a time!
    // repeat NUM_LEDS - 1 times - to remove all but one
    for (int i = NUM_LEDS - 1; i > 0; i--) {
        // ooh! suspense! what's it gonna be?
        delay(250);

        // choose an led to strike out...
        int target;
        do {
            // keep choosing one randomly
            target = random(NUM_LEDS);
        // until we find one that's still on
        } while (target == correct || (available & (1 << target)));
        // mark it as off
        available |= (1 << target);

        // fade the unlucky LED out
        for (int fade = 255; fade >= 0; fade--) {
            // write brightness to led
            writeBrightness(LED_PINS[target], fade);
            // delay for animation
            delay(2);
        }

        // if we just killed your guess...
        if (target == guess) {
            // you lose!
            digitalWrite(FAILURE_PIN, HIGH);
        }
    }

    // if your guess stayed alive...
    if (guess == correct) {
        // you win!
        digitalWrite(SUCCESS_PIN, HIGH);
    }

    // DONE - WAIT TO START OVER

    // wait until either button is pressed
    while (!(digitalRead(START_PIN) || digitalRead(SELECT_PIN))) {}
    // poor man's debounce
    delay(50);
    // wait until buttons are not pressed
    while (digitalRead(START_PIN) || digitalRead(SELECT_PIN)) {}
    // poor man's debounce
    delay(50);
    // turn the win led off
    digitalWrite(SUCCESS_PIN, LOW);
    // turn the lose led off
    digitalWrite(FAILURE_PIN, LOW);
}

// Gamma lookup table for PWM brightnesses (ɣ = 2.2)
extern const uint8_t PROGMEM GAMMA_LUT[] = {
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
I guess incorrectly the first two rounds, but win the last two.
Pretty lucky!

<video controls muted>
    <source src="https://cdn.yoonbuck.com/hcde439-www/2-fade/fade.webm" type="video/webm">
    <source src="https://cdn.yoonbuck.com/hcde439-www/2-fade/fade.mp4" type="video/mp4">
</video>
