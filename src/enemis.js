class Enemy extends Phaser.Physics.Arcade.Sprite {
    // enemy constructor setup color and movement
    constructor(scene, x, y, type = 'neutral') {
        super(scene, x, y, 'enemy1_0');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(50);
        this.setScale(1.5);
        this.body.setAllowGravity(false);
        this.lifetime = 25000;
        this._alive = true;
        this._expireTimer = null;
        this.enemyType = type;
        this.enemyColor = 'neutral';

        if (type === 'colored') {
            const colors = ['cyan', 'magenta', 'yellow', 'green'];
            this.enemyColor = Phaser.Utils.Array.GetRandom(colors);
            this._updateVisuals();
        }

        this.anims.play('enemy1_idle', true);
        this._moveRandomly();
        this._scheduleExpiration();
    }

    // set color of enemy based on state
    _updateVisuals() {
        const colors = { cyan: 0x00ffff, magenta: 0xff00ff, yellow: 0xffee00, green: 0x32a852, neutral: 0xffffff };
        this.setTint(colors[this.enemyColor]);
    }

    // update enemy life and change color if about to expire
    update(time, delta) {
            if (!this.active || !this._alive || !this.scene) return;

            if (!this.lifeElapsed) this.lifeElapsed = 0;
            this.lifeElapsed += delta;

            const remainingTime = this.lifetime - this.lifeElapsed;
            if (remainingTime < 10000 && remainingTime > 0) {
                this.setTint(0x32a852);
            }
    }

    // move to random spot on screen
    _moveRandomly() {
        if (!this.scene || !this.active || !this._alive) return;

        this.scene.tweens.add({
            targets: this,
            x: Phaser.Math.Between(50, 750),
            y: Phaser.Math.Between(80, 520),
            duration: Phaser.Math.Between(2000, 4000),
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (this.active && this._alive) {
                    this._moveRandomly();
                }
            }
        });
    }

    // handle taking damage and maybe drop a powerup
    takeDamage(amount) {
        if (!this._alive) return;

        this._alive = false;
        this.body.stop();
        this.scene.tweens.killTweensOf(this);
        this.scene.playSfx?.("edead", { volume: 0.6 });

        if (this.scene?.spawnPowerupNearPlayer && Math.random() < 0.2) {
            this.scene.spawnPowerupNearPlayer();
        }

        this.setTint(0xff6666);
        this.anims.play('enemy1_death', true);

        if (this.scene?.enemyManager) {
            this.scene.enemyManager.removeEnemy(this);
        }

        this._safeDelayedCall(120, () => {
            if (this.active) this.destroy();
        });
    }

    // start the timer for enemy expiration
    _scheduleExpiration() {
        this._expireTimer = this._safeDelayedCall(this.lifetime, () => {
            this._expire();
        });
    }

    // handle expiring and healing boss
    _expire() {
        if (!this._alive) return;

        this._alive = false;
        this.body.stop();
        this.scene.tweens.killTweensOf(this);
        this.setVisible(false);

        if (this.scene?.enemyManager) {
            this.scene.enemyManager.removeEnemy(this);
        }

        const boss = this.scene?.boss;
        if (boss && boss.active) boss.heal(15);

        this._safeDelayedCall(100, () => {
            if (this.active) this.destroy();
        });
    }

    // helper for timed events
    _safeDelayedCall(delay, callback) {
        if (!this.scene?.time) return null;
        return this.scene.time.delayedCall(delay, () => {
            if (this.scene && this.active) callback();
        });
    }

    // cleanup on destruction
    destroy(fromScene) {
        if (this._expireTimer) {
            this._expireTimer.remove(false);
            this._expireTimer = null;
        }
        if (this.scene) this.scene.tweens.killTweensOf(this);
        super.destroy(fromScene);
    }
}

class EnemyManager {
    // manage spawning and firing for all enemies
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.enemyGroup = scene.physics.add.group();
        this.enemyBullets = scene.physics.add.group();
        this.spawnTimer = null;
    }

    // init collision and timers for spawning
    init() {

        this.scene.physics.world.setBounds(0, 0, 800, 600);

        this.scene.physics.add.overlap(this.scene.player.bullets, this.enemyGroup, (bullet, enemy) => {
            if (!bullet || !bullet.active || !enemy || !enemy.active) return;
            
            const playerColor = this.scene.player.colorState;

            if (enemy.enemyColor === 'green' || (enemy.enemyColor !== 'neutral' && playerColor === enemy.enemyColor)) {
                bullet.destroy();
                return;
            }
            bullet.destroy();
            enemy.takeDamage(1);
        });

        this.scene.physics.add.overlap(this.scene.player, this.enemyBullets, (player, bullet) => {
            if (!bullet || !bullet.active || !player || !player.active) return;
            
            const playerColor = player.colorState;

            if (bullet.bulletColor === 'green' || (bullet.bulletColor !== 'neutral' && playerColor === bullet.bulletColor) || playerColor === 'green') {
                bullet.destroy();
                return;
            }
            bullet.destroy();
            player.takeDamageP(3);
        });

        this.spawnTimer = this.scene.time.addEvent({
            delay: 8000,
            loop: true,
            callback: () => {
                if (this.scene?.sys.isActive()) this.spawnEnemy();
            }
        });

        this.scene.time.addEvent({
            delay: 3000,
            loop: true,
            callback: () => this._fireAtPlayer()
        });
    }

    // fire aimed bullet at player from a random enemy
    _fireAtPlayer() {
        if (!this.scene?.player?.active) return;

        const player = this.scene.player;
        const nearby = this.enemies.filter(e =>
            e.active &&
            Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y) < 400
        );

        if (!nearby.length) return;

        const shooter = Phaser.Utils.Array.GetRandom(nearby);
        const angle = Phaser.Math.Angle.Between(shooter.x, shooter.y, player.x, player.y);

        const bullet = this.enemyBullets.create(shooter.x, shooter.y, 'eBullet1');
        
        if (!bullet) return;

        bullet.body.setAllowGravity(false);
        bullet.setDepth(50);
        bullet.setScale(1);
        bullet.bulletColor = shooter.enemyColor;
        const colors = { cyan: 0x00ffff, magenta: 0xff00ff, yellow: 0xffee00, green: 0x32a852, neutral: 0xffee00 };
        bullet.setTint(colors[shooter.enemyColor]);
        
        bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        bullet.setRotation(angle + Math.PI / 2);
    }

    // spawn a new enemy based on boss phase
    spawnEnemy() {
        if (!this.scene || this.enemies.length >= 5) return;

        const neutralCount = this.enemies.filter(e => e.enemyType === 'neutral').length;
        const coloredCount = this.enemies.length - neutralCount;

        const bossPhase = this.scene.boss?._phaseIndex || 0;

        let type;
        if (bossPhase < 1) {
            type = 'neutral';
        } else if (neutralCount < 2 && coloredCount < 3) {
            type = Math.random() < 0.4 ? 'neutral' : 'colored';
        } else if (neutralCount < 2) {
            type = 'neutral';
        } else if (coloredCount < 3) {
            type = 'colored';
        } else {
            return;
        }

        const x = Phaser.Math.Between(80, 720);
        const y = Phaser.Math.Between(120, 420);
        const enemy = new Enemy(this.scene, x, y, type);
        this.enemies.push(enemy);
        this.enemyGroup.add(enemy);
    }

    // update all enemies and cleanup bullets
    update(time, delta) {
        if (!this.scene) return;
        this.enemies = this.enemies.filter(e => e && e.active);
        for (const enemy of this.enemies) {
            enemy.update(time, delta);
        }
        this._cullBullets();
    }

    // add a bullet to the group
    addBullet(bullet) {
        this.enemyBullets.add(bullet);
    }

    // remove enemy from tracking
    removeEnemy(enemy) {
        this.enemies = this.enemies.filter(e => e !== enemy);
        if (enemy?.active) this.enemyGroup.remove(enemy, false, false);
    }

    // delete offscreen bullets
    _cullBullets() {
        for (const bullet of [...this.enemyBullets.getChildren()]) {
            if (!bullet?.active) continue;
            if (bullet.y < -60 || bullet.y > 660 || bullet.x < -60 || bullet.x > 860) {
                bullet.destroy();
            }
        }
    }
}
