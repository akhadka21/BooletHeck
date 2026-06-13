class Boss extends Phaser.Physics.Arcade.Sprite {
    // boss constructor setup things like hp and states
    constructor(scene, x, y) {
        super(scene, x, y, 'boss_1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(1.1);

        this.maxHP = 600;
        this.hp = this.maxHP;

        this.bullets = scene.physics.add.group();

        this._moveMode = null;
        this._pathT = 0;
        this._sprayRotation = 0;
        this._attackTimer = null;
        this._berzerkTimer = null;
        this._fireSlashTimer = null;
        this._phaseIndex = 0;
        this._lastRingTime = 0;
        this._lastHitSound = 0;
        this.colorState = 'neutral';
        const states = ['cyan', 'magenta', 'yellow', 'green'];
        this.nextColorState = Phaser.Utils.Array.GetRandom(states);
        this._immunityTimer = null;
        this._isFiringQuad = false;

        this.stateMachine = new StateMachine(this._buildStates());
        

        this.colorMatrix = this.postFX.addColorMatrix();
        this.glow = this.postFX.addGlow(0xffff, 0, 0);
        this.scene.tweens.add({
            targets: this.glow,
            outerStrength: 5,
            yoyo: true,
            loop: -1,
            ease: 'sine.inout'
        });

        this._applyState();
    }

    // build the state machine for the boss to change how it moves and shots
    _buildStates() {
        return [
            {
                name: 'amused',
                initial: true,
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._fireSlowDownward.bind(this),
                attackInterval: 3500,
                events: {
                    toIrritated: 'irritated',
                    toBerzerk: 'berzerk_amused',
                    toDeath: 'death'
                }
            },
            {
                name: 'irritated',
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._fireFastDownward.bind(this),
                attackInterval: 1500,
                events: {
                    toenraged: 'enraged',
                    toBerzerk: 'berzerk_irritated',
                    toDeath: 'death'
                }
            },
            {
                name: 'enraged',
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._firePatterns.bind(this),
                attackInterval: 2000,
                events: {
                    tolivid: 'livid',
                    toDeath: 'death',
                    toBerzerk: 'berzerk_enraged'
                }
            },
            {
                name: 'livid',
                moveFn: this._moveErratic.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 2500,
                events: {
                    toDeath: 'death',
                    toBerzerk: 'berzerk_livid'
                }
            },
            {
                name: 'berzerk_amused',
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 1200,
                events: {
                    berzerkEnd: 'amused',
                    toDeath: 'death'
                }
            },
            {
                name: 'berzerk_irritated',
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 1200,
                events: {
                    berzerkEnd: 'irritated',
                    toDeath: 'death'
                }
            },
            {
                name: 'berzerk_enraged',
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 1200,
                events: {
                    berzerkEnd: 'enraged',
                    toDeath: 'death'
                }
            },
            {
                name: 'berzerk_livid',
                moveFn: this._moveStill.bind(this),
                attackFn: this._fireLividBerzerk.bind(this),
                attackInterval: 800,
                events: {
                    berzerkEnd: 'livid',
                    toDeath: 'death'
                }
            },
            {
                name: 'death',
                moveFn: null,
                attackFn: null,
                attackInterval: 0,
                events: {
                    respawn: 'amused'
                }
            }
        ];
    }

    // apply the current state to the boss timers and visuals
    _applyState() {
        if (!this.scene) return;

        this.scene.tweens.killTweensOf(this);
        if (this._attackTimer) {
            this._attackTimer.remove(false);
            this._attackTimer = null;
        }
        if (this._fireSlashTimer) {
            this._fireSlashTimer.remove(false);
            this._fireSlashTimer = null;
        }
        if (this._immunityTimer) {
            this._immunityTimer.remove(false);
            this._immunityTimer = null;
        }
        this._moveMode = null;

        const state = this.stateMachine.getState();
        

        if (state.name.includes('amused')) this._phaseIndex = 0;
        else if (state.name.includes('irritated')) this._phaseIndex = 1;
        else if (state.name.includes('enraged')) this._phaseIndex = 2;
        else if (state.name.includes('livid')) this._phaseIndex = 3;

        if (state.name === 'death') {
            this._doDeath();
            return;
        }


        if (state.name.includes('enraged') || state.name.includes('livid')) {
            this._fireSlashTimer = this.scene.time.addEvent({
                delay: 7000,
                callback: () => {
                    if (this.active && this.scene && this.scene.player?.active) {
                        const ra = Phaser.Math.Between(0, 360);
                        this.scene.createFireSlash(this.scene.player.x, this.scene.player.y, ra, 5, 75);
                    }
                },
                loop: true
            });
        }


        this.colorMatrix.reset();
        this.colorMatrix.saturate(1 + (this._phaseIndex * 0.4));

        const colors = { neutral: 0xffffff, cyan: 0x00ffff, magenta: 0xff00ff, yellow: 0xffee00, green: 0x32a852 };
        if (this._phaseIndex >= 1) {
            this.glow.color = colors[this.colorState];
            this.setTint(colors[this.nextColorState]);
        } else {
            this.glow.color = 0xffffff;
            this.clearTint();
        }


        if (this._phaseIndex >= 1) {
            this._scheduleImmunityChange();
        }

        if (state.moveFn) state.moveFn();
        if (state.attackFn) {
            state.attackFn();
            this._attackTimer = this.scene.time.addEvent({
                delay: state.attackInterval,
                callback: () => {
                    if (this.scene && this.active) state.attackFn();
                },
                loop: true
            });
        }

        this.scene.updateStateLabel(state.name);
    }

    _scheduleImmunityChange() {
        if (!this.scene || !this.active) return;
        const delay = Phaser.Math.Between(7000, 12000); // spawn much less frequently

        this.scene.time.delayedCall(delay - 1500, () => {
            if (this.active) this._blinkGlow(220, 16);
        });

        this._immunityTimer = this.scene.time.delayedCall(delay, () => {
            if (this.active) this._changeImmunity();
        });
    }

    _blinkGlow(delay, count) {
        if (count <= 0 || !this.active) {
            if (this.active) this.glow.active = true;
            return;
        }
        this.glow.active = !this.glow.active;
        const nextDelay = Math.max(30, delay * 0.8);
        this.scene.time.delayedCall(nextDelay, () => this._blinkGlow(nextDelay, count - 1));
    }

    // change what the boss is immune to and fire a ring
    _changeImmunity() {
        this.colorState = this.nextColorState;
        if (!this._isFiringQuad) this._fireRing(this.colorState);


        const states = ['cyan', 'magenta', 'yellow', 'green'];
        this.nextColorState = Phaser.Utils.Array.GetRandom(states);
        
        const colors = { neutral: 0xffffff, cyan: 0x00ffff, magenta: 0xff00ff, yellow: 0xffee00, green: 0x32a852 };
        
        this.glow.active = true;



        this._scheduleImmunityChange();
    }

    // basic back and forth movement for earlier phases
    _moveBackAndForth() {
        if (!this.scene) return;
        this.play('eyeboss-float');

        const moveNext = () => {
            if (!this.scene || !this.active) return;
            const stateName = this.stateMachine.getState().name;
            if (!stateName.includes('amused') && !stateName.includes('enraged') && !stateName.includes('irritated')) return;

            let pos = { xpos: this.x, ypos: this.y };
            const player = this.scene?.player;
            if (player && player.active) {
                const playerPos = player.getPlayerPos?.();
                if (playerPos) pos = playerPos;
            }


            const speedMod = 1 + (this._phaseIndex * 0.1);

            this.scene.tweens.add({
                targets: this,
                x: Phaser.Math.Between(
                    Phaser.Math.Clamp(pos.xpos - 250, 0, 800),
                    Phaser.Math.Clamp(pos.xpos + 250, 0, 800)
                ),
                y: Phaser.Math.Between(0, 200),
                duration: Phaser.Math.Between(3000, 5000) / speedMod,
                ease: 'Sine.InOut',
                onComplete: () => {
                    if (this.scene && this.active) moveNext();
                }
            });
        };

        moveNext();
    }

    // erratic movement for final phase
    _moveErratic() {
        if (!this.scene) return;

        const doMove = () => {
            if (!this.scene || !this.active) return;
            const stateName = this.stateMachine.getState().name;
            if (!stateName.includes('livid')) return;

            const targetX = Phaser.Math.Between(80, 720);
            const speedMod = 1 + (this._phaseIndex * 0.1);
            const duration = Phaser.Math.Between(1200, 2000) / speedMod;

            this.scene.tweens.add({
                targets: this,
                x: targetX,
                duration: duration,
                ease: 'Quad.InOut',
                onComplete: () => {
                    if (this.scene && this.active) doMove();
                }
            });
        };

        doMove();
        this.play('eyeboss-float');
    }

    _moveFigureEight() {
        this._moveMode = 'figure8';
        this._pathT = 0;
        this.play('eyeboss-float');
    }

    _moveQuickLoop() {
        this._moveMode = 'loop';
        this._pathT = 0;
        this.play('eyeboss-float');
    }

    _moveDefault() {
        this._moveMode = 'default';
        this._pathT = 0;
        this.play('eyeboss-float');
    }

    // stop and move to center for berzerk
    _moveStill() {
        this.scene.tweens.killTweensOf(this);
        this._moveMode = null;
        this.scene.tweens.add({
            targets: this,
            x: 400,
            y: 150,
            duration: 500,
            ease: 'Power2'
        });
    }

    // fire bullets downwards slowly
    _fireSlowDownward() {
        this._fireDown(147);
    }

    // fire bullets downwards fast and maybe a ring
    _fireFastDownward() {
        this._fireDown(273);
        this._maybeFireRing();
    }

    // helper for firing downwards
    _fireDown(speed) {
        if (!this.scene || !this.active) return;
        const spread = Phaser.Math.DegToRad(15);

        const halfCount = Math.floor(this._phaseIndex / 2);
        const start = this._phaseIndex === 0 ? 0 : -Math.ceil(this._phaseIndex / 2);
        const end = this._phaseIndex === 0 ? 0 : Math.floor(this._phaseIndex / 2);

        for (let i = start; i <= end; i++) {
            const a = Phaser.Math.DegToRad(90) + i * spread;
            const b = this.bullets.create(this.x, this.y + 52, 'ships', 'spaceMissiles_002.png');
            if (!b) continue;
            b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
            b.setAngle(Phaser.Math.RadToDeg(a) + 90);
            b.setScale(0.5);
        }
    }
    

    // fire aimed patterns with spread
    _firePatterns() {
        if (!this.scene || !this.active) return;
        const player = this.scene.player;
        if (!player || !player.active) return;
        this._maybeFireRing();
        this._maybeFireWave();

        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const speed = 182;
        const spread = Phaser.Math.DegToRad(12);
        const extra = this._phaseIndex; 

        for (let i = -(3 + extra); i <= (3 + extra); i++) {
            const a = baseAngle + i * spread;
            const b = this.bullets.create(this.x, this.y + 24, 'ships', 'spaceMissiles_020.png');
            if (!b) continue;
            b.body.setAllowGravity(false);
            b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
            b.setAngle(Phaser.Math.RadToDeg(a) + 90);
           b.setScale(0.6)
        }
    }

    // spray bullets in all directions
    _fireSpray() {
        if (!this.scene || !this.active) return;
        this._maybeFireRing();
        const speed = 231;
        const count = 8;
        
        const types = ['cyan', 'magenta', 'yellow', 'green'];
        const waveColor = this._phaseIndex >= 1 ? Phaser.Utils.Array.GetRandom(types) : null;
        const colorValue = waveColor ? { cyan: 0x00ffff, magenta: 0xff00ff, yellow: 0xffee00, green: 0x32a852 }[waveColor] : 0xffffff;


        const waves = 1 + (this._phaseIndex > 1 ? 1 : 0);

        for (let w = 0; w < waves; w++) {
            const waveOffset = w * 0.1;
            for (let i = 0; i < count; i++) {
                const a = (i * (Math.PI * 2 / count)) + this._sprayRotation + waveOffset;
                const b = this.bullets.create(this.x, this.y + 24, 'ships', 'spaceMissiles_020.png');
                if (!b) continue;
                b.bulletColor = waveColor;
                b.setTint(colorValue);
                b.body.setAllowGravity(false);
                b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
                b.setAngle(Phaser.Math.RadToDeg(a) + 90);
                b.setScale(0.6);
            }
        }
        this._sprayRotation += 0.15;
    }

    // ultimate attack for final phase berzerk
    _fireLividBerzerk() {
        if (!this.scene || !this.active) return;
        this._fireRing();
        const speed = 250;
        const time = this.scene.time.now;


        const count = 12;
        for (let i = 0; i < count; i++) {
            const a = (i * (Math.PI * 2 / count)) + this._sprayRotation;
            const b = this.bullets.create(this.x, this.y + 24, 'ships', 'spaceMissiles_020.png');
            if (!b) continue;
            b.clearTint();
            b.bulletColor = null;
            b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
            b.setAngle(Phaser.Math.RadToDeg(a) + 90);
            b.setScale(0.6);
        }
        this._sprayRotation += 0.25;


        const player = this.scene.player;
        if (player && player.active) {
            const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            const angle = baseAngle + Math.sin(time * 0.01) * 0.6;
            const b = this.bullets.create(this.x, this.y + 24, 'ships', 'spaceMissiles_020.png');
            if (b) {
                b.clearTint();
                b.body.setVelocity(Math.cos(angle) * speed * 1.3, Math.sin(angle) * speed * 1.3);
                b.setAngle(Phaser.Math.RadToDeg(angle) + 90);
                b.setScale(0.7);
            }
        }
    }

    // check if it is time to fire a ring
    _maybeFireRing() {
        // lowered random spawn probability
        if (this._phaseIndex === 1 && Math.random() < 0.1) {
            this._fireRing();
        }
        if (this._phaseIndex === 2 && !this._isFiringQuad && Math.random() < 0.2) {
            this._fireQuadRings();
        }
    }

    // sequence of 4 rings with delay
    _fireQuadRings() {
        this._isFiringQuad = true;
        const types = ['cyan', 'magenta', 'yellow', 'green'];
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 1000, () => {
                if (this.scene && this.active && this.scene.spawnColorRing) {

                    this.scene.spawnColorRing(this.x, this.y, Phaser.Utils.Array.GetRandom(types));
                }
                if (i === 3) {
                    // enforce a 5 second delay after the sequence starts
                    this.scene.time.delayedCall(5000, () => { this._isFiringQuad = false; });
                }
            });
        }
    }

    // chance to fire a diagonal wave
    _maybeFireWave() {
        if (this._phaseIndex === 2 && Math.random() < 0.4) {
            const startX = Phaser.Math.Between(100, 700);
            const types = ['cyan', 'magenta', 'yellow', 'green'];
            const type = Phaser.Utils.Array.GetRandom(types);
            if (this.scene && this.scene.spawnDiagonalWave) {
                this.scene.spawnDiagonalWave(startX, type);
            }
        }
    }

    // fire a color ring based on boss state
    _fireRing(type = this.colorState) {
        if (this.scene?.spawnColorRing) {
            this.scene.spawnColorRing(this.x, this.y, type);
        }
    }
    



    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    takeDamage(amount) {
        if (!this.scene) return;
        const state = this.stateMachine.getState();
        if (state.name === 'death') return;

        this.hp = Math.max(0, this.hp - amount);
        if (this.scene.time.now > this._lastHitSound + 60) {
            this.scene.playSfx?.("pstep", { volume: 0.45 });
            this._lastHitSound = this.scene.time.now;
        }
        this._flashHurt();

        if (this.hp <= 0) {
            if (this._berzerkTimer) {
                this._berzerkTimer.remove(false);
                this._berzerkTimer = null;
            }
            this.stateMachine.consumeEvent('toDeath');
            this._applyState();
            return;
        }

        if (state.name.startsWith('berzerk')) return;

        if (state.name === 'amused' && this.hp <= this.maxHP * 0.9) {
            this.stateMachine.consumeEvent('toIrritated');
            this._applyState();
            return;
        }
        if (state.name === 'irritated' && this.hp <= this.maxHP * 0.55) {
            this.stateMachine.consumeEvent('toenraged');
            this._applyState();
            return;
        }
        if (state.name === 'enraged' && this.hp <= this.maxHP * 0.25) {
            this.stateMachine.consumeEvent('tolivid');
            this._applyState();
            return;
        }

        if (Math.random() < 0.55) {
            this.stateMachine.consumeEvent('toBerzerk');
            this._applyState();
            this._berzerkTimer = this.scene.time.delayedCall(3000, () => {
                if (!this.scene || !this.active) return;
                this._berzerkTimer = null;
                if (this.stateMachine.getState().name.startsWith('berzerk')) {
                    this.stateMachine.consumeEvent('berzerkEnd');
                    this._checkHPThresholds();
                    this._applyState();
                }
            });
        }
    }

    // check hp for phase transitions
    _checkHPThresholds() {
        const state = this.stateMachine.getState();
        if (state.name === 'amused' && this.hp <= this.maxHP * 0.9) {
            this.stateMachine.consumeEvent('toIrritated');
        } else if (state.name === 'irritated' && this.hp <= this.maxHP * 0.55) {
            this.stateMachine.consumeEvent('toenraged');
        } else if (state.name === 'enraged' && this.hp <= this.maxHP * 0.25) {
            this.stateMachine.consumeEvent('tolivid');
        }
    }

    // tint boss red when hit
    _flashHurt() {
        if (!this.scene || !this.active) return;
        this.setTint(0xff3333);
        this._safeDelayedCall(160, () => {
            if (this.active) this.clearTint();
        });
    }

    // handle boss death and signal scene
    _doDeath() {
        if (!this.scene) return;
        this.setActive(false);
        this.body.stop();
        this.bullets.clear(true, true);

        const emitter = this.scene.add.particles(this.x, this.y, 'ships', {
            frame: ['spaceEffects_013.png', 'spaceEffects_016.png'],
            speed: { min: 80, max: 380 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.4, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 900,
            gravityY: 0
        });
        emitter.explode(55);

        this._safeDelayedCall(1200, () => {
            if (emitter && emitter.active) emitter.destroy();
        });

        this.setVisible(false);
        if (this.scene) this.scene.updateStateLabel('death');

        // signal the scene that the boss is defeated
        this.scene.events.emit('boss-dead');
    }

    // safe helper for delayed calls
    _safeDelayedCall(delay, callback) {
        if (!this.scene?.time) return null;
        return this.scene.time.delayedCall(delay, () => {
            if (this.scene) callback();
        });
    }

    // reset boss for new fight
    _respawn() {
        if (!this.scene) return;
        this.hp = this.maxHP;
        this.setPosition(400, 80);
        this.setVisible(true);
        this.setActive(true);
        this.clearTint();
        this._applyState();
    }

    // update movement based on mode
    update(time, delta) {
        if (!this.active || !this.scene) return;

        if (this._moveMode === 'default') {
            this._pathT += delta * 0.0008;
            this.setRandomPosition(80, 720, 50, 150);
        } else if (this._moveMode === 'loop') {
            this._pathT += delta * 0.008;
            this.setPosition(
                400 + 155 * Math.cos(this._pathT),
                150 + 75 * Math.sin(this._pathT)
            );
        } else if (this._moveMode === 'figure8') {
            this._pathT += delta * 0.005;
            this.setPosition(
                400 + 200 * Math.cos(this._pathT),
                150 + 100 * Math.sin(this._pathT * 2)
            );
        }
    }
}
