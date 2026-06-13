// config for the whole game
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#050510',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    // menu is first to make it the starting scene
    scene: [Menu, BossBattle, Victory, GameOver, Credits]
}

// start the phaser game
new Phaser.Game(config);
