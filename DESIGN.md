# State Machine Boss Battle Demo

*Purpose:* This project is a demonstration of how to use state machines to control the behavior of a boss non-player character as it changes over time during a boss battle. The audience for this demo is university level students in an introductory game programming course.

*Technology:* Phaser 3.90 game framework, using the JavaScript programming language. The game will be started by executing the Live Server plugin for Visual Studio code on the index.html file. No node or vite. Phaser 3.90 will be loaded via CDN. The state machine will use the StateMachine class found in ./lib/NadionStateMachine.js

*Screen Layout:* The Boss will have an initial position at the top of the screen. The player will have their initial position at the bottom of the screen.

*Boss Behavior:* The Boss has three main states, and a bezerk mode. 

State 1, "Amused": In Amused mode, the Boss fires bullets downwards at a slow rate, and moves back and forth along the x-axis. It does not react strongly to taking damage. When the player has removed 1/3 of the total hit points of the boss, transition to Irritated.

State 2: "Irritated": In Irritated mode, the Boss fires bullets downwards at a faster rate, and moves more quickly and erratically back and forth along the x-axis.  When the player has removed 2/3 of the total hit points of the boss, transition to Grrr.

State 3: "Grrr": In Grrr mode, the Boss moves in a looping figure 8 pattern back and forth to avoid the player. It fires shmup-like bullet patterns towards the player. When the player has removed all hit points for the boss, transition to Death Mode.

State 4: Bezerk mode: In all states, there when the boss takes damage, there is a chance it will enter "Bezerk" mode. In Berzerk mode, the boss will quickly move in a loop and will emit copious shmup-like bullet sprays. Bezerk mode will last only 3 seconds, and will then return to the previous mode.

State 5: Death mode: In Death Mode, the boss emits a large number of particles before disappearing. Once it has disappeared, wait 5 seconds, then re-start with a new boss in Amuzed Mode.

*Code Structure:* Please create a separate class for the Boss, which should be a subclass of an Arcade Physics sprite.

The Boss class should have separate functions that define the movement behaviors of the different states:

Movement Functions: 
1: Move back and forth along x-axis, used by Amused Mode
2: Move erratically and quickly along x-axis, used by Irritated Mode
3: Move in looping figure 8, used by Grrr mode.
4: Move quickly in a loop, used by Bezerk mode.

The Boss class should have separate functions that define the attack behavior:

Attack Functions:
1: Firing downwards slowly, used by Amused Mode
2: Firing downwards quickly, used by Irritated Mode
3: Shmup-like bullet sprays, used by Grrr Mode
4: Shmup-like bullet spray, used by Bezerk Mode

Note that attack functions 1 and 2 might make use of the same (fire downwards) utility function, and functions 3 and 4 might make use of the same shmup bullet pattern utility function.

The StateMachine class takes as input an object that defines all of the states and the events that cause transitions. Please add to this object the movement function and attack function to be used in each state. The goal here is to demonstrate changing behavior via composition (Strategy pattern) and also to demonstrate the utility of having boss behavior defined in a data-driven way.

*Art Assets:* The Boss should use assets from the character_robot_sheet and the Player should use assets from spaceShooter2_spritesheet. Please select bullets from spaceShooter2_spritesheet.

Since this is a demo, no need for sound effects.

*Movement:* The player should move back and forth along the x-axis using the arrow keys. Space should fire. The player should be able to have multiple active bullets on screen at the same time.
