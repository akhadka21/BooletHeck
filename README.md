# State Machine Boss Battle Demo

A Phaser 3 game demonstrating how finite state machines (FSMs) can drive enemy NPC behavior. Built as an introduction to state machines and the Strategy pattern.


## Controls

| Key | Action |
|-----|--------|
| ← → Arrow keys | Move player left / right |
| Space | Fire |

## What It Demonstrates

**Finite State Machine:** The boss's behavior is entirely controlled by a `StateMachine` instance (from `lib/NadionStateMachine.js`). The current state is displayed in the top-right corner.

**Strategy Pattern:** Each state in the FSM stores references to a `moveFn` and `attackFn`. When the boss transitions to a new state, `_applyState()` simply calls those functions — no `if/switch` branching needed. New behaviors can be added by defining new functions and wiring them into the state table.

## Boss States

| State | Trigger | Movement | Attack |
|-------|---------|----------|--------|
| **Amused** | Start / respawn | Slow back-and-forth | Single bullet downward, slow |
| **Irritated** | Lost 1/3 HP | Fast erratic dashes | Single bullet downward, fast |
| **Grrr** | Lost 2/3 HP | Figure-8 loop | 3-way spread aimed at player |
| **Berzerk** | 15% chance on any hit | Fast circular loop | 8-way bullet spray |
| **Death** | HP = 0 | — | Particle explosion, respawn after 5s |

Berzerk is an interrupt state — it lasts 3 seconds then returns to whichever state it interrupted. This is modeled as three separate states (`berzerk_amused`, `berzerk_irritated`, `berzerk_grrr`), each with a `berzerkEnd` event pointing back to its origin. This is an intentional design choice to show how flat FSMs handle "return to previous state."

## Project Structure

```
index.html                  Entry point
lib/
  NadionStateMachine.js     FSM implementation 
src/
  main.js                   Phaser.Game config
  Player.js                 Player sprite class
  Boss.js                   Boss sprite class + FSM logic
  Scenes/
    BossBattle.js           Main game scene
assets/
  character_robot_sheet.*   Boss sprites
  spaceShooter2_spritesheet.*  Player and bullet sprites
```

## Art Assets

Art assets from [Kenney Assets](https://kenney.nl/), with gratitude.

## State Machine

State machine code extracted from the [Nadion demo](https://github.com/jcd-as/nadion/tree/master) by Josh Shepard, thank you!