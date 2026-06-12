# Code Overview — Study Guide

This guide walks through the key ideas in the source code. Read it alongside the files in `src/`.

---

## 1. How the Files Fit Together

```
index.html          loads scripts in order (Phaser → StateMachine → Player → Boss → Scene → main)
src/main.js         creates the Phaser.Game and hands control to the scene
src/Scenes/BossBattle.js   the game scene: loads assets, wires everything together, runs the game loop
src/Player.js       the player character: movement and shooting
src/Boss.js         the boss character: state machine, movement, and attacks
lib/NadionStateMachine.js  the FSM library 
```

The loading order in `index.html` matters: each file can only use classes defined by the scripts that came before it. `Boss.js` uses `StateMachine`, so `NadionStateMachine.js` must come first.

---

## 2. The Phaser Scene Lifecycle

Every Phaser scene has three special methods that the engine calls automatically:

```
preload()   runs once before the scene starts — load textures, audio, etc.
create()    runs once after loading — build the game world (sprites, physics, input)
update()    runs every frame (~60× per second) — move things, check input, update HUD
```

`BossBattle.js` follows this structure. `preload` loads the two sprite atlases. `create` builds the star field, animations, player, boss, collision rules, and HUD. `update` delegates to the player and boss, redraws the HP bar, and removes off-screen bullets.

---

## 3. Sprite Atlases

Both the boss and player use **texture atlases**: a single large image file paired with an XML file that names every sub-image within it.

```js
// BossBattle.js — preload()
this.load.atlasXML('robot', 'assets/character_robot_sheet.png', 'assets/character_robot_sheet.xml')
this.load.atlasXML('ships', 'assets/spaceShooter2_spritesheet.png', 'assets/spaceShooter2_spritesheet.xml')
```

After loading, individual frames are referenced by name, e.g. `'idle'`, `'walk0'`, `'spaceShips_001.png'`. Packing many images into one atlas reduces the number of draw calls and load requests.

---

## 4. Custom Sprite Classes

Both `Player` and `Boss` extend `Phaser.Physics.Arcade.Sprite`. This gives them a physics body for movement and collision, plus all the standard sprite features (position, scale, animation, tint, etc.).

Because they're instantiated with `new` rather than a factory method, they must manually register themselves with the scene and physics world:

```js
// Player.js — constructor
scene.add.existing(this)       // add to the scene's display list (so it gets drawn)
scene.physics.add.existing(this) // give it an arcade physics body
```

This is the standard pattern in Phaser 3 for custom sprite subclasses.

---

## 5. The State Machine

`lib/NadionStateMachine.js` provides a simple FSM. You construct it with an array of state objects:

```js
const sm = new StateMachine([
    { name: 'idle',    initial: true, events: { startWalking: 'walk' } },
    { name: 'walk',                   events: { stop: 'idle'         } }
])
```

Each state has a `name`, an `events` map (event name → name of next state), and optionally `initial: true` to mark the starting state.

To drive the machine, you call `consumeEvent('eventName')`. It looks up the event in the current state's events map and moves to the named state. If the event doesn't exist for the current state, it logs a warning and stays put.

```js
sm.getState()   // returns the current state object
sm.reset()      // returns to the initial state
```

---

## 6. The Boss State Table — Strategy Pattern

The most important design idea in this project lives in `Boss._buildStates()`. Each state object carries not just FSM data, but also **two function references**: `moveFn` and `attackFn`.

```js
{
    name: 'amused',
    initial: true,
    moveFn: this._moveBackAndForth.bind(this),   // ← which movement to use
    attackFn: this._fireSlowDownward.bind(this), // ← which attack to use
    attackInterval: 2000,
    events: { toIrritated: 'irritated', toBerzerk: 'berzerk_amused', toDeath: 'death' }
},
{
    name: 'irritated',
    moveFn: this._moveErratic.bind(this),        // ← different movement
    attackFn: this._fireFastDownward.bind(this), // ← different attack
    attackInterval: 700,
    events: { toGrrr: 'grrr', toBerzerk: 'berzerk_irritated', toDeath: 'death' }
},
// ...
```

This is the **Strategy pattern**: behavior is packaged as a swappable function. `_applyState()` doesn't need to know anything about *what* the state does — it just calls whichever functions are stored in the current state object:

```js
// Boss.js — _applyState()
if (state.moveFn) state.moveFn()
if (state.attackFn) {
    state.attackFn()
    this._attackTimer = this.scene.time.addEvent({
        delay: state.attackInterval,
        callback: state.attackFn,
        loop: true
    })
}
```

**The payoff:** to add a new boss phase, you write a new movement function and a new attack function, then add one entry to the states array. No existing code needs to change.

### Why `.bind(this)`?

`this._moveBackAndForth.bind(this)` creates a new function that, when called, always has `this` set to the boss instance. Without `.bind`, calling `state.moveFn()` would lose the `this` context and crash when the method tries to access `this.scene`, `this.bullets`, etc.

---

## 7. State Transitions — `takeDamage()`

`takeDamage()` is the central logic for transitioning between states. It checks conditions in priority order:

1. **Already dead?** — ignore the hit entirely.
2. **HP reaches zero?** — cancel any berzerk timer, go to `death`.
3. **In berzerk?** — let the hit register (HP drops) but don't trigger any other transitions.
4. **HP crossed a threshold?** — transition to the next phase (`amused → irritated` at 2/3 HP, `irritated → grrr` at 1/3 HP).
5. **Random berzerk chance (15%)?** — interrupt the current state for 3 seconds, then return.

Every transition follows the same two-step pattern:
```js
this.stateMachine.consumeEvent('toIrritated')  // 1. update the FSM
this._applyState()                              // 2. apply the new state's behavior
```

---

## 8. The Berzerk Problem

The design calls for berzerk to be an **interrupt state** that returns to wherever it was triggered from. A flat FSM has no built-in concept of "remember where you came from."

The solution used here: instead of one berzerk state, there are **three** — `berzerk_amused`, `berzerk_irritated`, and `berzerk_grrr`. Each has the same `moveFn` and `attackFn`, but a different `berzerkEnd` event target:

```
berzerk_amused    → berzerkEnd → amused
berzerk_irritated → berzerkEnd → irritated
berzerk_grrr      → berzerkEnd → grrr
```

By entering the right variant (`toBerzerk` events point to `'berzerk_amused'` from amused, etc.), the machine "remembers" the origin state by encoding it into which berzerk state it entered.

A 3-second timer fires the `berzerkEnd` event. Before applying the returned state, `_checkHPThresholds()` checks whether a phase transition should have happened during the berzerk window (e.g., the boss lost a lot of HP while berzerk and should now be in Grrr, not Irritated).

---

## 9. Two Approaches to Movement

The boss uses two different movement techniques, depending on the state.

### Tweens (Amused and Irritated)

A **tween** animates a value from A to B over time. Phaser manages the interpolation automatically.

```js
// _moveBackAndForth — smooth back-and-forth
this.scene.tweens.add({
    targets: this,       // animate the boss sprite
    x: { from: 80, to: 720 },
    duration: 2500,
    ease: 'Sine.InOut',  // slow at each end, fast in the middle
    yoyo: true,          // play forward then backward
    repeat: -1           // loop forever
})
```

For Irritated, `_moveErratic` uses a recursive pattern instead: each tween picks a random target and duration, and its `onComplete` callback immediately starts the next tween. A guard at the top bails out if the state has changed, stopping the chain.

When `_applyState()` is called on a state change, `this.scene.tweens.killTweensOf(this)` cancels any active tweens before starting new behavior.

### Parametric Equations (Grrr and Berzerk)

For the figure-8 and loop patterns, the position is computed from a formula each frame. `_moveFigureEight()` just sets a flag:

```js
this._moveMode = 'figure8'
this._pathT = 0     // parameter that advances over time
```

Then in `update()`:
```js
if (this._moveMode === 'figure8') {
    this._pathT += delta * 0.0008          // advance parameter by time elapsed
    this.setPosition(
        400 + 280 * Math.sin(this._pathT),         // x traces a wide sine wave
        130 +  80 * Math.sin(2 * this._pathT)      // y oscillates twice as fast → figure-8
    )
}
```

`delta` is milliseconds since the last frame. Multiplying by it makes the motion **frame-rate independent**: the boss moves at the same speed whether the game runs at 30 or 120 FPS.

The loop pattern uses `cos` for x and `sin` for y at the same rate, which traces an ellipse.

---

## 10. Bullet Patterns

All boss bullets are created through `this.bullets.create(...)`, which adds a new physics-enabled sprite to the `bullets` group. Velocity is set in pixels per second.

**Straight downward** (`_fireDown`): velocity is purely in +Y.

**Aimed spread** (`_firePatterns`): calculates the angle from the boss to the player using `Phaser.Math.Angle.Between`, then fires three bullets offset by ±18° using trigonometry:

```js
const a = baseAngle + i * spread         // angle in radians
b.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed)
```

**8-way spray** (`_fireSpray`): fires bullets at 0°, 45°, 90°, … 315° — one per loop iteration using `i * 45` degrees converted to radians.

---

## 11. Collision Detection

Phaser's arcade physics provides `overlap`: two objects (or groups) that touch trigger a callback.

```js
// BossBattle.js — create()
this.physics.add.overlap(this.player.bullets, this.boss, (boss, bullet) => {
    bullet.destroy()
    boss.takeDamage(10)
})
```

The callback receives the two objects that overlapped, in the same order as the arguments to `overlap`. Destroying the bullet removes it from the scene and its group immediately.

Bullets that leave the screen are cleaned up every frame in `_cullBullets()`, preventing unbounded group growth.

---

## 12. The HUD

The HP bar is drawn using a `Graphics` object, which lets you draw filled rectangles and outlines programmatically. It's cleared and redrawn every frame in `_updateHPBar()`:

```js
this.hpGraphics.clear()
this.hpGraphics.fillStyle(color)
this.hpGraphics.fillRect(barX, barY, barW * pct, barH)   // width scales with HP %
```

The state label is a standard Phaser `Text` object. `Boss._applyState()` calls `this.scene.updateStateLabel(state.name)` on every transition, so the label always reflects the current FSM state — useful for seeing the machine in action.

---

## Questions to Consider

1. What would you need to change to add a fourth non-berzerk phase? How little code would you touch?
2. `_moveErratic` uses a recursive tween chain rather than a looping tween. What does the state-name guard inside `doMove` protect against?
3. Why does `takeDamage` check HP thresholds before checking for berzerk, rather than the other way around?
4. What would happen if `.bind(this)` were removed from the function references in `_buildStates`?
5. What is the difference between `setActive(false)` and `setVisible(false)`? Why does `_doDeath` call both?
6. How does `_checkHPThresholds` prevent the boss from getting "stuck" in the wrong phase after berzerk ends?
