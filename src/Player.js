class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'ship1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setScale(0.75);
        this.body.setAllowGravity(false);
        this.setDepth(90)

        
        this.maxHP = 100
        this.hp = this.maxHP
        this.bullets = scene.physics.add.group();
        this.lastFired = 0;
        this.fireRate = 300;

        this.doubleShot = false;
        this.speedBoost = false;

        this.invuln = false;
        this.lastInvuln = 0;
        this.invulnCd = 10000;

                     
        this.keyW = this.scene.input.keyboard.addKey('W');  
        this.keyA = this.scene.input.keyboard.addKey('A');
        this.keyS = this.scene.input.keyboard.addKey('S');
        this.keyD = this.scene.input.keyboard.addKey('D');

        this.shiftKey = this.scene.input.keyboard.addKey('SHIFT');
   

    }
    
    create(){
        
    }

    getPlayerPos(){
        return {xpos: this.x, ypos: this.y}
    }

    update(cursors, spaceKey, time) {


        let speed = this.speedBoost ? 640 : 320;

        if (this.keyA.isDown) {
            this.setVelocityX(-speed);
        } else if (this.keyD.isDown) {
            this.setVelocityX(speed);
        } else {
            this.setVelocityX(0);
        }

        if (this.keyW.isDown) {
            this.setVelocityY(-speed);
        } else if (this.keyS.isDown) {
            this.setVelocityY(speed);
        } else {
            this.setVelocityY(0);
        }

        if (spaceKey.isDown && time > this.lastFired + this.fireRate) {
            this._fire(time);
        }

        if (spaceKey.isDown && time > this.lastFired + this.fireRate) {
            this._fire(time);
        }

        if (this.shiftKey.isDown && time > this.lastInvuln + this.invulnCd) {
            this.setInvin(time);
        }



    }

    _fire(time) {
        this.lastFired = time
        
        if (this.doubleShot){
            const a = this.bullets.create(this.x - 5, this.y - 24, 'ships', 'spaceMissiles_001.png');
            a.setVelocityY(-520);
            a.setScale(0.4);

            const b = this.bullets.create(this.x + 5, this.y - 24, 'ships', 'spaceMissiles_001.png');
            b.setVelocityY(-520);
            b.setScale(0.4);
        } else {
            const b = this.bullets.create(this.x, this.y - 24, 'ships', 'spaceMissiles_001.png');
            b.setVelocityY(-520);
            b.setScale(0.4);
        }
    }

    takeDamageP(amount){
        if (!this.invuln){
            this._flashHurt();
            this.hp -= amount;
        }
    }

    setInvin(time){
        this.lastInvuln = time
        this.invuln = true;
        this.setTint(0x34e5eb);
        this.scene.time.delayedCall(700, () => {
            this.invuln = false;
            if (this.active) this.clearTint();
        });
    }

    _flashHurt() {
        this.setTint(0xff3333);
        this.scene.time.delayedCall(160, () => {
            if (this.active) this.clearTint();
        });
    }
}   
