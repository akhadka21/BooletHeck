class Victory extends Phaser.Scene {
    // victory scene with replay and credits buttons
    constructor() {
        super({ key: 'Victory' });
    }

    create() {
        this.add.text(400, 200, 'VICTORY', { 
            fontSize: '64px', 
            fill: '#0f0',
            fontFamily: 'monospace' 
        }).setOrigin(0.5);

        let replayBtn = this.add.text(400, 350, 'Replay', { 
            fontSize: '32px', 
            fill: '#fff',
            fontFamily: 'monospace' 
        }).setOrigin(0.5).setInteractive();

        replayBtn.on('pointerdown', () => {
            this.scene.stop('BossBattle');
            this.scene.start('BossBattle');
        });

        let creditsBtn = this.add.text(400, 450, 'Credits', { 
            fontSize: '32px', 
            fill: '#fff',
            fontFamily: 'monospace' 
        }).setOrigin(0.5).setInteractive();

        creditsBtn.on('pointerdown', () => {
            this.scene.start('Credits');
        });

        // hover effects
        [replayBtn, creditsBtn].forEach(btn => {
            btn.on('pointerover', () => btn.setStyle({ fill: '#ff0' }));
            btn.on('pointerout', () => btn.setStyle({ fill: '#fff' }));
        });
    }
}
