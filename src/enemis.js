class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy1_0');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(50);
        this.setScale(1.5);
        this.body.setAllowGravity(false);
        this.lifetime = 25000;
        this._alive = true;
        this._expireTimer = null;

        this.anims.play('enemy1_idle', true);
        this._moveRandomly();
        this._scheduleExpiration();
    }

    update(time, delta) {
            if (!this.active || !this._alive || !this.scene) return;

            if (!this.lifeElapsed) this.lifeElapsed = 0;
            this.lifeElapsed += delta;

            const remainingTime = this.lifetime - this.lifeElapsed;
            if (remainingTime < 10000 && remainingTime > 0) {
                this.setTint(0xffee00);
            }
    }

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

    takeDamage(amount) {
        if (!this._alive) return;

        this._alive = false;
        this.body.stop();
        this.scene.tweens.killTweensOf(this);

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

    _scheduleExpiration() {
        this._expireTimer = this._safeDelayedCall(this.lifetime, () => {
            this._expire();
        });
    }

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

    _safeDelayedCall(delay, callback) {
        if (!this.scene?.time) return null;
        return this.scene.time.delayedCall(delay, () => {
            if (this.scene && this.active) callback();
        });
    }

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
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.enemyGroup = scene.physics.add.group();
        this.enemyBullets = scene.physics.add.group();
        this.spawnTimer = null;
    }

    init() {
        // Explicitly set physics world bounds to match screen size (800x600)
        this.scene.physics.world.setBounds(0, 0, 800, 600);

        this.scene.physics.add.overlap(this.scene.player.bullets, this.enemyGroup, (bullet, enemy) => {
            if (!bullet || !bullet.active || !enemy || !enemy.active) return;
            bullet.destroy();
            enemy.takeDamage(1);
        });

        this.scene.physics.add.overlap(this.scene.player, this.enemyBullets, (player, bullet) => {
            if (!bullet || !bullet.active || !player || !player.active) return;
            bullet.destroy();
            player.takeDamageP(3);
        });

        this.spawnTimer = this.scene.time.addEvent({
            delay: 5500,
            loop: true,
            callback: () => {
                if (this.scene?.sys.isActive()) this.spawnEnemy();
            }
        });

        this.scene.time.addEvent({
            delay: 1500,
            loop: true,
            callback: () => this._fireAtPlayer()
        });
    }

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
        bullet.setTint(0xffee00);
        
        bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        bullet.setRotation(angle + Math.PI / 2);
    }

    spawnEnemy() {
        if (!this.scene || this.enemies.length >= 3) return;

        const x = Phaser.Math.Between(80, 720);
        const y = Phaser.Math.Between(120, 420);
        const enemy = new Enemy(this.scene, x, y);
        this.enemies.push(enemy);
        this.enemyGroup.add(enemy);
    }

    update(time, delta) {
        if (!this.scene) return;
        this.enemies = this.enemies.filter(e => e && e.active);
        for (const enemy of this.enemies) {
            enemy.update(time, delta);
        }
        this._cullBullets();
    }

    addBullet(bullet) {
        this.enemyBullets.add(bullet);
    }

    removeEnemy(enemy) {
        this.enemies = this.enemies.filter(e => e !== enemy);
        if (enemy?.active) this.enemyGroup.remove(enemy, false, false);
    }

    _cullBullets() {
        for (const bullet of [...this.enemyBullets.getChildren()]) {
            if (!bullet?.active) continue;
            if (bullet.y < -60 || bullet.y > 660 || bullet.x < -60 || bullet.x > 860) {
                bullet.destroy();
            }
        }
    }
}