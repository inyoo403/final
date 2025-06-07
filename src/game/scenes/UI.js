import { Scene } from 'phaser';

export default class UI extends Scene {
    constructor() {
        super({ key: 'UI', active: true });
    }

    create() {
        // UI 요소 생성
        this.livesText = this.add.text(16, 16, 'LIVES: 5', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#ff0000',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);

        this.coinText = this.add.text(16, 48, 'COINS: 0', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);

        this.key1Text = this.add.text(16, 80, 'KEY1: NO', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);

        this.key2Text = this.add.text(16, 112, 'KEY2: NO', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);

        // UI 요소들을 컨테이너에 묶기
        this.uiContainer = this.add.container(0, 0);
        this.uiContainer.add([this.livesText, this.coinText, this.key1Text, this.key2Text]);

        // 레지스트리 이벤트 리스너 설정
        this.registry.events.on('changedata', this.updateData, this);
        
        // 초기 데이터 설정 - 라이프는 이미 설정된 값 사용 또는 기본값 5
        if (!this.registry.has('lives')) {
            this.registry.set('lives', 5);
        }
        if (!this.registry.has('coins')) {
            this.registry.set('coins', 0);
        }
        if (!this.registry.has('hasKey1')) {
            this.registry.set('hasKey1', false);
        }
        if (!this.registry.has('hasKey2')) {
            this.registry.set('hasKey2', false);
        }

        // 현재 레지스트리 값으로 UI 업데이트
        this.updateUIDisplay();
    }

    updateUIDisplay() {
        if (this.livesText) {
            this.livesText.setText(`LIVES: ${this.registry.get('lives')}`);
        }
        if (this.coinText) {
            this.coinText.setText(`COINS: ${this.registry.get('coins')}`);
        }
        if (this.key1Text) {
            this.key1Text.setText(`KEY1: ${this.registry.get('hasKey1') ? 'YES' : 'NO'}`);
        }
        if (this.key2Text) {
            this.key2Text.setText(`KEY2: ${this.registry.get('hasKey2') ? 'YES' : 'NO'}`);
        }
    }

    show() {
        if (this.uiContainer) {
            this.uiContainer.setVisible(true);
        }
    }

    hide() {
        if (this.uiContainer) {
            this.uiContainer.setVisible(false);
        }
    }

    updateData(parent, key, data) {
        // UI가 숨겨져 있거나 텍스트 객체가 존재하지 않으면 업데이트하지 않음
        if (!this.uiContainer || !this.uiContainer.visible || !this.livesText || !this.livesText.active) {
            return;
        }

        switch (key) {
            case 'lives':
                if (this.livesText && this.livesText.active) {
                    this.livesText.setText(`LIVES: ${data}`);
                }
                break;
            case 'coins':
                if (this.coinText && this.coinText.active) {
                    this.coinText.setText(`COINS: ${data}`);
                }
                break;
            case 'hasKey1':
                if (this.key1Text && this.key1Text.active) {
                    this.key1Text.setText(`KEY1: ${data ? 'YES' : 'NO'}`);
                }
                break;
            case 'hasKey2':
                if (this.key2Text && this.key2Text.active) {
                    this.key2Text.setText(`KEY2: ${data ? 'YES' : 'NO'}`);
                }
                break;
        }
    }

    shutdown() {
        this.registry.events.off('changedata', this.updateData, this);
        // 텍스트 객체들을 null로 설정
        this.livesText = null;
        this.coinText = null;
        this.key1Text = null;
        this.key2Text = null;
        this.uiContainer = null;
    }
} 