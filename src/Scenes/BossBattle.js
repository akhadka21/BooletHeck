class BossBattle extends Phaser.Scene {
    constructor() {
        super({ key: 'BossBattle' });
    }

    preload() {
        // this.load.atlasXML('eyeboss', 'assets/character_eyeboss_sheet.png', 'assets/character_eyeboss_sheet.xml');
        this.load.atlasXML('ships', 'assets/spaceShooter2_spritesheet.png', 'assets/spaceShooter2_spritesheet.xml');

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

        this.createFireSlash(0, 0 , 30, 100);

        



        this.player = new Player(this, 400, 530);
        this.boss = new Boss(this, 400, 80);
        this.bosseye = this.add.sprite(this.boss.x + 50, this.boss.y, "pupil").setDepth(1).setScale(2);
        this.bosseye.flipY = true;
        
        this.flames = [];

        this.boss.flipY = true;
        this.boss.setScale(2);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.physics.add.overlap(this.player.bullets, this.boss, (boss, bullet) => {
            bullet.destroy();
            boss.takeDamage(10);
        });

        this.physics.add.overlap(this.boss.bullets, this.player, (player, bullet) => {
            bullet.destroy();
        });

        // HUD
        this.hpGraphics = this.add.graphics().setDepth(10);
        this.add.text(10, 8, 'BOSS HP', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace'
        }).setDepth(10);
        this.stateLabel = this.add.text(790, 10, 'STATE: amused', {
            fontSize: '14px', color: '#ffee00', fontFamily: 'monospace'
        }).setOrigin(1, 0).setDepth(10);
        this.add.rectangle(400, 46, 800, 1, 0x334466).setDepth(10);
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
        this._updateHPBar();
        this._cullBullets();
        this.scrollStarField(delta);
        this.deleteOffscreenStars();
        this.addNewStars();
        this.bosseye.setPosition(this.boss.x, this.boss.y + 20);
        this.pulse(time);
    }

    _updateHPBar() {
        const pct = this.boss.hp / this.boss.maxHP;
        const barX = 10;
        const barY = 24;
        const barW = 300;
        const barH = 16;

        this.hpGraphics.clear();
        this.hpGraphics.fillStyle(0x1a1a33);
        this.hpGraphics.fillRect(barX, barY, barW, barH);
        const color = pct > 0.6 ? 0x22cc44 : pct > 0.3 ? 0xffcc00 : 0xff3300
        this.hpGraphics.fillStyle(color);
        this.hpGraphics.fillRect(barX, barY, barW * pct, barH);
        this.hpGraphics.lineStyle(1, 0x5566aa);
        this.hpGraphics.strokeRect(barX, barY, barW, barH);
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

    createFireSlash(x, y, angle, duration) {
        let offset = Phaser.Math.DegToRad(angle);
        for (let i = 0; i < 10; i++) {
            let flameX = x + Math.cos(offset) * (i * 120);
            let flameY = y + Math.sin(offset) * (i * 120);
            let flame = this.add.sprite(flameX, flameY, "fire1");
            flame.play("fire-crackle");
            // this.flames.push(flame);

            flame.on('animationcomplete', () => {
                flame.destroy();
            });
        }
    }

    

}
