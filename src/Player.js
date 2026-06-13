class Player extends Phaser.Physics.Arcade.Sprite {
    // player constructor setup keys and stats
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
        this.fireRate = 450;

        this.doubleShot = false;
        this.speedBoost = false;

        this.invuln = false;
        this.lastInvuln = 0;
        this.invulnCd = 10000;
        
        this.colorState = 'neutral';
        this.colorStates = ['neutral', 'cyan', 'magenta', 'yellow', 'green'];
        this.stateIndex = 0;
                     
        this.keyW = this.scene.input.keyboard.addKey('W');  
        this.keyA = this.scene.input.keyboard.addKey('A');
        this.keyS = this.scene.input.keyboard.addKey('S');
        this.keyD = this.scene.input.keyboard.addKey('D');

        this.shiftKey = this.scene.input.keyboard.addKey('SHIFT');
        this.eKey = this.scene.input.keyboard.addKey('E');

    }
    
    create(){
        
    }

    // helper to get position
    getPlayerPos(){
        return {xpos: this.x, ypos: this.y}
    }

    // main update for movement and shooting
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

        // update ship look based on hp
        let shipNum = 1;
        if (this.hp <= 25) shipNum = 4;
        else if (this.hp <= 50) shipNum = 3;
        else if (this.hp <= 75) shipNum = 2;
        
        if (this.texture && this.texture.key !== `ship${shipNum}`) {
            this.setTexture(`ship${shipNum}`);
        }

        let effectiveFireRate = this.colorState === 'neutral' ? this.fireRate : this.fireRate * 2;

        if (spaceKey.isDown && time > this.lastFired + effectiveFireRate) {
            this._fire(time);
        }

        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.colorState = 'neutral';
            this.stateIndex = 0;
            this._updateStateVisuals();
        }

        if (Phaser.Input.Keyboard.JustDown(cursors.left)) {
            this.colorState = 'cyan';
            this.stateIndex = 1;
            this._updateStateVisuals();
        } else if (Phaser.Input.Keyboard.JustDown(cursors.right)) {
            this.colorState = 'magenta';
            this.stateIndex = 2;
            this._updateStateVisuals();
        } else if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.colorState = 'yellow';
            this.stateIndex = 3;
            this._updateStateVisuals();
        } else if (Phaser.Input.Keyboard.JustDown(cursors.down)) {
            this.colorState = 'green';
            this.stateIndex = 4;
            this._updateStateVisuals();
        }

        if (this.shiftKey.isDown && this.colorState === 'neutral' && time > this.lastInvuln + this.invulnCd) {
            this.setInvin(time);
        }



    }

    // fire bullets based on powerups
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

    // take damage from hazards
    takeDamageP(amount){
        if (!this.invuln){
            this._flashHurt();
            this.hp -= amount;
            this.scene.cameras.main.shake(100, amount * 0.001);
        }
    }

    // set invulnerability state
    setInvin(time){
        this.lastInvuln = time
        this.invuln = true;
        const originalTint = this.isTinted ? this.tintTopLeft : 0xffffff;
        this.setTint(0x34e5eb); 
        this.scene.time.delayedCall(700, () => {
            this.invuln = false;
            if (this.active) this._updateStateVisuals();
        });
    }

    // update tint based on color state
    _updateStateVisuals() {
        const colors = {
            neutral: 0xffffff,
            cyan: 0x00ffff,
            magenta: 0xff00ff,
            yellow: 0xffee00,
            green: 0x32a852
        };
        this.setTint(colors[this.colorState]);
    }

    // flash red when hurt
    _flashHurt() {
        if (this.invuln) return;
        this.setTint(0xff3333);
        this.scene.time.delayedCall(160, () => {
            if (this.active) this._updateStateVisuals();
        });
    }
}   
