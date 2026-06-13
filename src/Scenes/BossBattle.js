class BossBattle extends Phaser.Scene {
    constructor() {
        super({ key: 'BossBattle' });
    }

    preload() {
        // this.load.atlasXML('eyeboss', 'assets/character_eyeboss_sheet.png', 'assets/character_eyeboss_sheet.xml');
        this.load.atlasXML('ships', 'assets/spaceShooter2_spritesheet.png', 'assets/spaceShooter2_spritesheet.xml');
        for (let i = 1; i <= 4; i++){
            this.load.image(`ship${i}`,
                `assets/player/ship${i}.png`
            );
        }

        
        for (let i = 1; i <= 3; i++) {
            this.load.image(`boss_${i}`, 
                `assets/bosseye/EyeBoss-Sheet${i}.png`
            );
        }   

        this.load.image("pupil", "assets/bosseye/pupil.png");

        for (let i = 1; i <= 14; i++) {
            this.load.image(`fire${i}`, `assets/fire/Group 4 - 1_${i}.png`);
        }

    }

    scrollStarField(delta) {
        this.stars.forEach((s) => {
            s.y += delta * 0.05 * s.width;
        });
    }

    deleteOffscreenStars() {
        this.stars = this.stars.filter((s) => {
            if (s.y > 620) {
                s.destroy();
                return false;
            }
            return true;
        });
    }

    addNewStars() {
        while (this.stars.length < 90) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(-20, -5);
            const sz = Phaser.Math.Between(1, 3);
            this.stars.push(this.add.rectangle(x, y, sz, sz, 0xffffff).setAlpha(Phaser.Math.FloatBetween(0.2, 0.8)));
        }
    }

    pulse(time) {
        const scale = 1 + 0.05 * Math.sin(time * 0.005);
        this.bosseye.setScale(2 * scale);
        this.boss.setScale(2 * scale);
    }

    create() {
        // Star field

        this.stars = [];

        for (let i = 0; i < 90; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const sz = Phaser.Math.Between(1, 3);
            this.stars.push(this.add.rectangle(x, y, sz, sz, 0xffffff).setAlpha(Phaser.Math.FloatBetween(0.2, 0.8)));
        }

        this._createAnimations();



        



        this.player = new Player(this, 400, 530);
        this.boss = new Boss(this, 400, 80);
        this.bosseye = this.add.sprite(this.boss.x + 50, this.boss.y, "pupil").setDepth(1).setScale(2);
        this.bosseye.flipY = true;
        
        this.flames = [];
        this.powers = [];

        this.powerUpTimers = {};
        this.powerUpGraphics = this.add.graphics().setDepth(200).setScrollFactor(0);
        this.ShieldGraphics =  this.add.graphics().setDepth(200).setScrollFactor(0);

        this.boss.flipY = true;
        this.boss.setScale(2);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.rKey = this.input.keyboard.addKey('R');


        this.physics.add.overlap(this.player.bullets, this.boss, (boss, bullet) => {
            bullet.destroy();
            boss.takeDamage(10);
        });

        this.physics.add.overlap(this.boss.bullets, this.player, (player, bullet) => {
            bullet.destroy();
            player.takeDamageP(7);
        });

        // HUD
        this.hpBossGraphics = this.add.graphics().setDepth(10);
        this.add.text(10, 8, 'BOSS HP', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace'
        }).setDepth(10);
        this.stateLabel = this.add.text(790, 10, 'STATE: amused', {
            fontSize: '14px', color: '#ffee00', fontFamily: 'monospace'
        }).setOrigin(1, 0).setDepth(10);
        // this.add.rectangle(400, 46, 800, 1, 0x334466).setDepth(10);
        
        this.hpPlayerGraphics = this.add.graphics().setDepth(10);
        this.add.text(10, 560, 'PLAYER HP', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace'
        }).setDepth(10);
        // this.stateLabel = this.add.text(790, 10, 'STATE: amused', {
        //     fontSize: '14px', color: '#ffee00', fontFamily: 'monospace'
        // }).setOrigin(1, 0).setDepth(10);

        this.add.rectangle(400, 300, 800, 600).setStrokeStyle(4, 0x5566aa).setDepth(100);


        this.createFireSlash(400, 0 , 90, 10, 75);

        // this.createPowerUp(100, 300, 1);
        // this.createPowerUp(150, 300, 2);
        // this.createPowerUp(200, 300, 3);
        this.createPowerUp(250, 300);
        this.createPowerUp(350, 300);

    }

    _createAnimations() {
        let floatframes = [];
        for (let i = 1; i <= 3; i++) {
            floatframes.push({ key: `boss_${i}` });
        }

        this.anims.create({
            key: 'eyeboss-float',
            frames: floatframes,
            frameRate: 2,
            repeat: -1
        });

        let fireframes = [];
        for (let i = 1; i <= 14; i++) {
            fireframes.push({ key: `fire${i}` });
        }

        this.anims.create({
            key: 'fire-crackle', 
            frames: fireframes,
            frameRate: 20,
            repeat: 4,

        });

    }

    update(time, delta) {
        this.player.update(this.cursors, this.spaceKey, time);
        this.boss.update(time, delta);
        this._updateBossHPBar();
        this._updatePlayerHPBar();
        this._cullBullets();
        this.scrollStarField(delta);
        this.deleteOffscreenStars();
        this.addNewStars();
        this.bosseye.setPosition(this.boss.x, this.boss.y + 20);
        this.pulse(time);
        this.updateCollision();
        this._drawPowerUpTimers();
        this._drawShieldUpTimers()

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }

    _updateBossHPBar() {
        const pct = this.boss.hp / this.boss.maxHP;
        const barX = 10;
        const barY = 24;
        const barW = 300;
        const barH = 16;

        this.hpBossGraphics.clear();
        this.hpBossGraphics.fillStyle(0x1a1a33);
        this.hpBossGraphics.fillRect(barX, barY, barW, barH);
        const color = pct > 0.6 ? 0x22cc44 : pct > 0.3 ? 0xffcc00 : 0xff3300
        this.hpBossGraphics.fillStyle(color);
        this.hpBossGraphics.fillRect(barX, barY, barW * pct, barH);
        this.hpBossGraphics.lineStyle(1, 0x5566aa);
        this.hpBossGraphics.strokeRect(barX, barY, barW, barH);
    }

    
    _updatePlayerHPBar() {
        const pct = this.player.hp / this.player.maxHP;
        const barX = 10;
        const barY = 576;
        const barW = 300;
        const barH = 16;

        this.hpPlayerGraphics.clear();
        this.hpPlayerGraphics.fillStyle(0x1a1a33);
        this.hpPlayerGraphics.fillRect(barX, barY, barW, barH);
        const color = pct > 0.6 ? 0x22cc44 : pct > 0.3 ? 0xffcc00 : 0xff3300
        this.hpPlayerGraphics.fillStyle(color);
        this.hpPlayerGraphics.fillRect(barX, barY, barW * pct, barH);
        this.hpPlayerGraphics.lineStyle(1, 0x5566aa);
        this.hpPlayerGraphics.strokeRect(barX, barY, barW, barH);
    }

    _cullBullets() {
        for (const b of [...this.player.bullets.getChildren()]) {
            if (b.y < -60 || b.y > 660 || b.x < -60 || b.x > 860) b.destroy();
        }
        for (const b of [...this.boss.bullets.getChildren()]) {
            if (b.y < -60 || b.y > 660 || b.x < -60 || b.x > 860) b.destroy();
        }
    }

    updateStateLabel(name) {
        if (this.stateLabel) this.stateLabel.setText('STATE: ' + name);
    }

    createFireSlash(x, y, angle, amount, gap) {
        let offset = Phaser.Math.DegToRad(angle);
        for (let i = 0; i <= amount; i++) {
            let flameX = x + Math.cos(offset) * (i * gap);
            let flameY = y + Math.sin(offset) * (i * gap);

            let warning = this.add.circle(flameX, flameY, 5, 0xff0000, 0.6);
            this.tweens.add({
                targets: warning,
                scaleX: 3,
                scaleY: 3,
                alpha: 0.3,
                duration: 1500,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    warning.destroy();

                    let flame = this.physics.add.sprite(flameX, flameY, "fire1");
                    flame.body.setAllowGravity(false);
                    flame.setScale(.5);
                    flame.play("fire-crackle");
                    this.flames.push(flame);

                    flame.on('animationcomplete', () => {
                        flame.destroy();
                        this.flames = this.flames.filter(f => f.active);
                    });
                }
            });
        }
    }

    createPowerUp(x, y, type) {
        const types = ['health', 'double', 'speed'];
        const colors = { health: 0x32a852, double: 0xa832a0, speed: 0x3278a8 };
        const chosen = type ?? Phaser.Utils.Array.GetRandom(types);

        let pu = this.add.circle(x, y, 10, colors[chosen]);
        pu.setDepth(50);
        pu.powerType = chosen;

        this.physics.add.existing(pu);
        pu.body.setAllowGravity(false);
        pu.body.setCircle(10);

        this.powers.push(pu);

        this.tweens.add({
            targets: pu,
            y: y - 10,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    updateCollision(){
        this.collisionFire();
        this.collisionPowerup();
    }

    collisionPowerup(){
        this.powers = this.powers.filter(pu => {
        
        if (!pu.active) {
            return false;
        }

        if (Phaser.Geom.Intersects.RectangleToRectangle(
            this.player.getBounds(), pu.getBounds()
        )) {
            if (pu.powerType === 'health') {
                this.player.hp = Math.min(this.player.maxHP, this.player.hp + 20);
            } else if (pu.powerType === 'double') {
                this.player.doubleShot = true;
                this.powerUpTimers['double'] = { startTime: this.time.now, duration: 5000 };
                this.time.delayedCall(5000, () => {
                    this.player.doubleShot = false;
                    delete this.powerUpTimers['double'];
                });
            } else if (pu.powerType === 'speed') {
                this.player.speedBoost = true;
                this.powerUpTimers['speed'] = { startTime: this.time.now, duration: 5000 };
                this.time.delayedCall(5000, () => {
                    this.player.speedBoost = false;
                    delete this.powerUpTimers['speed'];
                });
            }
            pu.destroy();
            return false;
        }
        return true;
       });
    }

    collisionFire() {
        this.physics.add.overlap(this.player, this.flames, (obj1, obj2) => {
            obj2.destroy();
            this.flames = this.flames.filter(f => f.active);
            console.log("hi");
            obj1.takeDamageP(5);
            if (this.pauseParticles) {
                this.time.delayedCall(500, () => {
                    this.scene.pause();
                    setTimeout(() => this.scene.resume(), 3000);
                    this.pauseParticles = false;
                });
            }
        });
    }

    _drawPowerUpTimers() {
    this.powerUpGraphics.clear();

    const icons = { double: 0xa832a0, speed: 0x3278a8 };
    let slot = 0;

    for (const [type, data] of Object.entries(this.powerUpTimers)) {
        const x = 700 + slot * 50;
        const y = 575;
        const radius = 16;
        const pct = 1 - (this.time.now - data.startTime) / data.duration;

        if (pct <= 0) {
            delete this.powerUpTimers[type];
            continue;
        }

        this.powerUpGraphics.fillStyle(0x222222, 0.8);
        this.powerUpGraphics.fillCircle(x, y, radius);

        this.powerUpGraphics.fillStyle(icons[type], 0.9);
        this.powerUpGraphics.slice(x, y, radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
        this.powerUpGraphics.fillPath();

        this.powerUpGraphics.lineStyle(2, 0xffffff, 0.6);
        this.powerUpGraphics.strokeCircle(x, y, radius);

        slot++;
    }

    
    }
    
    _drawShieldUpTimers() {
        
        console.log(this.player.lastInvuln)
        console.log(this.player.invulnCd)
        console.log(this.time)
        console.log("------")

        
        

        if(this.player.lastInvuln + this.player.invulnCd < this.time.now){
            // this.ShieldGraphics.clear();
            return;
        }

        this.ShieldGraphics.clear();

        const invuln =  0x34e5eb;

        
        const x = 26;
        const y = 540;
        const radius = 16;
        const pct = 1 - (this.time.now - this.player.lastInvuln) / this.player.invulnCd;


        this.ShieldGraphics.fillStyle(0x222222, 0.8);
        this.ShieldGraphics.fillCircle(x, y, radius);

        this.ShieldGraphics.fillStyle(invuln, 0.9);
        this.ShieldGraphics.slice(x, y, radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
        this.ShieldGraphics.fillPath();

        this.ShieldGraphics.lineStyle(2, 0xffffff, 0.6);
        this.ShieldGraphics.strokeCircle(x, y, radius);


        
    }
}
