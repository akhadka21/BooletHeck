class BossBattle extends Phaser.Scene {
    constructor() {
        super({ key: 'BossBattle' });
    }

    // preload assets
    preload() {
        this.load.atlasXML('ships', 'assets/spaceShooter2_spritesheet.png', 'assets/spaceShooter2_spritesheet.xml');
        for (let i = 1; i <= 4; i++){
            this.load.image(`ship${i}`,
                `assets/player/ship${i}.png`
            );
        }

        for (let i = 0; i <= 2; i++) {
            this.load.image(`enemy1_${i}`, `assets/esprite1/tile_038${i}.png`);
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

        this.load.image("eBullet1", "assets/esprite1/tile_0325.png");

        // audio
        this.load.audio("pshot", "assets/audio/pshot.mp3");
        this.load.audio("edead", "assets/audio/edead.mp3");
        this.load.audio("coin", "assets/audio/coinC.mp3");
        this.load.audio("phit", "assets/audio/phit.mp3");
        this.load.audio("pstep", "assets/audio/pstep.mp3");
        this.load.audio("pheal", "assets/audio/pheal.mp3");
        this.load.audio("powerup", "assets/audio/powerup.mp3");
        this.load.audio("wave", "assets/audio/wave.mp3");
        this.load.audio("crackle", "assets/audio/fcrackle.mp3");
        this.load.audio("bgmusic", "assets/audio/bgmusic.mp3");
    }

    playSfx(key, config = {}) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        this.sound.play(key, config);
    }

    startLoopingSfx(key, config = {}) {
        if (!this.sound || !this.cache.audio.exists(key)) return null;

        const sound = this.sound.add(key, {
            ...config,
            loop: true
        });
        sound.play();
        return sound;
    }

    playColorSfx(key, color, config = {}) {
        const rates = {
            neutral: 0.9,
            cyan: 1.05,
            magenta: 1.18,
            yellow: 1.32,
            green: 0.78
        };

        this.playSfx(key, {
            ...config,
            rate: rates[color] || 1
        });
    }

    stopAllFireAudio() {
        if (!this.fireAudios) return;

        this.fireAudios.forEach((fireAudio) => {
            if (fireAudio.sound) {
                fireAudio.sound.stop();
                fireAudio.sound.destroy();
            }
        });
        this.fireAudios = [];
    }

    startFireAudio(pendingWarnings) {
        const fireAudio = {
            sound: this.startLoopingSfx("crackle", { volume: 0.55 }),
            flames: 0,
            warnings: pendingWarnings
        };

        this.fireAudios.push(fireAudio);
        return fireAudio;
    }

    stopFireAudioIfDone(fireAudio) {
        if (!fireAudio || fireAudio.flames > 0 || fireAudio.warnings > 0) return;

        if (fireAudio.sound) {
            fireAudio.sound.stop();
            fireAudio.sound.destroy();
        }
        this.fireAudios = this.fireAudios.filter(audio => audio !== fireAudio);
    }

    finishFireFlame(flame) {
        const fireAudio = flame.fireAudio;
        if (!fireAudio) return;

        flame.fireAudio = null;
        fireAudio.flames = Math.max(0, fireAudio.flames - 1);
        this.stopFireAudioIfDone(fireAudio);
    }

    startBgMusic() {
        if (!this.sound || !this.cache.audio.exists("bgmusic")) return;

        this.bgMusic = this.sound.add("bgmusic", {
            loop: true,
            volume: 0.35
        });
        this.bgMusic.play();
    }

    stopBgMusic() {
        if (!this.bgMusic) return;

        this.bgMusic.stop();
        this.bgMusic.destroy();
        this.bgMusic = null;
    }

    // make a moving starfield
    scrollStarField(delta) {
        this.stars.forEach((s) => {
            s.y += delta * 0.05 * s.width;
        });
    }
    // delete offscreen stars
    deleteOffscreenStars() {
        this.stars = this.stars.filter((s) => {
            if (s.y > 620) {
                s.destroy();
                return false;
            }
            return true;
        });
    }
    // make new stars
    addNewStars() {
        while (this.stars.length < 90) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(-20, -5);
            const sz = Phaser.Math.Between(1, 3);
            this.stars.push(this.add.rectangle(x, y, sz, sz, 0xffffff).setAlpha(Phaser.Math.FloatBetween(0.2, 0.8)));
        }
    }
    // make the boss pulse
    pulse(time) {
        const scale = 1 + 0.05 * Math.sin(time * 0.005);
        this.bosseye.setScale(2 * scale);
        this.boss.setScale(2 * scale);
    }
    // set up instance variables, key presses,graphics, test and intial starting layout
    create() {
        this.isEnding = false;
        this.stateLabel = null;
        this.hpBossGraphics = null;
        this.hpPlayerGraphics = null;
        this.powerUpGraphics = null;
        this.ShieldGraphics = null;
        this.bgMusic = null;

        this.stars = [];
        // border
        for (let i = 0; i < 90; i++) {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
            const sz = Phaser.Math.Between(1, 3);
            this.stars.push(this.add.rectangle(x, y, sz, sz, 0xffffff).setAlpha(Phaser.Math.FloatBetween(0.2, 0.8)));
        }

        this._createAnimations();
        // instance variables
        this.player = new Player(this, 400, 530);
        this.boss = new Boss(this, 400, 80);
        this.bosseye = this.add.sprite(this.boss.x + 50, this.boss.y, "pupil").setDepth(1).setScale(2);
        this.bosseye.flipY = true;
        
        this.flames = [];
        this.activeRings = [];
        this.powers = [];
        this.fireAudios = [];
        this.events.once('shutdown', () => {
            this.stopAllFireAudio();
            this.stopBgMusic();
        });
        this.startBgMusic();

        this.powerUpTimers = {};
        this.powerUpGraphics = this.add.graphics().setDepth(200).setScrollFactor(0);
        this.ShieldGraphics =  this.add.graphics().setDepth(200).setScrollFactor(0);
        // boss setup
        this.boss.flipY = true;
        this.boss.setScale(2);
        // key presses
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.rKey = this.input.keyboard.addKey('R');
        // add keys for developer tools
        this.lKey = this.input.keyboard.addKey('L');
        this.pKey = this.input.keyboard.addKey('P');

        // graphics for hp
        this.hpBossGraphics = this.add.graphics().setDepth(10);
        this.add.text(10, 8, 'BOSS HP', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace'
        }).setDepth(10);
        this.stateLabel = this.add.text(790, 10, 'STATE: amused', {
            // show the current boss state on screen
            fontSize: '14px', color: '#ffee00', fontFamily: 'monospace'
        }).setOrigin(1, 0).setDepth(10);
        
        this.hpPlayerGraphics = this.add.graphics().setDepth(10);
        this.add.text(10, 560, 'PLAYER HP', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace'
        }).setDepth(10);

        // color guide
        const guideX = 720;
        const guideY = 530;
        this.add.text(guideX, guideY - 45, 'COLOR KEYS', { fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(110);
        this.add.text(guideX, guideY - 22, '▲ YELLOW', { fontSize: '11px', color: '#ffee00', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(110);
        this.add.text(guideX - 50, guideY, '◀ CYAN', { fontSize: '11px', color: '#00ffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(110);
        this.add.text(guideX + 50, guideY, 'MAGENTA ▶', { fontSize: '11px', color: '#ff00ff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(110);
        this.add.text(guideX, guideY + 22, '▼ GREEN', { fontSize: '11px', color: '#32a852', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(110);
        this.add.text(guideX, guideY + 45, '[E] NEUTRAL', { fontSize: '11px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(110);

        this.add.rectangle(400, 300, 800, 600).setStrokeStyle(4, 0x5566aa).setDepth(100);

        // setup
        this.createPowerUp(150, 300);
        this.createPowerUp(650, 300);

        this.createFireSlash(100, 100, 90, 5, 75)

        this.enemyManager = new EnemyManager(this);
        this.enemyManager.init();

        // listen for boss death to trigger victory
        this.events.off('boss-dead');
        this.events.once('boss-dead', () => {
            this.isEnding = true;
            this.time.delayedCall(1500, () => {
                this.scene.start('Victory');
            });
        });

    }
    // create animations for images
    _createAnimations() {
        let floatframes = [];
        for (let i = 1; i <= 3; i++) {
            floatframes.push({ key: `boss_${i}` });
        }

        if (!this.anims.exists('eyeboss-float')) {
            this.anims.create({
                key: 'eyeboss-float',
                frames: floatframes,
                frameRate: 2,
                repeat: -1
            });
        }

        let fireframes = [];
        for (let i = 1; i <= 14; i++) {
            fireframes.push({ key: `fire${i}` });
        }

        if (!this.anims.exists('fire-crackle')) {
            this.anims.create({
                key: 'fire-crackle', 
                frames: fireframes,
                frameRate: 20,
                repeat: 4,

            });
        }

        
        if (!this.anims.exists("enemy1_idle")) {
            this.anims.create({
                key: "enemy1_idle",
                frames: [
                    { key: 'enemy1_0' },
                    { key: 'enemy1_1' },
                ],
                frameRate: 10,
                repeat: -1
            });
        }

        if (!this.anims.exists("enemy1_death")) {
            this.anims.create({
                key: "enemy1_death",
                frames: [
                    { key: 'enemy1_2' },
                ],
                frameRate: 1,
                repeat: 0
            });
        }

    }
    // update
    update(time, delta) {
        if (this.isEnding) return;

        if (this.player && this.player.active) {
            this.player.update(this.cursors, this.spaceKey, time);
            if (this.player.hp <= 0) {
                this.isEnding = true;
                this.scene.start('GameOver');
                return;
            }
        }
        if (this.boss && this.boss.active) {
            this.boss.update(time, delta);
        }
        if (this.enemyManager) {
            this.enemyManager.update(time, delta);
        }
        this._updateBossHPBar();
        this._updatePlayerHPBar();
        this._cullBullets();
        this.scrollStarField(delta);
        this.deleteOffscreenStars();
        this.addNewStars();
        this._updateRings();
        this.bosseye.setPosition(this.boss.x, this.boss.y + 20);
        this.pulse(time);
        this.updateCollision();
        this._drawPowerUpTimers();
        this._drawShieldUpTimers()

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
            return;
        }

        // handle dev cheats for instant win or loss
        if(Phaser.Input.Keyboard.JustDown(this.lKey)) {
            this.isEnding = true;
            this.scene.start('GameOver');
            return;
        }

        if(Phaser.Input.Keyboard.JustDown(this.pKey)) {
            this.isEnding = true;
            this.scene.start('Victory');
            return;
        }
    }
    // update boss hp bar
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

    // update player hp bar
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
    // bullet cleanup
    _cullBullets() {
        if (this.player?.bullets) {
            for (const b of [...this.player.bullets.getChildren()]) {
                if (b.y < -60 || b.y > 660 || b.x < -60 || b.x > 860) b.destroy();
            }
        }
        if (this.boss?.bullets) {
            for (const b of [...this.boss.bullets.getChildren()]) {
                if (b.y < -60 || b.y > 660 || b.x < -60 || b.x > 860) b.destroy();
            }
        }
    }
    // update state label
    updateStateLabel(name) {
        if (this.stateLabel?.active) this.stateLabel.setText('STATE: ' + name);
    }
    // create color ring attack at the postion of the boss expanding to the max radius
    spawnColorRing(x, y, forcedType = null) {
        const types = ['yellow', 'cyan', 'magenta', 'green'];
        const colors = { yellow: 0xffee00, cyan: 0x00ffff, magenta: 0xff00ff, green: 0x32a852, neutral: 0xffffff };
        const type = forcedType || Phaser.Utils.Array.GetRandom(types);
        this.playColorSfx("coin", type, { volume: 0.55 });
        
        const ring = this.add.arc(x, y, 0, 0, 360, false);
        ring.setStrokeStyle(12, colors[type], 0.8);
        ring.ringType = type;
        ring.hasHit = false;
        ring.maxRadius = 600;
        
        this.activeRings.push(ring);
        
        this.tweens.add({
            targets: ring,
            radius: ring.maxRadius,
            duration: 2500,
            ease: 'Linear',
            onComplete: () => {
                ring.destroy();
                this.activeRings = this.activeRings.filter(r => r !== ring);
            }
        });
    }
    // create diagonal wave starting at a random x value at the top of the screen with a warning and going down
    spawnDiagonalWave(startX, type) {
        const colors = { yellow: 0xffee00, cyan: 0x00ffff, magenta: 0xff00ff, green: 0x32a852, neutral: 0xffffff };
        const color = colors[type];
        this.playColorSfx("wave", type, { volume: 0.65 });

        // warning
        const warning = this.add.rectangle(startX, 0, 200, 20).setStrokeStyle(4, 0xaaaaaa, 0.8).setOrigin(0.5, 0);
        

        let blink = (delay, count) => {
            if (count <= 0 || !warning.active) return;
            warning.setVisible(!warning.visible);
            

            const nextDelay = Math.max(40, delay * 0.82);
            this.time.delayedCall(nextDelay, () => blink(nextDelay, count - 1));
        };
        blink(220, 16);

        this.time.delayedCall(1500, () => {
            warning.destroy();
            if (!this.player || !this.player.active) return;


            const wave = this.add.rectangle(startX, -40, 200, 50, color).setOrigin(0.5, 0.5).setAlpha(0.85).setDepth(40);
            this.physics.add.existing(wave);
            wave.waveType = type;
            
            const angle = Phaser.Math.Angle.Between(startX, -40, this.player.x, this.player.y);
            const speed = 380;
            wave.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

            this.tweens.add({
                targets: wave,
                scaleX: 0,
                duration: 4500,
                ease: 'Linear',
                onUpdate: () => {
                    if (wave.active && wave.body) {
                        wave.body.setSize(wave.displayWidth, wave.displayHeight);
                    }
                }
            });

            this.physics.add.overlap(this.player, wave, (player, w) => {
                const playerColor = player.colorState;
                const protectedByColor = w.waveType === 'green' || playerColor === w.waveType || playerColor === 'green';
                const blockedByNeutral = playerColor === 'neutral' && player.invuln;
                if (!protectedByColor && !blockedByNeutral) {
                    player.takeDamageP(15);
                    w.destroy();
                }
            });
            this.time.delayedCall(5000, () => { if(wave.active) wave.destroy(); });
        });
    }
    // color ring update call
    _updateRings() {
        if (!this.player || !this.player.active) return;

        for (const ring of this.activeRings) {
            if (ring.hasHit) continue;

            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, ring.x, ring.y);
            

            if (Math.abs(dist - ring.radius) < 15) {
                let protectedByColor = this.player.colorState === ring.ringType;
                let blockedByNeutral = this.player.colorState === 'neutral' && this.player.invuln;

                if (!protectedByColor && !blockedByNeutral) {
                    this.player.takeDamageP(10);
                    ring.hasHit = true;
                    

                    this.cameras.main.shake(150, 0.01);
                } else if (protectedByColor) {

                    if (!ring.successFlash) {
                        ring.successFlash = true;
                        this.tweens.add({
                            targets: ring,
                            alpha: 0.2,
                            duration: 100,
                            yoyo: true
                        });
                    }
                }
            }
        }
    }
    // spawn power near the player if an enemy containing a power is kill
    spawnPowerupNearPlayer() {
        if (!this.player || !this.player.active) return;
        const rx = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-150, 150), 50, 750);
        const ry = Phaser.Math.Clamp(this.player.y + Phaser.Math.Between(-150, 150), 50, 550);
        this.createPowerUp(rx, ry);
    }
    // create fire slash move leaving behind flames on the map that are animations and disapear with him
    createFireSlash(x, y, angle, amount, gap) {
        let offset = Phaser.Math.DegToRad(angle);
        const fireAudio = this.startFireAudio((amount * 2) + 1);

        for (let i = -amount; i <= amount; i++) {
            let flameX = x + Math.cos(offset) * (i * gap);
            let flameY = y + Math.sin(offset) * (i * gap);

            let warning = this.add.arc(flameX, flameY, 15, 0, 360).setStrokeStyle(2, 0xff0000, 0.8);
            
            // make a warning shwoing where it is going to appear
            let blink = (delay, count) => {
                if (count <= 0 || !warning.active) return;
                warning.setVisible(!warning.visible);
                const nextDelay = Math.max(30, delay * 0.8);
                this.time.delayedCall(nextDelay, () => blink(nextDelay, count - 1));
            };
            blink(200, 18);
            // create flames that shrink over time
            this.time.delayedCall(1500, () => {
                fireAudio.warnings = Math.max(0, fireAudio.warnings - 1);

                if (warning.active) {
                    warning.destroy();

                    let flame = this.physics.add.sprite(flameX, flameY, "fire1");
                    flame.body.setAllowGravity(false);
                    flame.setScale(1.5);
                    flame.fireAudio = fireAudio;
                    fireAudio.flames++;

                    this.tweens.add({
                        targets: flame,
                        scale: 0,
                        duration: 3500,
                        ease: 'Linear'
                    });

                    flame.play("fire-crackle");
                    this.flames.push(flame);

                    flame.on('animationcomplete', () => {
                        this.finishFireFlame(flame);
                        flame.destroy();
                        this.flames = this.flames.filter(f => f.active);
                    });
                }

                this.stopFireAudioIfDone(fireAudio);
            });
        }
    }
    // create powertypes with 3 types
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
    // update collisions with som
    updateCollision(){
        this.collisionFire();
        this.collisionPowerup();
        this.collisionBossContact();
        this.collisionEnemyContact();
        this.collisionPlayerBullets();
        this.collisionBossBullets();
    }

    collisionPlayerBullets() {
        if (!this.boss?.active || !this.player?.bullets) return;
        const bb = this.boss.getBounds();
        [...this.player.bullets.getChildren()].forEach(bullet => {
            if (bullet.active && Phaser.Geom.Intersects.RectangleToRectangle(bullet.getBounds(), bb)) {
                // if boss has a color state and player matches it, the bullet is absorbed
                if (this.boss.colorState !== 'neutral' && this.player.colorState === this.boss.colorState) {
                    bullet.destroy();
                } else {
                    // otherwise, the boss takes damage
                    bullet.destroy();
                    this.boss.takeDamage(10);
                }
            }
        });
    }

    collisionBossBullets() {
        if (!this.player?.active || !this.boss?.bullets) return;
        const pb = this.player.getBounds();
        [...this.boss.bullets.getChildren()].forEach(bullet => {
            if (bullet.active && Phaser.Geom.Intersects.RectangleToRectangle(bullet.getBounds(), pb)) {
                // check if player is immune via matching color, green state, or green bullet type
                if (bullet.bulletColor === 'green' || (bullet.bulletColor && this.player.colorState === bullet.bulletColor) || this.player.colorState === 'green') {
                    bullet.destroy();
                } else {
                    // otherwise, player takes damage
                    bullet.destroy();
                    this.player.takeDamageP(7);
                }
            }
        });
    }
    // reduce hp if touching boss
    collisionBossContact() {
        if (this.player?.active && this.boss?.active) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.boss.getBounds())) {
                this.player.takeDamageP(0.2); 
            }
        }
    }
    // reduce hp if touching enemy
    collisionEnemyContact() {
        if (!this.player?.active || !this.enemyManager) return;
        this.enemyManager.enemies.forEach(enemy => {
            if (enemy.active && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), enemy.getBounds())) {
                this.player.takeDamageP(0.1);
            }
        });
    }
    // activate collision on pickup, health, double fire or speed
    collisionPowerup(){
        this.powers = this.powers.filter(pu => {
        
        if (!pu.active) {
            return false;
        }

        if (Phaser.Geom.Intersects.RectangleToRectangle(
            this.player.getBounds(), pu.getBounds()
        )) {
            if (pu.powerType === 'health') {
                this.player.hp = Math.min(this.player.maxHP, this.player.hp + 15);
                this.playSfx("pheal", { volume: 0.75 });
            } else if (pu.powerType === 'double') {
                this.player.doubleShot = true;
                this.playSfx("pshot", { volume: 0.7 });
                this.powerUpTimers['double'] = { startTime: this.time.now, duration: 5000 };
                this.time.delayedCall(5000, () => {
                    this.player.doubleShot = false;
                    delete this.powerUpTimers['double'];
                });
            } else if (pu.powerType === 'speed') {
                this.player.speedBoost = true;
                this.playSfx("powerup", { volume: 0.75 });
                this.player.invulnCd *= 0.5; // reduce shield cooldown by 50%
                this.player.lastInvuln = 0; // instantly refresh the cooldown
                this.powerUpTimers['speed'] = { startTime: this.time.now, duration: 5000 };
                this.time.delayedCall(5000, () => {
                    this.player.speedBoost = false;
                    this.player.invulnCd *= 2; // restore original cooldown
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
        const pb = this.player.getBounds();
        this.flames = this.flames.filter(flame => {
            if (flame.active && Phaser.Geom.Intersects.RectangleToRectangle(pb, flame.getBounds())) {
                this.player.takeDamageP(5);
                if (this.pauseParticles) {
                    this.time.delayedCall(500, () => {
                        this.scene.pause();
                        setTimeout(() => this.scene.resume(), 3000);
                        this.pauseParticles = false;
                    });
                }
                this.finishFireFlame(flame);
                flame.destroy();
                return false;
            }
            return true;
        });
    }

    _drawPowerUpTimers() {
    this.powerUpGraphics.clear();

    const icons = { double: 0xa832a0, speed: 0x3278a8 };
    let slot = 0;

    for (const [type, data] of Object.entries(this.powerUpTimers)) {
        const x = 600 + slot * 50;
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
        if(this.player.lastInvuln + this.player.invulnCd < this.time.now){
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
