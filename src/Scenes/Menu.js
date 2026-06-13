class Menu extends Phaser.Scene {
    // main menu scene with start button
    constructor() {
        super({ key: 'Menu' });
    }

    create() {
        this.add.text(400, 200, 'BOOLET HECK', { 
            fontSize: '64px', 
            fill: '#fff',
            fontFamily: 'monospace' 
        }).setOrigin(0.5);

        let startBtn = this.add.text(400, 400, 'Press to Start', { 
            fontSize: '32px', 
            fill: '#fff',
            fontFamily: 'monospace' 
        }).setOrigin(0.5).setInteractive();

        startBtn.on('pointerdown', () => {
            this.scene.start('BossBattle');
        });

        // visual feedback for button
        startBtn.on('pointerover', () => startBtn.setStyle({ fill: '#ff0' }));
        startBtn.on('pointerout', () => startBtn.setStyle({ fill: '#fff' }));
    }
}