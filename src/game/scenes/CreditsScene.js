export default class CreditsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CreditsScene' });
        this.scrollSpeed = 50; // 스크롤 속도
        this.creditTexts = [];
    }

    preload() {
        // 배경 이미지가 있다면 로드 (선택사항)
        // this.load.image('starsBg', 'assets/stars_bg.png');
    }

    create() {
        // UI 씬 숨기기
        this.scene.stop('UIScene');
        
        // 배경 설정 (검정색 또는 우주 배경)
        this.cameras.main.setBackgroundColor('#000000');
        
        // 별 배경 효과 (선택사항)
        this.createStarField();

        // 크레딧 텍스트 데이터
        const creditData = [
            '',
            '',
            '',
            'GAME COMPLETE',
            '',
            '',
            '게임 제작',
            '',
            '개발자: [당신의 이름]',
            '이메일: [your.email@example.com]',
            '',
            '',
            '음악 및 사운드',
            '',
            'coin.wav - 코인 수집 사운드',
            'block.ogg - 블록/걷기 사운드', 
            'jump.ogg - 점프 사운드',
            'click.ogg - UI 클릭 사운드',
            'enemy.ogg - 적 처치 사운드',
            'death.ogg - 플레이어 사망 사운드',
            'bossdeath.ogg - 보스 사망 사운드',
            'fireball.wav - 파이어볼 사운드',
            'bosswalk.ogg - 보스 걸음 사운드',
            'impact.wav - 충격 사운드',
            '',
            '',
            '아트 에셋',
            '',
            'Player Sprite - [에셋 출처]',
            'Boss Sprite - [에셋 출처]',
            'Environment Tiles - [에셋 출처]',
            'UI Elements - [에셋 출처]',
            'VFX Sprites - [에셋 출처]',
            '',
            '',
            '특별 감사',
            '',
            'Phaser.js 프레임워크',
            'Tiled Map Editor',
            '[기타 도구나 라이브러리]',
            '',
            '',
            '엔진',
            '',
            'Phaser 3.70.0',
            'JavaScript ES6+',
            '',
            '',
            '',
            '게임을 플레이해 주셔서',
            '감사합니다!',
            '',
            '',
            '클릭하여 메인메뉴로 돌아가기',
            '',
            '',
            '',
            ''
        ];

        // 크레딧 텍스트 생성
        this.createCreditTexts(creditData);

        // 입력 처리
        this.input.on('pointerdown', () => {
            this.goToMainMenu();
        });

        // 키보드 입력 처리
        this.input.keyboard.on('keydown', () => {
            this.goToMainMenu();
        });

        // ESC 키 특별 처리
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => {
            this.goToMainMenu();
        });
    }

    createStarField() {
        // 간단한 별 배경 효과
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height),
                Phaser.Math.Between(1, 3),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 1.0)
            );
            star.setDepth(-1);
        }
    }

    createCreditTexts(creditData) {
        const startY = this.cameras.main.height + 50;
        const lineHeight = 40;
        
        // 기존 크레딧 텍스트 제거
        this.creditTexts.forEach(text => text.destroy());
        this.creditTexts = [];
        
        creditData.forEach((text, index) => {
            let fontSize = '24px';
            let color = '#ffffff';
            let fontStyle = 'normal';

            // 제목 스타일
            if (text === 'GAME COMPLETE') {
                fontSize = '48px';
                color = '#ffff00';
                fontStyle = 'bold';
            } else if (text.includes('게임 제작') || text.includes('음악 및 사운드') || 
                      text.includes('아트 에셋') || text.includes('특별 감사') || 
                      text.includes('엔진')) {
                fontSize = '32px';
                color = '#00ffff';
                fontStyle = 'bold';
            } else if (text.includes('감사합니다!') || text.includes('클릭하여 메인메뉴로')) {
                fontSize = '28px';
                color = '#ffff00';
            }

            const textObj = this.add.text(
                this.cameras.main.centerX,
                startY + (index * lineHeight),
                text,
                {
                    fontSize: fontSize,
                    fontFamily: 'Arial, sans-serif',
                    color: color,
                    fontStyle: fontStyle,
                    align: 'center',
                    wordWrap: { width: this.cameras.main.width - 100 }
                }
            ).setOrigin(0.5);

            // 깜빡이는 효과 (마지막 안내 텍스트)
            if (text.includes('클릭하여 메인메뉴로')) {
                this.tweens.add({
                    targets: textObj,
                    alpha: 0.3,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1
                });
            }

            this.creditTexts.push(textObj);
        });
    }

    update(time, delta) {
        // 모든 크레딧 텍스트를 위로 스크롤 (delta를 사용하여 프레임 독립적인 움직임)
        this.creditTexts.forEach(text => {
            text.y -= (this.scrollSpeed * delta) / 1000;
        });

        // 모든 텍스트가 화면 위로 사라지면 자동으로 메인메뉴로
        const allTextsAboveScreen = this.creditTexts.every(text => 
            text.y < -100
        );

        if (allTextsAboveScreen) {
            this.time.delayedCall(2000, () => {
                this.goToMainMenu();
            });
        }
    }

    goToMainMenu() {
        // 트위닝 정리
        this.tweens.killAll();
        
        // 페이드 아웃 효과
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainMenuScene');
        });
    }
} 