---
layout: process.njk
title: blink
stepNo: 1
active: true
date: 2021-01-19
needsKatex: true
---

# project

For this project, I needed to create a schematic involving at least 3 LEDs
connected to an Arduino, implement this circuit using a breadboard, and write
Arduino firmware to make the LEDs blink in some pattern.

I decided to try to create a sort of moving or scrolling effect across five LEDs.

# hardware

My circuit for this project consists of five white LEDs connected directly to five pins of the Arduino.

## calculation

The appropriate resistor value for these LEDs was calculated as follows:

1. White LED forward voltage drop: $$V_\text{LED} \approx 3.2\text{V}$$
1. Resister voltage: $$V\_{R1} = 5\text{V} - V_\text{LED} \approx 1.8\text{V}$$
1. Desired forward current: $$I = 20\text{mA} = 0.02\text{A}$$
1. Required resistance (using Ohm's law): $$R = \frac VI = \frac{1.8\text{V}}{0.02\text{A}}=90\Omega$$
1. Round up to nearest standard resistor value: $$100\Omega$$

## schematic

![](https://cdn.yoonbuck.com/hcde439-www/1-blink/schematic.png)

## circuit

![](https://cdn.yoonbuck.com/hcde439-www/1-blink/image.jpg)

The circuit was built using the Arduino, breadboard, white LEDs, 100&Omega; resistors, and jumper wires from our kit.

# software

```cpp
// number of leds to show
const int LED_COUNT = 5;

// first pin (of LED_COUNT) to be used for LED sequence
const int LED_PIN_START = 8;

// setup: runs once at start
void setup() {
    // Repeat for each of the LEDs:
    for (int i = 0; i < LED_COUNT; i++) {
        // Declare the pin associated with each LED
        // as an output which can be written to
        pinMode(LED_PIN_START + i, OUTPUT);
    }
}

// the LED_COUNT least significant bits of pattern
// are used to store and update the current pattern
// displayed by the LEDs
int pattern;

// loop: runs repeatedly until you get bored, power
// runs out, or the universe explodes
void loop() {
    // Shift the bits left one place in pattern,
    // essentially shifting the bit pattern over
    pattern <<= 1;

    // Add either 0 or 1 to pattern, essentially
    // choosing the new LSB of pattern at random
    pattern += random(2);

    // Repeat for each of the LEDs:
    for (int i = 0; i < LED_COUNT; i++) {
        // The ith least significant bit of pattern is written
        // to the ith LED.
        digitalWrite(LED_PIN_START + i, pattern & (1 << i));
    }

    // Block for 100ms
    delay(100);
}
```

<a href="https://github.com/yoonbuck/hcde439-ino/blob/main/1-blink/blink.ino" target="_blank">View on Github</a>

# all together now!

The final effect can be seen in the video below. (This video loops, but in real life,
new bits are determined randomly—well, as “randomly” as the little
Arduino can muster—over time.)

<video autoplay loop muted>
<source src="https://cdn.yoonbuck.com/hcde439-www/1-blink/blink.webm" type="video/webm">
<source src="https://cdn.yoonbuck.com/hcde439-www/1-blink/blink.mp4" type="video/mp4">
</video>

Download:
<a href="https://cdn.yoonbuck.com/hcde439-www/1-blink/blink.webm" target="_blank">webm</a> ·
<a href="https://cdn.yoonbuck.com/hcde439-www/1-blink/blink.mp4" target="_blank">mp4</a> ·
gif [
<a href="https://cdn.yoonbuck.com/hcde439-www/1-blink/blink-large.gif" target="_blank">smallish</a> ·
<a href="https://cdn.yoonbuck.com/hcde439-www/1-blink/blink-monstrously-large.gif" target="_blank">giant</a> ]
