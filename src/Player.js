class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'ships', 'spaceShips_001.png');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setScale(0.45);
        this.body.setSize(42, 32, true);

        this.bullets = scene.physics.add.group();
        this.lastFired = 0
        this.fireRate = 200
    }
    

    getPlayerPos(){
        return {xpos: this.x, ypos: this.y}
    }

    update(cursors, spaceKey, time) {
        if (cursors.left.isDown) {
            this.setVelocityX(-320);
        } else if (cursors.right.isDown) {
            this.setVelocityX(320);
        } else {
            this.setVelocityX(0);
        }

        if (cursors.up.isDown) {
            this.setVelocityY(-320);
        } else if (cursors.down.isDown) {
            this.setVelocityY(320);
        } else {
            this.setVelocityY(0);
        }

        if (spaceKey.isDown && time > this.lastFired + this.fireRate) {
            this._fire(time);
        }
    }

    _fire(time) {
        this.lastFired = time
        const b = this.bullets.create(this.x, this.y - 24, 'ships', 'spaceMissiles_001.png');
        b.setVelocityY(-520);
        b.setScale(0.9);
    }
}
