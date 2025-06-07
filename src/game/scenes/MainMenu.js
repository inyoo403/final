import { Scene } from 'phaser';
import BaseScene from './BaseScene';

export default class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    init() {
        // UI 숨기기
        const uiScene = this.scene.get('UI');
        if (uiScene && uiScene.hide) {
            uiScene.hide();
        }
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x0000ff);

        this.add.image(512, 384, 'background').setAlpha(0.5);

        this.add.text(512, 384, 'Click to Start', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            // 게임 상태 초기화 (새 게임 시작)
            BaseScene.initializeGameState(this.registry);
            
            // UI 씬 재시작
            const uiScene = this.scene.get('UI');
            if (uiScene) {
                this.scene.stop('UI');
                this.scene.launch('UI');
            }
            
            this.scene.start('Level1');
        });
    }
}
