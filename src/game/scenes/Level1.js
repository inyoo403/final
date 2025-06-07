import BaseScene from './BaseScene';

export default class Level1 extends BaseScene {
    constructor() {
        super({ key: 'Level1' });
        this.isTransitioning = false;
    }

    preload() {
        // 공통 에셋 로드
        this.preloadAssets();
        
        // 레벨 1 타일맵 에셋
        this.load.tilemapTiledJSON('map', 'assets/level1-1.tmj');
        
        // object 아틀라스 로드
        this.load.atlas('object', 'assets/object.png', 'assets/object.json');
    }

    create() {
        // 부모 클래스의 create 메서드를 먼저 호출
        super.create();
        
        this.setupGame('map');
        
        // 디버그 모드 설정
        this.debugGraphics = [];
        
        // D 키를 누를 때 NPC 히트박스 토글 (이벤트 처리 방식 변경)
        const dKey = this.input.keyboard.addKey('D');
        dKey.on('down', () => {
            if (this.debugMode) {
                // 디버그 모드가 켜질 때
                this.npc.body.debugBodyColor = 0x00ff00;
                this.npc.body.debugShowBody = true;
                this.npc.body.debugShowVelocity = true;
                
                // NPC 히트박스 그리기
                const debugGraphics = this.add.graphics();
                debugGraphics.lineStyle(1, 0x00ff00);
                debugGraphics.strokeRect(
                    this.npc.body.x,
                    this.npc.body.y,
                    this.npc.body.width,
                    this.npc.body.height
                );
                this.debugGraphics.push(debugGraphics);
            } else {
                // 디버그 모드가 꺼질 때
                this.npc.body.debugShowBody = false;
                this.npc.body.debugShowVelocity = false;
                this.debugGraphics.forEach(graphics => {
                    if (graphics) {
                        graphics.destroy();
                    }
                });
                this.debugGraphics = [];
            }
        });

        this.setupNPC();
        this.setupEnemies();
        this.setupSprings();
        this.setupBlocks();
        this.setupCollisions();
        this.setupDialogSystem();
        this.createNextLevelPoint();
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }

    shutdown() {
        // 부모 클래스의 shutdown 호출
        super.shutdown();
        
        // Level1 특정 이벤트 리스너 제거
        if (this.eKey) {
            this.eKey.removeAllListeners();
        }
        this.input.keyboard.removeAllListeners('keydown-D');
        
        // 디버그 그래픽 정리
        this.debugGraphics.forEach(graphics => {
            if (graphics) {
                graphics.destroy();
            }
        });
        this.debugGraphics = [];
    }

    setupDialogSystem() {
        // 대화 상태 초기화
        this.isInDialogRange = false;
        this.isDialogActive = false;
        this.currentDialogIndex = 0;
        
        // 대화 내용 설정
        this.dialogs = [
            "Use the arrow keys to move, and press the spacebar to jump.",
            "You can see your lives, coins, and the stage keys in the top-left corner.",
            "Hit blocks to collect coins.",
            "Coins are especially important in the final stage, so try to collect as many as you can.",
            "Hitting item blocks will give you keys to unlock the next stage.",
            "Be careful not to fall off moving platforms.",
            "In the final stage, a special ability will be unlocked, press the F key to find out!"
        ];
        
        // E 키 입력 설정
        this.eKey = this.input.keyboard.addKey('E');
        this.eKey.on('down', () => {
            if (this.isInDialogRange && !this.isDialogActive) {
                // 대화 시작 시 클릭 사운드 재생
                this.sound.play('clickSound', { volume: 0.4 });
                this.startDialog();
            } else if (this.isDialogActive) {
                // 대화 진행 시 클릭 사운드 재생
                this.sound.play('clickSound', { volume: 0.4 });
                this.nextDialog();
            }
        });
            
        // 대화창 생성 (그래픽으로)
        const gameHeight = 600;
        const gameWidth = 800;
        
        // 대화창을 화면 하단에 배치 (하단에서 200px 위)
        this.dialogBox = this.add.container(400, gameHeight - 200).setDepth(100);
        
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x000000, 0.95);
        dialogBg.lineStyle(4, 0xffff00);
        dialogBg.fillRoundedRect(-200, -60, 400, 120, 10);
        dialogBg.strokeRoundedRect(-200, -60, 400, 120, 10);
        
        this.dialogBox.add(dialogBg);
            
        // NPC 초상화 배경 (세로 중앙 정렬)
        const portraitBg = this.add.graphics();
        portraitBg.fillStyle(0x000000, 1);
        portraitBg.fillRoundedRect(-180, -45, 60, 90, 8);
        
        this.dialogBox.add(portraitBg);
            
        // NPC 초상화 (세로 중앙 정렬)
        this.npcPortrait = this.add.sprite(-150, 0, 'npc')
            .setScale(0.18)
            .setOrigin(0.5, 0.5);
            
        this.dialogBox.add(this.npcPortrait);
            
        // 대화 텍스트 (텍스트만 위로 이동)
        this.dialogText = this.add.text(-110, -50, '', {
            fontSize: '15px',
            fontFamily: 'Courier New',
            fill: '#ffffff',
            wordWrap: { width: 270 },
            lineSpacing: 3,
            padding: { top: 6, left: 0 },
            align: 'left',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0);
        
        // 텍스트를 정수 위치로 맞춤 (픽셀 완벽 정렬)
        this.dialogText.x = Math.round(this.dialogText.x);
        this.dialogText.y = Math.round(this.dialogText.y);
        
        this.dialogBox.add(this.dialogText);
        this.dialogBox.setVisible(false);
        
        // UI 요소들을 고정 위치에 표시하기 위해 스크롤 팩터 설정
        this.dialogBox.setScrollFactor(0);
    }
    
    startDialog() {
        this.isDialogActive = true;
        this.currentDialogIndex = 0;
        this.showDialog();
        
        // 대화창 UI 표시
        this.dialogBox.setVisible(true);
    }
    
    nextDialog() {
        this.currentDialogIndex++;
        if (this.currentDialogIndex >= this.dialogs.length) {
            this.endDialog();
        } else {
            this.showDialog();
        }
    }
    
    showDialog() {
        this.dialogText.setText(this.dialogs[this.currentDialogIndex]);
    }
    
    endDialog() {
        this.isDialogActive = false;
        this.dialogBox.setVisible(false);
    }

    setupNPC() {
        // player 레이어에서 spawn 오브젝트의 위치를 찾음
        const playerLayer = this.map.getObjectLayer('player');
        if (!playerLayer || !playerLayer.objects) {
            console.error('Player layer not found in map');
            return;
        }

        const spawnPoint = playerLayer.objects.find(obj => obj.name === 'spawn');
        if (!spawnPoint) {
            console.error('Spawn point not found in player layer');
            return;
        }

        // NPC를 스폰 포인트 근처에 배치
        this.npc = this.physics.add.sprite(spawnPoint.x + 128, spawnPoint.y, 'npc');
        this.npc.setBounce(0);
        this.npc.setCollideWorldBounds(true);
        this.npc.setDepth(2);
        this.npc.setScale(0.25);
        this.npc.flipX = true;
        
        // 히트박스 크기와 오프셋 조정
        const originalWidth = this.npc.width;
        const originalHeight = this.npc.height;
        const scale = 0.25;
        
        // 히트박스 크기 설정 (너비는 그대로, 높이는 약간 줄임)
        const hitboxWidth = originalWidth * scale;
        const hitboxHeight = originalHeight * scale * 0.9;  // 높이를 90%로 설정
        
        this.npc.body.setSize(hitboxWidth, hitboxHeight);
        
        // 히트박스를 하단 중앙에 위치시키기 위한 오프셋 계산
        const offsetX = (originalWidth * (1 - scale)) / 2;
        const offsetY = originalHeight * (1 - scale);  // 바닥에 맞춤
        
        this.npc.body.setOffset(offsetX, offsetY);
        
        // NPC와 지형 충돌 설정
        this.physics.add.collider(this.npc, this.groundLayer);
        
        // E 키 프롬프트를 NPC 머리 위에 생성
        this.ePrompt = this.add.container(this.npc.x, this.npc.y - 20);
        this.ePrompt.setScale(0.5);
        
        // E 키 텍스트 (배경 없이)
        const eKeyText = this.add.text(0, 0, 'E to talk', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { blur: 0, stroke: true, fill: true }
        }).setOrigin(0.5);
        
        this.ePrompt.add(eKeyText);
        this.ePrompt.setDepth(100);
        
        // NPC 업데이트 함수 추가
        this.events.on('update', () => {
            // E 키 프롬프트 위치 업데이트
            this.ePrompt.setPosition(this.npc.x, this.npc.y - 20);
        });
        
        // NPC와 플레이어 상호작용 설정
        this.physics.add.overlap(this.player, this.npc, this.handleNPCInteraction, null, this);
    }

    handleNPCInteraction(player, npc) {
        if (!this.isInDialogRange) {
            this.isInDialogRange = true;
        }
    }

    setupEnemies() {
        this.enemies = this.physics.add.group({
            bounceX: 0,
            bounceY: 0
        });
        
        const enemyLayer = this.map.getObjectLayer('enemyspawn');
        if (enemyLayer && enemyLayer.objects) {
            enemyLayer.objects.forEach(enemyObj => {
                const enemy = this.enemies.create(enemyObj.x, enemyObj.y - enemyObj.height, 'enemy', '0320.png');
                enemy.setBounce(0);
                enemy.setCollideWorldBounds(true);
                enemy.moveDirection = -1;
                enemy.setVelocityX(50 * enemy.moveDirection);
                enemy.isAlive = true;
                enemy.setScale(1);
                enemy.body.setSize(14, 14);
                enemy.body.setDragX(0);
            });
        }

        // 적 애니메이션 생성
        if (!this.anims.exists('enemy-walk')) {
            this.anims.create({
                key: 'enemy-walk',
                frames: [
                    { key: 'enemy', frame: '0320.png' }
                ],
                frameRate: 8,
                repeat: -1
            });
        }

        // 적과 지형 충돌
        this.physics.add.collider(this.enemies, this.groundLayer, this.handleEnemyCollision, null, this);
        this.physics.add.collider(this.enemies, this.landLayer, this.handleEnemyCollision, null, this);
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
    }

    setupSprings() {
        this.springs = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        // 스프링 애니메이션 생성
        if (!this.anims.exists('spring-compress')) {
            this.anims.create({
                key: 'spring-compress',
                frames: [
                    { key: 'object', frame: '0268.png' },
                    { key: 'object', frame: '0267.png' },
                    { key: 'object', frame: '0266.png' }
                ],
                frameRate: 20,
                repeat: 0
            });
        }

        if (!this.anims.exists('spring-release')) {
            this.anims.create({
                key: 'spring-release',
                frames: [
                    { key: 'object', frame: '0266.png' },
                    { key: 'object', frame: '0267.png' },
                    { key: 'object', frame: '0268.png' }
                ],
                frameRate: 20,
                repeat: 0
            });
        }

        const springLayer = this.map.getObjectLayer('springspawn');
        if (springLayer && springLayer.objects) {
            springLayer.objects.forEach(springObj => {
                const spring = this.springs.create(springObj.x + 8, springObj.y + 8, 'object', '0268.png');
                spring.setSize(16, 8);
                spring.setOffset(0, 8);
                spring.isCompressed = false;
                spring.body.allowGravity = false;
                spring.setImmovable(true);
            });
        }
    }

    setupBlocks() {
        this.blocks = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        this.itemBlocks = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        const blockLayer = this.map.getObjectLayer('blockspawn');
        if (blockLayer && blockLayer.objects) {
            blockLayer.objects.forEach(blockObj => {
                let block;
                const x = blockObj.x;
                const y = blockObj.y;

                if (blockObj.name === 'blcok') {
                    block = this.blocks.create(x, y, 'block', '0742.png');
                    block.isHit = false;
                } else if (blockObj.name === 'itemblock') {
                    block = this.itemBlocks.create(x, y, 'block', '0072.png');
                    block.isHit = false;
                }
                
                if (block) {
                    block.setOrigin(0, 0);
                    block.setSize(12, 16);
                    block.setOffset(2, 0);
                    block.setDepth(10); // 플레이어(20)보다 낮고 NPC(2)보다 높은 depth로 설정
                    block.body.checkCollision.up = true;
                    block.body.checkCollision.down = true;
                    block.body.checkCollision.left = true;
                    block.body.checkCollision.right = true;
                }
            });
        }
    }

    setupCollisions() {
        this.physics.add.collider(this.enemies, this.groundLayer, this.handleEnemyCollision, null, this);
        this.physics.add.collider(this.enemies, this.landLayer, this.handleEnemyCollision, null, this);
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
        this.physics.add.collider(this.player, this.springs, this.handleSpringCollision, null, this);
        this.physics.add.collider(this.player, this.blocks, this.handleBlockCollision, null, this);
        this.physics.add.collider(this.player, this.itemBlocks, this.handleItemBlockCollision, null, this);
        this.physics.add.collider(this.coins, this.groundLayer);
        this.physics.add.collider(this.coins, this.landLayer);
        this.physics.add.collider(this.coins, this.blocks);
        this.physics.add.collider(this.coins, this.itemBlocks);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    }

    handleEnemyCollision(enemy, tile) {
        if (!enemy.isAlive) return;

        if (enemy.body.blocked.left || enemy.body.touching.left) {
            enemy.moveDirection = 1;
            enemy.setVelocityX(50);
            enemy.flipX = false;
        } else if (enemy.body.blocked.right || enemy.body.touching.right) {
            enemy.moveDirection = -1;
            enemy.setVelocityX(-50);
            enemy.flipX = true;
        }

        if (enemy.body.blocked.down) {
            const tileAhead = this.getTileAhead(enemy);
            if (!tileAhead) {
                enemy.moveDirection *= -1;
                enemy.setVelocityX(50 * enemy.moveDirection);
                enemy.flipX = enemy.moveDirection < 0;
            }
        }
    }

    getTileAhead(enemy) {
        const tileSize = 16;
        const lookAheadDistance = enemy.moveDirection > 0 ? tileSize : -tileSize;
        const x = enemy.x + lookAheadDistance;
        const y = enemy.y + enemy.height + 2;

        return this.groundLayer.getTileAtWorldXY(x, y) || this.landLayer.getTileAtWorldXY(x, y);
    }

    handlePlayerEnemyCollision(player, enemy) {
        if (!enemy.isAlive || !this.playerAlive) return;

        const playerBottom = player.body.bottom;
        const enemyTop = enemy.body.top;
        
        if (playerBottom <= enemyTop + 10) {
            // 적을 밟았을 때 사운드 재생
            this.sound.play('enemySound', { volume: 0.4 });
            
            enemy.isAlive = false;
            enemy.body.enable = false;
            enemy.setTint(0xff0000);
            enemy.setFlipY(true);
            player.setVelocityY(-200);
            
            this.time.delayedCall(1000, () => {
                enemy.destroy();
            });
        } else if (!this.debugMode) {
            this.handlePlayerDeath();
        }
    }

    handleSpringCollision(player, spring) {
        const playerBottom = player.body.bottom;
        const springTop = spring.body.top;
        const overlap = springTop - playerBottom;
        
        if (Math.abs(overlap) < 20 && (player.body.velocity.y >= 0)) {
            if (!spring.isCompressed) {
                spring.isCompressed = true;
                spring.anims.play('spring-compress');
                
                this.time.delayedCall(50, () => {
                    player.setVelocityY(-500);
                    spring.anims.play('spring-release');
                    spring.once('animationcomplete', () => {
                        spring.isCompressed = false;
                    });
                });
            }
        }
    }

    handleBlockCollision(player, block) {
        if (player.body.touching.up && !block.isHit) {
            block.isHit = true;
            
            // 블록 타격 사운드 재생
            this.sound.play('blockSound', { volume: 0.3 });
            
            block.setTexture('block', '0742.png').setTint(0x999999).setOrigin(0, 0);
            
            const originalY = block.y;
            this.tweens.add({
                targets: block,
                y: originalY - 2,
                duration: 50,
                yoyo: true,
                ease: 'Power1',
                onComplete: () => {
                    block.y = originalY;
                    block.setOrigin(0, 0);

                    // 코인 생성
                    const coin = this.coins.create(block.x + 8, block.y, 'object', '0218.png');
                    coin.setBounceY(0.2);
                    coin.setVelocityY(-200);
                    coin.setGravityY(400);
                    coin.setCollideWorldBounds(true);
                    coin.body.setSize(8, 8);
                    coin.setOffset(4, 4);
                }
            });
        }
    }

    handleItemBlockCollision(player, block) {
        if (player.body.touching.up && !block.isHit) {
            block.isHit = true;
            
            // 블록 타격 사운드 재생
            this.sound.play('blockSound', { volume: 0.3 });
            
            block.setTexture('block', '0023.png').setOrigin(0, 0);
            
            const key1 = this.physics.add.sprite(block.x + 8, block.y, 'object', '0219.png');
            key1.setBounceY(0.2);
            key1.setVelocityY(-200);
            key1.setGravityY(400);
            key1.setCollideWorldBounds(true);
            key1.body.setSize(8, 8);
            key1.setOffset(4, 4);
            
            // 키와 지형 충돌
            this.physics.add.collider(key1, this.groundLayer);
            this.physics.add.collider(key1, this.landLayer);
            this.physics.add.collider(key1, this.blocks);
            this.physics.add.collider(key1, this.itemBlocks);
            
            // 키 수집
            this.physics.add.overlap(this.player, key1, this.collectKey, null, this);
            
            const originalY = block.y;
            this.tweens.add({
                targets: block,
                y: originalY - 2,
                duration: 50,
                yoyo: true,
                ease: 'Power1',
                onComplete: () => {
                    block.y = originalY;
                    block.setOrigin(0, 0);
                }
            });
        }
    }

    collectKey(player, key1) {
        key1.destroy();
        // key1 획득 상태를 true로 설정
        this.registry.set('hasKey1', true);
    }

    createNextLevelPoint() {
        const nextLevelLayer = this.map.getObjectLayer('nextlevel');
        if (!nextLevelLayer) return;

        this.nextLevelPoints = this.physics.add.group();

        nextLevelLayer.objects.forEach(point => {
            const nextLevel = this.nextLevelPoints.create(point.x + point.width/2, point.y + point.height/2, 'nextlevel');
            nextLevel.name = point.name;
            nextLevel.setSize(point.width, point.height);
            nextLevel.body.allowGravity = false;
            nextLevel.setVisible(false);
        });

        // 다음 레벨 포인트와의 충돌 처리
        this.physics.add.overlap(this.player, this.nextLevelPoints, this.handleNextLevel, null, this);
    }

    update() {
        if (this.isTransitioning) {
            // 플레이어를 천천히 아래로 이동
            this.player.y += 0.1;
            return;
        }

        super.update();
        
        // 적 업데이트
        this.enemies.children.iterate((enemy) => {
            if (enemy && enemy.isAlive) {
                if (enemy.body.blocked.down) {
                    enemy.setVelocityX(50 * enemy.moveDirection);
                }
            }
        });

        // 맵 끝에 도달했고 키를 가지고 있는지 체크
        if (this.player.x > this.map.widthInPixels - 32 && this.registry.get('hasKey')) {
            this.scene.start('Level2');
        }

        // 맵 밖으로 떨어졌는지 체크
        if (this.player.y > this.map.heightInPixels) {
            this.handlePlayerDeath();
        }

        if (this.player) {
            // 플레이어 움직임 업데이트
            this.handlePlayerMovement();
            
            // NPC 상호작용 범위 체크
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.npc.x,
                this.npc.y
            );
            
            if (distance > 50) { // 상호작용 범위를 벗어났을 때
                if (this.isInDialogRange) {
                    this.isInDialogRange = false;
                }
            }

            // 다음 레벨 전환 체크
            if (this.nextLevelX && this.registry.get('hasKey') && 
                this.player.x >= this.nextLevelX && 
                Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
                this.startLevelTransition();
            }
        }
    }

    startLevelTransition() {
        this.isTransitioning = true;
        
        // 플레이어를 가장 뒤로 보내기
        this.player.setDepth(-1);
        
        // 플레이어 콜리전 비활성화
        this.player.body.enable = false;
        
        // 플레이어의 물리 속성 조정
        this.player.setVelocityX(0);
        this.player.setAccelerationX(0);
        this.player.setGravityY(50); // 천천히 떨어지도록 중력 조정
        
        // 1초 후에 다음 레벨로 전환
        this.time.delayedCall(1000, () => {
            this.scene.start('Level2');
        });
    }

    handleNextLevel(player, point) {
        const hasKey1 = this.registry.get('hasKey1');
        if (point.name === '1-2' && hasKey1 && this.cursors.down.isDown) {
            if (!this.isTransitioning) {
                this.isTransitioning = true;
                this.startLevelTransition();
                
                // 1초 후에 Level2로 전환
                this.time.delayedCall(1000, () => {
                    this.scene.start('Level2');
                });
            }
        }
    }
} 