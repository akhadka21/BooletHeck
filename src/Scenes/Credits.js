class Credits extends Phaser.Scene {
    // credits scene with back button
    constructor() {
        super({ key: 'Credits' });
    }

    create() {
        this.add.text(400, 100, 'CREDITS', { 
            fontSize: '48px', 
            fill: '#fff',
            fontFamily: 'monospace' 
        }).setOrigin(0.5);

        this.add.text(400, 300, 'Contributors: Aarohan Khadka\nImages:\n \tBoss sprite - https://goncharov-denis.itch.io/eye-boss-sprite\n \tKenny Assets - https://kenney.nl/assets \nAudio:\n \tAll sfx - https://pixabay.com/sound-effects/\n \tMusic - https://www.youtube.com/watch?v=VIop055eJhU&list=RDVIop055eJhU&start_radio=1', { 
            fontSize: '16px', 
            fill: '#aaa',
            fontFamily: 'monospace' 
        }).setOrigin(0.5);

        let backBtn = this.add.text(400, 500, 'Back to Menu', { 
            fontSize: '24px', 
            fill: '#fff',
            fontFamily: 'monospace' 
        }).setOrigin(0.5).setInteractive();

        backBtn.on('pointerdown', () => {
            this.scene.start('Menu');
        });

        backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ff0' }));
        backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#fff' }));
    }
}