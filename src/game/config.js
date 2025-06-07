import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import Game from './scenes/Game';
import MainMenu from './scenes/MainMenu';
import Level1 from './scenes/Level1';
import Level2 from './scenes/Level2';
import Level3 from './scenes/Level3';
import Level4 from './scenes/Level4';
import GameOver from './scenes/GameOver';
import UI from './scenes/UI';

export const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#000000',
    scene: [Boot, Preloader, MainMenu, Game, Level1, Level2, Level3, Level4, GameOver, UI],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
}; 