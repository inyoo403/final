export default class BaseScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.debugMode = false;
        this.debugGraphics = [];
        this.isJumping = false;
        this.isDying = false;
        this.playerAlive = true;
        this.isInvulnerable = false;
        this.invulnerableTime = 2000;
        this.respawnDelay = 1000;
        this.dustPool = [];
        this.lastDustTime = 0;
        this.dustInterval = 100; // 먼지 생성 간격 (ms)
        this.vfxPools = new Map(); // VFX 풀을 저장할 Map
        this.lastFireballTime = 0;
        this.fireballCooldown = 500; // 0.5초 쿨다운
        this.lastWalkSoundTime = 0;
        this.walkSoundCooldown = 150; // 0.15초 간격으로 걸음 소리 (더 빠르게)
        this.lastJumpSoundTime = 0;
        this.jumpSoundCooldown = 500; // 0.5초 쿨다운으로 점프 소리 겹침 방지
    }

    init() {
        this.player = null;
        this.cursors = null;
        this.map = null;
        this.groundLayer = null;
        this.landLayer = null;
        this.enemies = null;
        this.playerAlive = true;
        this.isDying = false;
        this.deathTween = null;
        this.springs = null;
        this.blocks = null;
        this.itemBlocks = null;
        this.coins = null;
        this.movingPlatforms = null;
        this.backgrounds = [];
        this.lastCameraX = 0;
        this.targetBackgroundX = 0;
        this.currentBackgroundX = 0;
        this.vfxPools = new Map(); // VFX 풀을 저장할 Map

        // 레지스트리 초기값 설정
        if (!this.registry.has('coins')) this.registry.set('coins', 0);
        if (!this.registry.has('hasKey1')) this.registry.set('hasKey1', false);
        if (!this.registry.has('hasKey2')) this.registry.set('hasKey2', false);
        if (!this.registry.has('lives')) this.registry.set('lives', 5);
        // 각 레벨의 코인 상태를 저장할 레지스트리 초기화
        if (!this.registry.has('collectedCoins')) {
            this.registry.set('collectedCoins', {});
        }
    }

    // 게임 상태 초기화 메서드
    static initializeGameState(registry) {
        registry.set('lives', 5);
        registry.set('coins', 0);
        registry.set('score', 0);
        registry.set('hasKey1', false);
        registry.set('hasKey2', false);
        registry.set('collectedCoins', {});
    }

    preloadAssets() {
        // 타일셋 에셋
        this.load.image('tiles', 'assets/colored_packed.png');
        this.load.image('tiles_transparent', 'assets/colored-transparent_packed.png');
        this.load.image('tiles_pipe', 'assets/pipe.png');
        
        // 플레이어 에셋
        this.load.atlas('player', 'assets/player.png', 'assets/player.json');
        
        // NPC 에셋
        this.load.image('npc', 'assets/npc.png');
        
        // 적 에셋
        this.load.atlas('enemy', 'assets/enemy.png', 'assets/enemy.json');
        
        // 오브젝트 에셋
        this.load.atlas('object', 'assets/object.png', 'assets/object.json');
        
        // 블록 에셋
        this.load.atlas('block', 'assets/block.png', 'assets/block.json');

        // 배경 이미지
        this.load.image('bg', 'assets/bg.png');
        
        // 사운드 에셋
        this.load.audio('coinSound', 'assets/coin.wav');
        this.load.audio('blockSound', 'assets/block.ogg');
        this.load.audio('walkSound', 'assets/block.ogg');
        this.load.audio('jumpSound', 'assets/jump.ogg');
        this.load.audio('clickSound', 'assets/click.ogg');
        this.load.audio('enemySound', 'assets/enemy.ogg');
        this.load.audio('deathSound', 'assets/death.ogg');
        this.load.audio('bossDeathSound', 'assets/bossdeath.ogg');
        this.load.audio('fireballSound', 'assets/fireball.wav');
        this.load.audio('bossWalkSound', 'assets/bosswalk.ogg');
        this.load.audio('impactSound', 'assets/impact.wav');
    }

    setupGame(mapKey) {
        // 배경 설정
        this.setupBackground();
    
        // 물리 시스템 설정
        this.physics.world.gravity.y = 800;
    
        // 맵 생성
        this.map = this.make.tilemap({ key: mapKey });
    
        // 타일셋 로드 (존재하는 것만)
        const tilesets = [];
    
        try {
            const tileset = this.map.addTilesetImage('1-1', 'tiles');
            tilesets.push(tileset);
        } catch (e) {
            console.warn('[setupGame] 1-1 tileset 없음');
        }
    
        try {
            const transparentTileset = this.map.addTilesetImage('1-1transparent', 'tiles_transparent');
            tilesets.push(transparentTileset);
        } catch (e) {
            console.warn('[setupGame] transparent tileset 없음');
        }
    
        try {
            const pipeTileset = this.map.addTilesetImage('pipe', 'tiles_pipe');
            tilesets.push(pipeTileset);
        } catch (e) {
            console.warn('[setupGame] pipe tileset 없음');
        }
    
        // ground 레이어는 필수
        this.groundLayer = this.map.createLayer('ground', tilesets, 0, 0);
        this.groundLayer.setCollisionByExclusion([-1]);
    
        // land 레이어는 선택
        try {
            this.landLayer = this.map.createLayer('land', tilesets, 0, 0);
            this.landLayer.setCollisionByExclusion([-1]);
    
            // landLayer 충돌 방향 설정
            this.landLayer.forEachTile(tile => {
                if (tile.index !== -1) {
                    tile.collideDown = false;
                    tile.collideUp = true;
                    tile.collideLeft = false;
                    tile.collideRight = false;
                }
            });
        } catch (e) {
            console.warn('[setupGame] land 레이어 없음 - 생략됨');
            this.landLayer = null;
        }
    
        // 월드 경계 설정
        const mapWidth = this.map.widthInPixels;
        const mapHeight = this.map.heightInPixels;
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    
        this.setupPlayer();
        this.setupCamera(mapWidth, mapHeight);
        this.setupAnimations();
        this.setupControls();
        this.setupUI();
    
        // 충돌 설정
        this.physics.add.collider(this.player, this.groundLayer);
        if (this.landLayer) {
            this.physics.add.collider(this.player, this.landLayer);
        }

        // 코인 그룹 설정
        this.coins = this.physics.add.group();
        const coinLayer = this.map.getObjectLayer('coin');
        if (coinLayer) {
            // 현재 레벨의 수집된 코인 상태 가져오기
            const collectedCoins = this.registry.get('collectedCoins');
            const currentLevelCoins = collectedCoins[this.scene.key] || [];

            coinLayer.objects.forEach(obj => {
                // 이미 수집한 코인이면 생성하지 않음
                if (!currentLevelCoins.includes(obj.id)) {
                    const coin = this.coins.create(obj.x + 8, obj.y + 8, 'object', '0218.png');
                    coin.body.allowGravity = false;
                    coin.body.setSize(8, 8);
                    coin.setOffset(4, 4);
                    // 코인의 ID를 저장
                    coin.coinId = obj.id;
                }
            });
            this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        }

        // 키 설정
        this.keys = this.physics.add.group();
        const keyLayer = this.map.getObjectLayer('keys');
        if (keyLayer) {
            keyLayer.objects.forEach(obj => {
                const key = this.keys.create(obj.x + 8, obj.y - 8, 'items', 'key.png');
                key.body.allowGravity = false;
            });
            this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
        }
    }
    

    setupPlayer() {
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

        if (!this.player) {
            // 플레이어가 없으면 새로 생성
            this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, 'player');
            this.player.setBounce(0);
            this.player.setCollideWorldBounds(false);
            this.player.body.setMaxVelocity(150, 400);
            this.player.body.setDragX(750);
            this.player.setDepth(20);
        } else {
            // 플레이어가 있으면 위치만 업데이트
            this.player.setPosition(spawnPoint.x, spawnPoint.y);
        }
    }

    setupCamera(mapWidth, mapHeight) {
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(2);
    }

    setupAnimations() {
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: [
                    { key: 'player', frame: '0361.png' },
                    { key: 'player', frame: '0362.png' },
                    { key: 'player', frame: '0363.png' }
                ],
                frameRate: 12,
                repeat: -1
            });
        }

        if (!this.anims.exists('idle')) {
            this.anims.create({
                key: 'idle',
                frames: [{ key: 'player', frame: '0361.png' }],
                frameRate: 10
            });
        }

        if (!this.anims.exists('jump')) {
            this.anims.create({
                key: 'jump',
                frames: [{ key: 'player', frame: '0364.png' }],
                frameRate: 10
            });
        }
    }

    setupCoins() {
        this.coinText = this.add.text(16, 16, 'COINS: 0', {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.setupDebugControls();
    }

    setupDebugControls() {
        this.input.keyboard.on('keydown-D', () => {
            this.debugMode = !this.debugMode;
            if (this.debugMode) {
                this.enableDebugMode();
            } else {
                this.disableDebugMode();
            }
        });
    }

    enableDebugMode() {
        this.player.body.setAllowGravity(false);
        this.physics.world.removeCollider(this.player.body.collider);
        
        const debugGraphics = this.add.graphics();
        this.groundLayer.renderDebug(debugGraphics, {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 128),
            faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        });
        this.debugGraphics.push(debugGraphics);
    }

    disableDebugMode() {
        this.player.body.setAllowGravity(true);
        this.physics.add.collider(this.player, this.groundLayer);
        this.physics.add.collider(this.player, this.landLayer);
        
        this.debugGraphics.forEach(graphics => {
            if (graphics) {
                graphics.destroy();
            }
        });
        this.debugGraphics = [];
    }

    collectCoin(player, coin) {
        coin.destroy();
        
        // 코인 수집 사운드 재생
        this.sound.play('coinSound', { volume: 0.1 });
        
        // 현재 레벨의 수집된 코인 목록 업데이트
        const collectedCoins = this.registry.get('collectedCoins');
        if (!collectedCoins[this.scene.key]) {
            collectedCoins[this.scene.key] = [];
        }
        collectedCoins[this.scene.key].push(coin.coinId);
        this.registry.set('collectedCoins', collectedCoins);
        
        // 코인 카운트 증가
        const currentCoins = this.registry.get('coins');
        this.registry.set('coins', currentCoins + 1);
    }

    collectKey(player, key) {
        key.destroy();
        this.registry.set('hasKey1', true);
    }

    handlePlayerMovement() {
        if (this.debugMode) {
            this.handleDebugMovement();
        } else if (this.playerAlive) {
            this.handleNormalMovement();
        }
    }

    handleDebugMovement() {
        const speed = 300;
        this.player.setVelocity(0);
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.flipX = true;
            this.player.anims.play('walk', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.flipX = false;
            this.player.anims.play('walk', true);
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        }
        if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
            this.player.anims.play('idle', true);
        }
    }

    handleNormalMovement() {
        // 죽는 중이면 키 입력 무시
        if (this.isDying) {
            return;
        }
        
        const acceleration = 800;
        const jumpVelocity = -330;
        const moveSpeed = 150;
        
        if (this.cursors.left.isDown) {
            if (this.player.body.velocity.x > -moveSpeed) {
                this.player.setAccelerationX(-acceleration);
            } else {
                this.player.setVelocityX(-moveSpeed);
                this.player.setAccelerationX(0);
            }
            this.player.flipX = true;
            this.player.anims.play('walk', true);

            // 왼쪽으로 걸을 때 먼지 효과와 걸음 소리
            if (this.player.body.onFloor()) {
                // 걸음 소리 재생 (쿨다운 적용)
                const currentTime = this.time.now;
                if (currentTime - this.lastWalkSoundTime > this.walkSoundCooldown) {
                    this.sound.play('walkSound', { volume: 0.2 });
                    this.lastWalkSoundTime = currentTime;
                }
                
                // 여러 개의 먼지 효과 생성
                for (let i = 0; i < 3; i++) {
                    const xOffset = Phaser.Math.Between(-2, 4);
                    const yOffset = Phaser.Math.Between(-2, 2);
                    this.playVFX('object', '0218.png', 
                        this.player.x + 6 + xOffset, 
                        this.player.y + 8 + yOffset,
                        {
                            scale: 0.6 + Math.random() * 0.4,
                            alpha: 0.5 + Math.random() * 0.3,
                            angle: () => Phaser.Math.Between(-45, 45),
                            duration: 200 + Math.random() * 200,
                            scaleEnd: 0.1,
                            alphaEnd: 0,
                            yOffset: Phaser.Math.Between(-8, -4),
                            xOffset: Phaser.Math.Between(2, 8)
                        }
                    );
                }
            }
        } else if (this.cursors.right.isDown) {
            if (this.player.body.velocity.x < moveSpeed) {
                this.player.setAccelerationX(acceleration);
            } else {
                this.player.setVelocityX(moveSpeed);
                this.player.setAccelerationX(0);
            }
            this.player.flipX = false;
            this.player.anims.play('walk', true);

            // 오른쪽으로 걸을 때 먼지 효과와 걸음 소리
            if (this.player.body.onFloor()) {
                // 걸음 소리 재생 (쿨다운 적용)
                const currentTime = this.time.now;
                if (currentTime - this.lastWalkSoundTime > this.walkSoundCooldown) {
                    this.sound.play('walkSound', { volume: 0.2 });
                    this.lastWalkSoundTime = currentTime;
                }
                
                // 여러 개의 먼지 효과 생성
                for (let i = 0; i < 3; i++) {
                    const xOffset = Phaser.Math.Between(-4, 2);
                    const yOffset = Phaser.Math.Between(-2, 2);
                    this.playVFX('object', '0218.png', 
                        this.player.x - 6 + xOffset, 
                        this.player.y + 8 + yOffset,
                        {
                            scale: 0.6 + Math.random() * 0.4,
                            alpha: 0.5 + Math.random() * 0.3,
                            angle: () => Phaser.Math.Between(-45, 45),
                            duration: 200 + Math.random() * 200,
                            scaleEnd: 0.1,
                            alphaEnd: 0,
                            yOffset: Phaser.Math.Between(-8, -4),
                            xOffset: Phaser.Math.Between(-8, -2)
                        }
                    );
                }
            }
        } else {
            this.player.setAccelerationX(0);
            if (Math.abs(this.player.body.velocity.x) < 10) {
                this.player.setVelocityX(0);
            }
            this.player.anims.play('idle', true);
        }

        const canJump = this.player.body.onFloor();
        
        if (canJump) {
            this.isJumping = false;
        }

        if (this.cursors.space.isDown && canJump && !this.isJumping) {
            this.player.setVelocityY(jumpVelocity);
            this.isJumping = true;
            this.player.anims.play('jump', true);
            
            // 점프 사운드 재생 (쿨다운 적용)
            const currentTime = this.time.now;
            if (currentTime - this.lastJumpSoundTime > this.jumpSoundCooldown) {
                this.sound.play('jumpSound', { volume: 0.3 });
                this.lastJumpSoundTime = currentTime;
            }
        }

        // 수직 플랫폼 위에 있는지 확인
        const isOnVerticalPlatform = this.player.isOnPlatform && 
                                   this.player.currentPlatform && 
                                   this.player.currentPlatform.isVertical;

        // 공중에 있지만 수직 플랫폼 위에 있지 않을 때만 점프 애니메이션 재생
        if (!canJump && !isOnVerticalPlatform) {
            if (!this.player.anims.isPlaying || 
                (this.player.anims.currentAnim && this.player.anims.currentAnim.key !== 'jump')) {
                this.player.anims.play('jump', true);
            }
        }

        if (!this.cursors.space.isDown && this.player.body.velocity.y < 0) {
            this.player.setVelocityY(this.player.body.velocity.y * 0.85);
        }
    }

    handlePlayerDeath() {
        if (!this.isDying && this.playerAlive) {
            this.isDying = true;
            this.playerAlive = false;
            
            // 사망 사운드 재생
            this.sound.play('deathSound', { volume: 0.5 });
            
            // 플레이어 움직임 완전히 정지 및 물리 비활성화
            this.player.body.setVelocity(0, 0);
            this.player.body.setAcceleration(0, 0);
            this.player.setVelocity(0, 0);
            
            // 라이프 감소
            const currentLives = this.registry.get('lives');
            this.registry.set('lives', currentLives - 1);

            if (currentLives <= 1) {
                // 게임 오버
                this.gameOver();
            } else {
                // 사망 애니메이션
                if (this.deathTween) {
                    this.deathTween.stop();
                }

                // 잠시 후 사망 애니메이션 시작 (키 입력이 완전히 멈춘 후)
                this.time.delayedCall(100, () => {
                    this.player.body.setVelocity(0, -200);
                    this.player.body.setAllowGravity(false);
                    
                    this.deathTween = this.tweens.add({
                        targets: this.player,
                        angle: 180,
                        y: this.player.y - 100,
                        duration: 700,
                        ease: 'Cubic.easeOut',
                        onComplete: () => {
                            this.tweens.add({
                                targets: this.player,
                                y: this.cameras.main.scrollY + this.cameras.main.height + 100,
                                duration: 500,
                                ease: 'Cubic.easeIn',
                                onComplete: () => {
                                    this.time.delayedCall(this.respawnDelay, () => {
                                        this.respawnPlayer();
                                    });
                                }
                            });
                        }
                    });
                });
            }
        }
    }

    gameOver() {
        // UI 숨기기
        const uiScene = this.scene.get('UI');
        if (uiScene && uiScene.hide) {
            uiScene.hide();
        }
        
        // GameOver 씬으로 즉시 이동
        this.scene.start('GameOver');
    }

    respawnPlayer() {
        // 리스폰 포인트 찾기
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

        // 플레이어 위치 및 상태 초기화
        this.player.setPosition(spawnPoint.x + 8, spawnPoint.y);
        this.player.setVelocity(0, 0);
        this.player.angle = 0;
        this.player.setAlpha(0);
        this.player.body.setAllowGravity(true);

        // 페이드 인 효과로 플레이어 등장
        this.tweens.add({
            targets: this.player,
            alpha: 1,
            duration: 500,
            onComplete: () => {
                this.isDying = false;
                this.playerAlive = true;
                
                // 무적 시간 설정
                this.isInvulnerable = true;
                this.time.delayedCall(this.invulnerableTime, () => {
                    this.isInvulnerable = false;
                });
            }
        });
    }

    update() {
        if (this.player.y > this.cameras.main.scrollY + this.cameras.main.height) {
            this.handlePlayerDeath();
        }
        this.handlePlayerMovement();
        this.debugGraphics.forEach(graphics => {
            graphics.visible = this.debugMode;
        });

        // 배경 레이어 움직임 업데이트
        if (this.backgrounds && this.backgrounds.length > 0) {
            const cameraDeltaX = this.cameras.main.scrollX - this.lastCameraX;
            
            this.backgrounds.forEach(bg => {
                // 목표 위치 업데이트
                bg.targetX += cameraDeltaX * bg.factorX;
                
                // lerp를 사용하여 현재 위치를 목표 위치로 부드럽게 이동
                bg.currentX = this.lerp(bg.currentX, bg.targetX, 0.9);
                
                // 배경 위치 업데이트
                bg.sprite.tilePositionX = bg.currentX;
            });

            this.lastCameraX = this.cameras.main.scrollX;
        }
    }

    shutdown() {
        if (this.deathTween) {
            this.deathTween.stop();
            this.deathTween.remove();
            this.deathTween = null;
        }
        
        // 키보드 이벤트 리스너 제거
        this.input.keyboard.removeCapture('ONE,TWO,THREE,FOUR');
        this.input.keyboard.removeAllListeners('keydown-ONE');
        this.input.keyboard.removeAllListeners('keydown-TWO');
        this.input.keyboard.removeAllListeners('keydown-THREE');
        this.input.keyboard.removeAllListeners('keydown-FOUR');
        
        this.time.removeAllEvents();
        if (this.player && this.player.anims) {
            this.player.anims.stop();
        }
    }

    setupUI() {
        this.coinText = this.add.text(16, 16, 'COINS: 0', {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);
    }

    setupBackground() {
        // 배경 레이어 생성 (3개의 레이어로 구성)
        const bgWidth = this.scale.width;
        const bgHeight = this.scale.height;

        // 가장 뒤 레이어 (가장 천천히 움직임)
        const bg1 = this.add.tileSprite(0, 0, bgWidth * 2, bgHeight, 'bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-3);
        
        // 중간 레이어
        const bg2 = this.add.tileSprite(0, 0, bgWidth * 2, bgHeight, 'bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-2)
            .setTint(0xdddddd);
        
        // 앞 레이어 (가장 빠르게 움직임)
        const bg3 = this.add.tileSprite(0, 0, bgWidth * 2, bgHeight, 'bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-1)
            .setTint(0xbbbbbb);

        this.backgrounds = [
            { sprite: bg1, factorX: 0.01, currentX: 0, targetX: 0 },
            { sprite: bg2, factorX: 0.02, currentX: 0, targetX: 0 },
            { sprite: bg3, factorX: 0.03, currentX: 0, targetX: 0 }
        ];
    }

    // lerp 헬퍼 함수 추가
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    create() {
        // UI 씬 시작 (한 번만)
        if (!this.scene.isActive('UI')) {
            this.scene.launch('UI');
        } else {
            // UI가 이미 활성화되어 있으면 보이기
            const uiScene = this.scene.get('UI');
            if (uiScene && uiScene.show) {
                uiScene.show();
            }
        }

        // 키보드 입력 설정
        this.cursors = this.input.keyboard.createCursorKeys();
        this.fireKey = this.input.keyboard.addKey('F');

        // 먼지 VFX 풀 생성
        this.createVFXPool('object', '0218.png', 10);

        // 전역 씬 전환 단축키 추가 (강제 전환)
        const forceSceneChange = (sceneName) => {
            // 모든 활성 씬을 중지
            for (const scene of this.scene.manager.getScenes(true)) {
                scene.scene.stop();
            }
            // 새로운 씬 시작
            this.scene.manager.start(sceneName);
        };

        // 키 입력 이벤트를 직접 처리
        this.input.keyboard.addCapture('ONE,TWO,THREE,FOUR');
        
        this.input.keyboard.on('keydown-ONE', () => {
            forceSceneChange('Level1');
        });
        
        this.input.keyboard.on('keydown-TWO', () => {
            forceSceneChange('Level2');
        });
        
        this.input.keyboard.on('keydown-THREE', () => {
            forceSceneChange('Level3');
        });

        this.input.keyboard.on('keydown-FOUR', () => {
            forceSceneChange('Level4');
        });
    }

    // VFX 풀 생성 메서드
    createVFXPool(key, frame, count = 10) {
        const pool = [];
        for (let i = 0; i < count; i++) {
            const vfx = this.add.sprite(0, 0, key, frame);
            vfx.setActive(false);
            vfx.setVisible(false);
            pool.push(vfx);
        }
        this.vfxPools.set(key + '_' + frame, pool);
        return pool;
    }

    // VFX 재생 메서드
    playVFX(key, frame, x, y, config = {}) {
        const poolKey = key + '_' + frame;
        let pool = this.vfxPools.get(poolKey);
        
        // 풀이 없으면 생성
        if (!pool) {
            pool = this.createVFXPool(key, frame);
        }

        // 비활성화된 VFX 찾기
        const vfx = pool.find(v => !v.active);
        if (!vfx) return null;

        // 기본 설정
        const defaultConfig = {
            scale: 0.8,
            alpha: 0.7,
            depth: 19,
            angle: 0,
            duration: 300,
            ease: 'Power2',
            scaleEnd: 0.2,
            alphaEnd: 0,
            yOffset: -5,
            xOffset: 0
        };

        // 사용자 설정과 기본 설정 병합
        const finalConfig = { ...defaultConfig, ...config };

        // VFX 설정 및 재생
        vfx.setActive(true);
        vfx.setVisible(true);
        vfx.setPosition(x, y);
        vfx.setScale(finalConfig.scale);
        vfx.setAlpha(finalConfig.alpha);
        vfx.setDepth(finalConfig.depth);
        vfx.angle = typeof finalConfig.angle === 'function' 
            ? finalConfig.angle() 
            : finalConfig.angle;

        // 애니메이션 재생
        this.tweens.add({
            targets: vfx,
            alpha: finalConfig.alphaEnd,
            scale: finalConfig.scaleEnd,
            y: vfx.y + finalConfig.yOffset,
            x: vfx.x + finalConfig.xOffset,
            duration: finalConfig.duration,
            ease: finalConfig.ease,
            onComplete: () => {
                vfx.setActive(false);
                vfx.setVisible(false);
            }
        });

        return vfx;
    }
} 