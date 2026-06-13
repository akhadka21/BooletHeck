class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'boss_1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(1.1);

        this.maxHP = 300;
        this.hp = this.maxHP;

        this.bullets = scene.physics.add.group();

        this._moveMode = null;
        this._pathT = 0;
        this._attackTimer = null;
        this._berzerkTimer = null;

        this.stateMachine = new StateMachine(this._buildStates());
        this._applyState();
    }

    _buildStates() {
        return [
            {
                name: 'amused',
                initial: true,
                moveFn: this._moveBackAndForth.bind(this),
                attackFn: this._fireSlowDownward.bind(this),
                attackInterval: 2000,
                events: {
                    toIrritated: 'irritated',
                    toBerzerk: 'berzerk_amused',
                    toDeath: 'death'
                }
            },
            {
                name: 'irritated',
                moveFn: this._moveErratic.bind(this),
                attackFn: this._fireFastDownward.bind(this),
                attackInterval: 700,
                events: {
                    toenraged: 'enraged',
                    toBerzerk: 'berzerk_irritated',
                    toDeath: 'death'
                }
            },
            {
                name: 'enraged',
                moveFn: this._moveFigureEight.bind(this),
                attackFn: this._firePatterns.bind(this),
                attackInterval: 900,
                events: {
                    tolivid: 'livid',
                    toDeath: 'death',
                    toBerzerk: 'berzerk_enraged'
                }
            },
            {
                name: 'livid',
                moveFn: this._moveQuickLoop.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 800,
                events: {
                    toDeath: 'death',
                    toBerzerk: 'berzerk_livid'
                }
            },
            {
                name: 'berzerk_amused',
                moveFn: this._moveQuickLoop.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 350,
                events: {
                    berzerkEnd: 'amused',
                    toDeath: 'death'
                }
            },
            {
                name: 'berzerk_irritated',
                moveFn: this._moveQuickLoop.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 350,
                events: {
                    berzerkEnd: 'irritated',
                    toDeath: 'death'
                }
            },
            {
                name: 'berzerk_enraged',
                moveFn: this._moveQuickLoop.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 350,
                events: {
                    berzerkEnd: 'enraged',
                    toDeath: 'death'
                }
            },
            {
                name: 'berzerk_livid',
                moveFn: this._moveErratic.bind(this),
                attackFn: this._fireSpray.bind(this),
                attackInterval: 150,
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

    _applyState() {
        if (!this.scene) return;

        this.scene.tweens.killTweensOf(this);
        if (this._attackTimer) {
            this._attackTimer.remove(false);
            this._attackTimer = null;
        }
        this._moveMode = null;

        const state = this.stateMachine.getState();

        if (state.name === 'death') {
            this._doDeath();
            return;
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

    _moveBackAndForth() {
        if (!this.scene) return;
        this.play('eyeboss-float');

        const moveNext = () => {
            if (!this.scene || !this.active) return;

            let pos = { xpos: this.x, ypos: this.y };
            const player = this.scene?.player;
            if (player && player.active) {
                const playerPos = player.getPlayerPos?.();
                if (playerPos) pos = playerPos;
            }

            this.scene.tweens.add({
                targets: this,
                x: Phaser.Math.Between(
                    Phaser.Math.Clamp(pos.xpos - 250, 0, 800),
                    Phaser.Math.Clamp(pos.xpos + 250, 0, 800)
                ),
                y: Phaser.Math.Between(0, 200),
                duration: Phaser.Math.Between(1000, 3000),
                ease: 'Sine.InOut',
                onComplete: () => {
                    if (this.scene && this.active) moveNext();
                }
            });
        };

        moveNext();
    }

    _moveErratic() {
        if (!this.scene) return;

        const doMove = () => {
            if (!this.scene || !this.active) return;
            const stateName = this.stateMachine.getState().name;
            if (stateName !== 'irritated' && stateName !== 'berzerk_livid') return;

            const targetX = Phaser.Math.Between(80, 720);
            const duration = Phaser.Math.Between(300, 650);
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

    _fireSlowDownward() {
        this._fireDown(210);
    }

    _fireFastDownward() {
        this._fireDown(390);
    }

    _fireDown(speed) {
        if (!this.scene || !this.active) return;
        const b = this.bullets.create(this.x, this.y + 52, 'ships', 'spaceMissiles_002.png');
        if (!b) return;
        b.body.setVelocity(0, speed);
        b.setAngle(180);
        b.setScale(0.9);
    }

    _firePatterns() {
        if (!this.scene || !this.active) return;
        const player = this.scene.player;
        if (!player || !player.active) return;

        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const speed = 260;
        const spread = Phaser.Math.DegToRad(18);

        for (let i = -1; i <= 1; i++) {
            const a = baseAngle + i * spread;
            const b = this.bullets.create(this.x, this.y + 24, 'ships', 'spaceMissiles_020.png');
            if (!b) continue;
            b.body.setAllowGravity(false);
            b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
            b.setAngle(Phaser.Math.RadToDeg(a) + 90);
            b.setScale(0.85);
        }
    }

    _fireSpray() {
        if (!this.scene || !this.active) return;
        const speed = 330;
        for (let i = 0; i < 8; i++) {
            const a = Phaser.Math.DegToRad(i * 45);
            const b = this.bullets.create(this.x, this.y + 24, 'ships', 'spaceMissiles_020.png');
            if (!b) continue;
            b.body.setAllowGravity(false);
            b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
            b.setAngle(i * 45 + 90);
            b.setScale(0.85);
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

        if (state.name === 'amused' && this.hp <= this.maxHP * 2 / 3) {
            this.stateMachine.consumeEvent('toIrritated');
            this._applyState();
            return;
        }
        if (state.name === 'irritated' && this.hp <= this.maxHP * 1 / 3) {
            this.stateMachine.consumeEvent('toenraged');
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

    _checkHPThresholds() {
        const state = this.stateMachine.getState();
        if (state.name === 'amused' && this.hp <= this.maxHP * 4 / 5) {
            this.stateMachine.consumeEvent('toIrritated');
        } else if (state.name === 'irritated' && this.hp <= this.maxHP * 2 / 3) {
            this.stateMachine.consumeEvent('toenraged');
        } else if (state.name === 'enraged' && this.hp <= this.maxHP * 1 / 3) {
            this.stateMachine.consumeEvent('tolivid');
        }
    }

    _flashHurt() {
        if (!this.scene || !this.active) return;
        this.setTint(0xff3333);
        this._safeDelayedCall(160, () => {
            if (this.active) this.clearTint();
        });
    }

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

        this._safeDelayedCall(5000, () => {
            this.stateMachine.reset();
            this._respawn();
        });
    }

    _safeDelayedCall(delay, callback) {
        if (!this.scene?.time) return null;
        return this.scene.time.delayedCall(delay, () => {
            if (this.scene) callback();
        });
    }

    _respawn() {
        if (!this.scene) return;
        this.hp = this.maxHP;
        this.setPosition(400, 80);
        this.setVisible(true);
        this.setActive(true);
        this.clearTint();
        this._applyState();
    }

    update(time, delta) {
        if (!this.active || !this.scene) return;

        if (this._moveMode === 'default') {
            this._pathT += delta * 0.0008;
            this.setRandomPosition(80, 720, 50, 150);
        } else if (this._moveMode === 'loop') {
            this._pathT += delta * 0.003;
            this.setPosition(
                400 + 155 * Math.cos(this._pathT),
                150 + 75 * Math.sin(this._pathT)
            );
        }
    }
}