import { Scene } from 'phaser';
import { Game as PhaserGame } from 'phaser';
import Boot from './Boot';
import Preloader from './Preloader';
import MainMenu from './MainMenu';
import Level1 from './Level1';
import Level2 from './Level2';
import Level3 from './Level3';
import Level4 from './Level4';
import GameOver from './GameOver';
import UI from './UI';

export default class Game extends Scene {
    constructor() {
        super('Game');
    }

    create() {
        // UI 씬 시작
        this.scene.launch('UI');

        this.cameras.main.setBackgroundColor(0x00ff00);

        this.add.image(512, 384, 'background').setAlpha(0.5);

        this.add.text(512, 384, 'Make something fun!\nand share it with us:\nsupport@phaser.io', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('GameOver');
        });
    }
}
