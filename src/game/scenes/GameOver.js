import { Scene } from 'phaser';
import BaseScene from './BaseScene';

export default class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
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
        // 배경을 완전한 검은색으로 설정
        this.cameras.main.setBackgroundColor(0x000000);

        // GAME OVER 텍스트
        const gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'GAME OVER', {
            fontFamily: 'Arial Black', 
            fontSize: 64, 
            color: '#ff0000',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        gameOverText.alpha = 0;

        // 재시작 안내 텍스트
        const spaceText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Press SPACE to Return to Menu', {
            fontFamily: 'Arial Black', 
            fontSize: 32, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        spaceText.alpha = 0;

        // 마우스 클릭 안내
        const clickText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 100, 'or Click to Return to Menu', {
            fontFamily: 'Arial Black', 
            fontSize: 24, 
            color: '#cccccc',
            stroke: '#000000', 
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        clickText.alpha = 0;

        // 텍스트들이 순차적으로 나타나는 효과 (오버레이 없이)
        this.tweens.add({
            targets: gameOverText,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // 두 번째 텍스트 나타나기
                this.tweens.add({
                    targets: spaceText,
                    alpha: 1,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        // 세 번째 텍스트 나타나기
                        this.tweens.add({
                            targets: clickText,
                            alpha: 1,
                            duration: 800,
                            ease: 'Power2'
                        });
                    }
                });
            }
        });

        // 스페이스 키 입력 처리
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.returnToMenu();
        });

        // 마우스 클릭 처리
        this.input.once('pointerdown', () => {
            this.returnToMenu();
        });
    }

    returnToMenu() {
        // 게임 상태 완전 초기화
        BaseScene.initializeGameState(this.registry);
        
        // UI 씬이 있으면 강제로 업데이트
        const uiScene = this.scene.get('UI');
        if (uiScene && uiScene.updateUIDisplay) {
            uiScene.updateUIDisplay();
        }
        
        // MainMenu로 이동
        this.scene.start('MainMenu');
    }
}
