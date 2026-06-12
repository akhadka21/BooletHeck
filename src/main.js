const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#050510',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: [BossBattle]
}

new Phaser.Game(config)
