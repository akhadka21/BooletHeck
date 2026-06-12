class BossBattle extends Phaser.Scene {
    constructor() {
        super({ key: 'BossBattle' })
    }

    preload() {
        this.load.atlasXML('robot', 'assets/character_robot_sheet.png', 'assets/character_robot_sheet.xml')
        this.load.atlasXML('ships', 'assets/spaceShooter2_spritesheet.png', 'assets/spaceShooter2_spritesheet.xml')
    }

    create() {
        // Star field
        for (let i = 0; i < 90; i++) {
            const x = Phaser.Math.Between(0, 800)
            const y = Phaser.Math.Between(0, 600)
            const sz = Phaser.Math.Between(1, 3)
            this.add.rectangle(x, y, sz, sz, 0xffffff).setAlpha(Phaser.Math.FloatBetween(0.2, 0.8))
        }

        this._createAnimations();

        this.player = new Player(this, 400, 530);
        this.boss = new Boss(this, 400, 80);

        this.cursors = this.input.keyboard.createCursorKeys()
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

        this.physics.add.overlap(this.player.bullets, this.boss, (boss, bullet) => {
            bullet.destroy();
            boss.takeDamage(10);
        })

        this.physics.add.overlap(this.boss.bullets, this.player, (player, bullet) => {
            bullet.destroy();
        })

        // HUD
        this.hpGraphics = this.add.graphics().setDepth(10)
        this.add.text(10, 8, 'BOSS HP', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace'
        }).setDepth(10);
        this.stateLabel = this.add.text(790, 10, 'STATE: amused', {
            fontSize: '14px', color: '#ffee00', fontFamily: 'monospace'
        }).setOrigin(1, 0).setDepth(10);
        this.add.rectangle(400, 46, 800, 1, 0x334466).setDepth(10);
    }

    _createAnimations() {
        this.anims.create({
            key: 'robot-walk',
            frames: [
                { key: 'robot', frame: 'walk0' },
                { key: 'robot', frame: 'walk1' },
                { key: 'robot', frame: 'walk2' },
                { key: 'robot', frame: 'walk3' },
                { key: 'robot', frame: 'walk4' },
                { key: 'robot', frame: 'walk5' },
                { key: 'robot', frame: 'walk6' },
                { key: 'robot', frame: 'walk7' },
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'robot-idle',
            frames: [{ key: 'robot', frame: 'idle' }],
            frameRate: 1,
            repeat: -1
        });
    }

    update(time, delta) {
        this.player.update(this.cursors, this.spaceKey, time);
        this.boss.update(time, delta);
        this._updateHPBar();
        this._cullBullets();
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
            if (b.y < -60 || b.y > 660 || b.x < -60 || b.x > 860) b.destroy()
        }
        for (const b of [...this.boss.bullets.getChildren()]) {
            if (b.y < -60 || b.y > 660 || b.x < -60 || b.x > 860) b.destroy()
        }
    }

    updateStateLabel(name) {
        if (this.stateLabel) this.stateLabel.setText('STATE: ' + name)
    }
}
