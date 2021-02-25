---
layout: process.njk
title: transistors
stepNo: 5
active: true
date: 2021-02-22
---

# project

For this week's project, I wanted to try out some new components that I hadn't
used before in the kit, so I thought the DHT11 temperature/humidity sensor and
LCD display could make for an interesting project. The circuit I created
switches a fan on or off based on the current temperature and a threshold
controlled by the user with a potentiometer.

This is a quite practical application of a fan and temperature sensor, and similar
systems can be found in a number of household devices. For example, many computers
contain fans designed to turn on or vary their speed based on temperature in order
to cool the CPU or GPU. Thermostats use temperature sensors to switch heating,
air conditioning, or fans in a building. My particular implementation might be
closest to the control system of an evaporative (swamp) cooler. For this application,
it would likely also be useful to know the humidity of the air, which is why my
project also displays the relative humidity read from the sensor (although this is
not used to decide whether the fan should turn on or off).

# hardware

## schematic

<a href="https://cdn.yoonbuck.com/hcde439-www/5-transistors/schematic.png" target="_blank" title="Click to view larger">![](https://cdn.yoonbuck.com/hcde439-www/5-transistors/schematic.png)</a>

## circuit

![](https://cdn.yoonbuck.com/hcde439-www/5-transistors/image.jpg)

The maximum output of the power supply is 2A, which is well under the MOSFET's maximum current of 32A at 25°C. The motor is only driven on a 25% duty cycle to further limit its maximum current and speed.

# code

```cpp
#include <Arduino.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal.h>

// with much love to:
//   DHT11 sensor example code:
//   https://create.arduino.cc/projecthub/pibots555/how-to-connect-dht11-sensor-with-arduino-uno-f4d239
//   LCD1602 example code:
//   https://create.arduino.cc/projecthub/najad/interfacing-lcd1602-with-arduino-764ec4

// output pin used to control fan
const int FAN_OUT = 9;
// input pin used to read user temperature setting
const int POT_IN = A5;

// pwm speed to run fan at
const int FAN_SPEED = 64;

// maximum temperature setting (F)
const float MAX_SETTING = 78.0f;
// minimum temperature setting (F)
const float MIN_SETTING = 65.0f;
// calculated distance between max/min setting
const float SETTING_DIFF = MAX_SETTING - MIN_SETTING;
// threshold at which temperature adjustments
// will take effect and be displayed
const float ADJUST_THRESHOLD = 0.15f;
// distance from user setting required to toggle fan
const float FAN_THRESHOLD = 0.5f;

// how long to display setting value after adjustment
const int ADJUST_TIMEOUT = 1000;

// create the temperature/humidity sensor object
DHT dht(2, DHT11);
// create the lcd display object
LiquidCrystal lcd(12, 11, 4, 5, 6, 7);

// run once when the arduino turns on
void setup() {
  // initialize the DHT sensor
  dht.begin();
  // initialize the LCD library
  lcd.begin(16, 2);

  // declare the fan control pin as output
  pinMode(FAN_OUT, OUTPUT);
}

// current user temperature setting
float currentSetting;
// whether the fan is currently on
bool fanOn = false;
// how long until the setting value shouldn't
// be displayed anymore
int adjustTimeout;

// run repeatedly after setup
void loop() {
  // get the humidity value from the sensor
  float h = dht.readHumidity();
  // get the temperature in fahrenheit from the sensor
  float f = dht.readTemperature(true);

  // check if we got a bad read
  if (isnan(h) || isnan(f)) {
    // clear the lcd display
    lcd.clear();
    // move to the beginning
    lcd.setCursor(0, 0);
    // display "Sensor error!"
    lcd.print(F("Sensor error!"));
    // wait 100ms
    delay(100);
    // turn the fan off
    analogWrite(FAN_OUT, 0);
    // stop the loop immediately
    return;
  }

  // move cursor to the beginning
  lcd.setCursor(0, 0);
  // display the current measured temperature
  lcd.print(F("Temp: "));
  lcd.print(f);
  lcd.print(F("F   "));

  // move to the second line
  lcd.setCursor(0, 1);
  // read the potentiometer value
  int v = analogRead(POT_IN);
  // map from MIN_SETTING to MAX_SETTING
  float target = MAX_SETTING - SETTING_DIFF * v / 1023;
  // calculate the difference from the stored setting
  float diff = fabs(target - currentSetting);
  // if the difference is great enough,
  if (diff > (adjustTimeout ? 0.04 : ADJUST_THRESHOLD)) {
    // reset the setting display timeout
    adjustTimeout = ADJUST_TIMEOUT;
  }

  // if the setting has been changed recently
  if (adjustTimeout) {
    // update the setting value, with a bit of smoothing
    currentSetting = (4 * currentSetting + target) / 5;
    // decrement the time until switching back to humidity
    adjustTimeout--;
    // display the current user temperature setting
    lcd.print(F("Set:  "));
    lcd.print(currentSetting);
    lcd.print(F("F       "));
    // wait 1ms
    delay(1);
    // otherwise,
  } else {
    // display the current humidity
    lcd.print(F("Humidity: "));
    lcd.print((int) h);
    lcd.print(F("%   "));
  }

  // if the fan is on, but the temperature is low enough,
  if (fanOn && f <= currentSetting - FAN_THRESHOLD) {
    // turn it off
    fanOn = false;
    // otherwise, if the fan is off, but the temperature is high enough
  } else if (!fanOn && f >= currentSetting + FAN_THRESHOLD) {
    // turn it on
    fanOn = true;
  }

  // move cursor to the top right
  lcd.setCursor(15, 0);
  // display a star if the fan is on, and
  // clear that character if not
  lcd.print(fanOn ? F("*") : F(" "));
  // set the fan to be on or off as needed
  analogWrite(FAN_OUT, fanOn * FAN_SPEED);
}
```

# all together now!

The video below shows a short demo of the functionality. In the first half, I adjust the desired temperature setting to a value below the measured temperature, which turns the fan on, and above the measured temperature, which turns the fan off. After that, I place a preheated damp paper pad on the sensor, which causes the measured temperature and humidity to rise, eventually turning on the fan when the temperature becomes higher than the set threshold.

<video controls>
    <source src="https://cdn.yoonbuck.com/hcde439-www/5-transistors/transistors.webm" type="video/webm">
    <source src="https://cdn.yoonbuck.com/hcde439-www/5-transistors/transistors.mp4" type="video/mp4">
</video>
