import BaseScene from './BaseScene';

export default class Level4 extends BaseScene {
    constructor() {
        super({ key: 'Level4' });
    }

    preload() {
        this.preloadAssets();
        this.load.tilemapTiledJSON('map4', 'assets/level1-4.tmj');
        this.load.atlas('object', 'assets/object.png', 'assets/object.json');
        this.load.image('spinner', 'assets/spinner.png');
        
        // 보스 캐릭터 에셋 로드
        this.load.image('alienBlue_stand', 'assets/alienBlue_stand.png');
        this.load.image('alienBlue_walk1', 'assets/alienBlue_walk1.png');
        this.load.image('alienBlue_walk2', 'assets/alienBlue_walk2.png');
        this.load.image('alienBlue_duck', 'assets/alienBlue_duck.png');
    }

    init() {
        super.init();
        this.isTransitioning = false;
        this.bossTriggered = false;
        this.boss = null;
        this.bossTrigger = null;
        this.bossSpawnPoint = null;
        this.fireballs = null;
        this.lastFireballTime = 0;
        this.fireballCooldown = 500;
        this.bossHealthContainer = null;
        this.bossDebugGraphics = null;
        this.lastBossWalkSoundTime = 0;
        this.bossWalkSoundCooldown = 500; // 0.5초 간격으로 보스 걸음 소리
    }

    create() {
        super.create();

        this.map = this.make.tilemap({ key: 'map4' });
        this.setupGame('map4');

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        const playerLayer = this.map.getObjectLayer('player');
        const spawn = playerLayer?.objects?.find(o => o.name === 'spawn');
        const spawnX = spawn?.x ?? 0;
        const spawnY = spawn?.y ?? 0;

        const fromPortal = this.registry.get('returnToLevel4');
        if (fromPortal) {
            this.registry.remove('returnToLevel4');
            this.isTransitioning = true;

            this.player.setAlpha(0);
            this.player.setY(spawnY - 32);
            this.player.setX(spawnX + 8);
            this.player.setDepth(-1);
            this.player.body.enable = false;

            this.tweens.add({
                targets: this.player,
                y: spawnY,
                alpha: 1,
                duration: 1000,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    this.player.setDepth(20);
                    this.player.body.enable = true;
                    this.isTransitioning = false;
                }
            });
        } else {
            this.player.setPosition(spawnX + 8, spawnY);
        }

        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.setupVerticalPlatforms();
        this.setupCollisions();
        this.setupSnakeTraps();
        this.setupBoss();

        // 화염구 발사 키 설정
        this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        
        // 화염구 그룹 생성
        this.fireballs = this.physics.add.group();
    }

    createPlatform(x, y) {
        const width = 16 * 3;
        const height = 16;
        const platform = this.add.container(x, y);

        for (let i = 0; i < 3; i++) {
            const sprite = this.add.sprite(i * 16 - 24, -8, 'block', '0121.png');
            sprite.setOrigin(0, 0);
            platform.add(sprite);
        }

        this.physics.world.enable(platform);
        platform.body.setSize(width, height).setOffset(-width / 2, -height / 2);
        platform.body.setAllowGravity(false);
        platform.body.setImmovable(true);

        this.movingPlatforms.add(platform);
        return platform;
    }

    setupVerticalPlatforms() {
        const layer = this.map.getObjectLayer('movinglandup');
        if (!layer) return;

        const up = layer.objects.find(o => o.name === 'landmovepointup');
        const down = layer.objects.find(o => o.name === 'landmovepointdown');
        if (up && down) {
            const platform = this.createPlatform(down.x, down.y);
            platform.startPoint = down;
            platform.endPoint = up;
            platform.direction = 1;
            platform.moveSpeed = 0.5;
            platform.isVertical = true;
        }
    }

    setupCollisions() {
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        this.physics.add.collider(this.player, this.movingPlatforms, (player, platform) => {
            const isLanding = player.body.velocity.y >= 0 &&
                player.body.bottom <= platform.y &&
                platform.body.touching.up && player.body.touching.down;

            if (isLanding && platform.isVertical) {
                player.y = platform.y - (platform.body.height / 2) - (player.height / 2);
                player.body.velocity.y = 0;
                player.isOnPlatform = true;
                player.currentPlatform = platform;
            }
        });
    }

    setupSnakeTraps() {
        this.snakeTraps = [];

        const layer = this.map.getObjectLayer('snake');
        if (!layer) return;

        layer.objects.forEach(obj => {
            if (!obj.name.startsWith('point')) return;

            const pivotX = obj.x;
            const pivotY = obj.y - 16;

            const linkCount = 6;
            const linkSpacing = 12;
            const baseAngle = Math.random() * 360;
            const rotationSpeed = 0.8 + Math.random() * 0.4;

            // 중간 줄인지 확인 (obj.name에서 숫자를 추출하여 확인)
            const pointNumber = parseInt(obj.name.replace('point', ''));
            const isMiddleRow = pointNumber === 2; // point2가 중간 줄

            const trapGroup = {
                pivotX,
                pivotY,
                baseAngle,
                rotationSpeed: isMiddleRow ? -rotationSpeed : rotationSpeed, // 중간 줄이면 반대 방향
                links: []
            };

            // 첫 번째 스피너를 중심점으로 생성
            const centerSpinner = this.physics.add.sprite(pivotX, pivotY, 'spinner');
            centerSpinner.setOrigin(0.5);
            centerSpinner.setScale(0.25);
            centerSpinner.body.setAllowGravity(false);
            centerSpinner.body.setCircle(centerSpinner.width / 4);
            centerSpinner.isCenter = true;
            centerSpinner.angle = baseAngle;
            centerSpinner.rotationSpeed = -rotationSpeed;

            this.snakeTraps.push(centerSpinner);
            trapGroup.links.push(centerSpinner);

            this.physics.add.overlap(this.player, centerSpinner, () => {
                this.handlePlayerDeath();
            });

            // 나머지 스피너들 생성
            for (let i = 1; i < linkCount; i++) {
                const spinner = this.physics.add.sprite(0, 0, 'spinner');
                spinner.setOrigin(0.5);
                spinner.setScale(0.25);
                spinner.radiusOffset = linkSpacing * i;
                spinner.body.setAllowGravity(false);
                spinner.body.setCircle(spinner.width / 4);

                this.snakeTraps.push(spinner);
                trapGroup.links.push(spinner);

                this.physics.add.overlap(this.player, spinner, () => {
                    this.handlePlayerDeath();
                });
            }

            if (!this.snakeTrapGroups) this.snakeTrapGroups = [];
            this.snakeTrapGroups.push(trapGroup);
        });
    }

    setupBoss() {
        // 보스 스폰 포인트 찾기
        const bossLayer = this.map.getObjectLayer('boss');
        if (!bossLayer) return;

        const spawnPoint = bossLayer.objects.find(obj => obj.name === 'spawn');
        if (!spawnPoint) return;

        // player 레이어에서 bosspoint 찾기
        const playerLayer = this.map.getObjectLayer('player');
        if (!playerLayer) return;

        const bossPoint = playerLayer.objects.find(obj => obj.name === 'bosspoint');
        if (!bossPoint) return;

        // 보스 스폰 포인트 저장
        this.bossSpawnPoint = spawnPoint;

        // 보스 포인트 영역 생성
        this.bossTrigger = this.add.rectangle(
            bossPoint.x + bossPoint.width/2, 
            bossPoint.y + bossPoint.height/2, 
            bossPoint.width, 
            bossPoint.height
        );
        this.physics.add.existing(this.bossTrigger, true);

        // 보스 포인트와 플레이어 충돌 감지
        this.physics.add.overlap(this.player, this.bossTrigger, () => {
            console.log('보스 트리거 영역 진입!', {
                bossTriggered: this.bossTriggered,
                bossExists: !!this.boss,
                playerPosition: { x: this.player.x, y: this.player.y }
            });
            
            if (!this.bossTriggered && !this.boss) {
                console.log('보스 생성 시작!');
                this.bossTriggered = true;
                this.spawnBoss(this.bossSpawnPoint.x, this.bossSpawnPoint.y);
                this.bossTrigger.destroy();
                console.log('보스 생성 완료 및 트리거 제거');
            } else {
                console.log('보스 생성 조건 불만족 - 이미 트리거됨 또는 보스 존재');
            }
        });
    }

    spawnBoss(x, y) {
        // 보스 캐릭터 생성
        this.boss = this.physics.add.sprite(x, y - 200, 'alienBlue_stand');
        this.boss.setOrigin(0.5, 1.0);
        
        // 보스 물리 속성 설정
        this.boss.body.setGravityY(300);
        this.boss.body.setBounce(0.2);
        this.boss.body.setSize(50, 92);
        this.boss.body.setOffset(0, 0);
        
        // 보스 속성 설정
        this.boss.moveSpeed = 150;
        this.boss.isAttacking = false;
        this.boss.attackCooldown = false;
        this.boss.maxHealth = 100;
        this.boss.health = this.boss.maxHealth;
        
        // 보스 체력바 생성
        this.createBossHealthBar();

        // 보스와 플레이어 충돌 설정
        this.physics.add.overlap(this.boss, this.player, () => {
            console.log('보스와 플레이어 충돌 감지!', {
                bossPosition: { x: this.boss.x, y: this.boss.y },
                playerPosition: { x: this.player.x, y: this.player.y },
                isDying: this.isDying,
                playerAlive: this.playerAlive,
                debugMode: this.debugMode
            });
            
            if (!this.debugMode) {
                console.log('handlePlayerDeath 호출됨');
                this.handlePlayerDeath();
            } else {
                console.log('디버그 모드로 인해 사망 처리 스킵됨');
            }
        }, null, this);
        
        // 보스와 화염구 충돌 설정
        this.physics.add.overlap(this.boss, this.fireballs, (boss, fireball) => {
            this.handleFireballHit(boss, fireball);
        }, null, this);
        
        // 보스 애니메이션 생성 (중복 체크)
        this.createBossAnimations();

        // 보스와 타일맵 레이어들의 충돌 설정
        if (this.groundLayer) {
            this.physics.add.collider(this.boss, this.groundLayer);
        }
        
        // 초기 애니메이션 설정
        this.boss.anims.play('boss_idle', true);
    }

    createBossAnimations() {
        if (!this.anims.exists('boss_idle')) {
            this.anims.create({
                key: 'boss_idle',
                frames: [{ key: 'alienBlue_stand' }],
                frameRate: 10,
                repeat: -1
            });
        }

        if (!this.anims.exists('boss_walk')) {
            this.anims.create({
                key: 'boss_walk',
                frames: [
                    { key: 'alienBlue_walk1' },
                    { key: 'alienBlue_walk2' }
                ],
                frameRate: 8,
                repeat: -1
            });
        }

        if (!this.anims.exists('boss_duck')) {
            this.anims.create({
                key: 'boss_duck',
                frames: [{ key: 'alienBlue_duck' }],
                frameRate: 10,
                repeat: -1
            });
        }
    }

    createBossHealthBar() {
        const barWidth = 80;
        const barHeight = 8;
        const padding = 2;
        
        // 체력바 컨테이너 생성
        this.bossHealthContainer = this.add.container(this.boss.x, this.boss.y - 60);
        
        // 체력바 배경 (검정)
        this.bossHealthBarBg = this.add.rectangle(0, 0, barWidth, barHeight, 0x000000);
        this.bossHealthBarBg.setOrigin(0.5, 0.5);
        
        // 체력바 (빨강)
        this.bossHealthBar = this.add.rectangle(
            -barWidth/2 + padding, 
            0, 
            barWidth - padding * 2, 
            barHeight - padding * 2, 
            0xff0000
        );
        this.bossHealthBar.setOrigin(0, 0.5);
        
        // 컨테이너에 체력바 추가
        this.bossHealthContainer.add([this.bossHealthBarBg, this.bossHealthBar]);
    }

    updateBossHealthBar() {
        if (!this.bossHealthContainer || !this.boss) return;
        
        // 체력바 위치 업데이트
        this.bossHealthContainer.setPosition(this.boss.x, this.boss.y - 60);
        
        // 체력바 크기 업데이트
        const healthPercent = this.boss.health / this.boss.maxHealth;
        const barWidth = 76; // 80 - (2 * padding)
        this.bossHealthBar.width = barWidth * healthPercent;
    }

    handleFireballHit(boss, fireball) {
        // 화염구 제거
        fireball.destroy();
        
        // 보스 데미지 처리
        this.boss.health -= 10; // 한 발당 10 데미지
        this.updateBossHealthBar();

        // 보스 피격 효과
        this.boss.setTint(0xff0000);
        this.time.delayedCall(100, () => {
            this.boss.clearTint();
        });

        // 보스 사망 체크
        if (this.boss.health <= 0) {
            this.handleBossDefeat();
        }
    }

    handleBossDefeat() {
        if (this.boss.isDefeated) return; // 이미 처리된 경우 중복 실행 방지
        
        // 보스 사망 사운드 재생
        this.sound.play('bossDeathSound', { volume: 0.6 });
        
        // 보스 사망 처리
        this.boss.isDefeated = true;
        this.boss.body.enable = false;
        this.boss.setVelocity(0, 0); // 모든 움직임 정지
        
        // 체력바 제거
        if (this.bossHealthContainer) {
            this.bossHealthContainer.destroy();
        }
        
        // 모든 화염구 제거
        this.fireballs.clear(true, true);
        
        // 보스 사망 애니메이션
        this.tweens.add({
            targets: this.boss,
            alpha: 0,
            y: this.boss.y - 100,
            angle: 180,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // 보스 객체 정리
                if (this.boss) {
                    this.boss.destroy();
                    this.boss = null;
                }
                
                // 잠시 대기 후 크레딧 씬으로 이동
                this.time.delayedCall(2000, () => {
                    // UI 씬 정지
                    this.scene.stop('UIScene');
                    
                    // 페이드 아웃 효과
                    this.cameras.main.fadeOut(1500, 0, 0, 0);
                    
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        // 모든 활성 씬 정지
                        this.scene.manager.scenes.forEach(scene => {
                            if (scene.scene.isActive()) {
                                this.scene.stop(scene.scene.key);
                            }
                        });
                        // 크레딧 씬 시작
                        this.scene.start('GameOver');
                    });
                });
            }
        });
    }

    shootFireball() {
        const currentTime = this.time.now;
        if (currentTime - this.lastFireballTime < this.fireballCooldown) return;

        // 코인이 1개 미만이면 파이어볼을 발사할 수 없음
        if (this.registry.get('coins') < 1) {
            return;
        }
        
        // 파이어볼 사운드 재생
        this.sound.play('fireballSound', { volume: 0.4 });
        
        // 코인을 1개 소모
        this.registry.set('coins', this.registry.get('coins') - 1);

        // 파이어볼 생성 및 발사
        const fireball = this.fireballs.create(
            this.player.x + (this.player.flipX ? -20 : 20),
            this.player.y,
            'object',
            '0218.png'
        );

        // 화염구 설정
        fireball.setScale(0.5);
        fireball.body.setSize(8, 8);
        fireball.setVelocityX(this.player.flipX ? -400 : 400);
        fireball.setVelocityY(-200);
        fireball.setBounce(0.6);
        fireball.setGravityY(400);
        fireball.setFriction(0);
        fireball.bounceCount = 0;
        fireball.setAngularVelocity(this.player.flipX ? -360 : 360);
        
        // 5초 후 자동 제거
        this.time.delayedCall(5000, () => {
            if (fireball.active) {
                fireball.destroy();
            }
        });

        this.lastFireballTime = currentTime;
    }

    handlePlayerDeath() {
        // BaseScene의 통합 handlePlayerDeath 메서드 사용
        super.handlePlayerDeath();
    }

    respawnPlayer() {
        // Level4에서는 리스폰 대신 씬을 재시작
        this.scene.restart();
    }

    startBossAttack() {
        if (this.boss.isAttacking || this.boss.attackCooldown) return;
        
        this.boss.isAttacking = true;
        this.boss.setVelocityX(0);
        
        // 플레이어 머리 위로 점프 (높이 증가)
        const jumpHeight = -600;
        const targetX = this.player.x;
        
        this.boss.setVelocityY(jumpHeight);
        
        // 점프 시작할 때 먼지 효과
        for (let i = 0; i < 4; i++) {
            const angle = Phaser.Math.Between(0, 360);
            const distance = Phaser.Math.Between(2, 8);
            const xOffset = Math.cos(angle * Math.PI / 180) * distance;
            const yOffset = Math.sin(angle * Math.PI / 180) * distance;
            
            this.playVFX('object', '0218.png',
                this.boss.x + xOffset,
                this.boss.y - yOffset,
                {
                    scale: 0.9 + Math.random() * 0.3,
                    alpha: 0.7,
                    angle: () => angle,
                    duration: 300 + Math.random() * 100,
                    scaleEnd: 0.1,
                    alphaEnd: 0,
                    yOffset: -6,
                    xOffset: xOffset * 1.5,
                    tint: 0xffffff
                }
            );
        }
        
        // 플레이어 위치로 이동
        this.tweens.add({
            targets: this.boss,
            x: targetX,
            duration: 700,
            ease: 'Linear',
            onComplete: () => {
                // 점프 정점에서 아래로 내리찍기
                this.boss.setVelocityY(800);
                this.boss.setVelocityX(0);
                // 내리찍기 시작할 때 duck 애니메이션 재생
                this.boss.anims.play('boss_duck', true);
                // duck 상태일 때 히트박스 위치 조정
                this.boss.body.setOffset(0, -23);
            }
        });
    }

    handlePlayerMovement() {
        if (this.debugMode) {
            this.handleDebugMovement();
        } else if (this.playerAlive) {
            this.handleNormalMovement();
            
            // F키로 화염구 발사
            if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
                this.shootFireball();
            }
        }
    }

    updateSnakeTraps() {
        if (this.snakeTrapGroups) {
            this.snakeTrapGroups.forEach(group => {
                group.baseAngle += group.rotationSpeed;
                const rad = Phaser.Math.DegToRad(group.baseAngle);

                group.links.forEach((link, index) => {
                    if (index === 0) {
                        link.angle -= group.rotationSpeed;
                        return;
                    }

                    const r = link.radiusOffset;
                    const angle = rad;

                    link.x = group.pivotX + Math.cos(angle) * r;
                    link.y = group.pivotY + Math.sin(angle) * r;
                    link.setRotation(angle);
                });
            });
        }
    }

    updateBoss() {
        if (!this.boss || !this.player) return;

        // 보스가 공격 중이고 땅에 닿았는지 확인
        if (this.boss.isAttacking && this.boss.body.onFloor()) {
            // 착지 효과
            this.cameras.main.shake(200, 0.008);
            
            // 임팩트 사운드 재생 (1초 건너뛰고 3초만 재생)
            const impactSound = this.sound.add('impactSound', { volume: 0.7 });
            impactSound.play({ seek: 1 }); // 1초 지점부터 시작
            this.time.delayedCall(3000, () => {
                if (impactSound && impactSound.isPlaying) {
                    impactSound.stop();
                }
            });
            
            // 강력한 착지 먼지 효과
            for (let i = 0; i < 8; i++) {
                const angle = (i * 45) + Phaser.Math.Between(-20, 20); // 8방향으로 퍼짐
                const distance = Phaser.Math.Between(5, 15);
                const xOffset = Math.cos(angle * Math.PI / 180) * distance;
                const yOffset = Math.sin(angle * Math.PI / 180) * distance;
                
                this.playVFX('object', '0218.png',
                    this.boss.x + xOffset,
                    this.boss.y + 14 + yOffset,
                    {
                        scale: 1.2 + Math.random() * 0.4,
                        alpha: 0.8,
                        angle: () => angle,
                        duration: 400 + Math.random() * 200,
                        scaleEnd: 0.2,
                        alphaEnd: 0,
                        yOffset: -10,
                        xOffset: xOffset * 2,
                        tint: 0xffffff
                    }
                );
            }
            
            this.boss.isAttacking = false;
            this.boss.attackCooldown = true;

            // 2초 동안 대기
            this.time.delayedCall(2000, () => {
                if (this.boss && !this.boss.isDefeated) {
                    this.boss.attackCooldown = false;
                    this.boss.anims.play('boss_idle', true);
                    // idle 상태로 돌아갈 때 히트박스 위치 원복
                    this.boss.body.setOffset(-20, 0);
                }
            });
            return;
        }

        // 보스와 플레이어 사이의 거리 계산
        const distance = Phaser.Math.Distance.Between(
            this.boss.x, this.boss.y,
            this.player.x, this.player.y
        );

        if (!this.boss.isAttacking && !this.boss.attackCooldown) {
            if (distance <= 64) {
                // 공격 범위 안에 있으면 공격 시작
                this.startBossAttack();
            } else if (distance > 64) {
                // 추적
                const angle = Phaser.Math.Angle.Between(
                    this.boss.x, this.boss.y,
                    this.player.x, this.player.y
                );

                const velocityX = Math.cos(angle) * this.boss.moveSpeed;
                this.boss.setVelocityX(velocityX);
                this.boss.flipX = velocityX < 0;
                this.boss.anims.play('boss_walk', true);
                // walk 상태일 때도 기본 히트박스 위치 유지
                this.boss.body.setOffset(-20, 0);

                // 보스 걷기 먼지 효과와 걸음 소리
                if (this.boss.body.onFloor()) {
                    // 보스 걸음 소리 재생 (쿨다운 적용)
                    const currentTime = this.time.now;
                    if (currentTime - this.lastBossWalkSoundTime > this.bossWalkSoundCooldown) {
                        this.sound.play('bossWalkSound', { volume: 0.3 });
                        this.lastBossWalkSoundTime = currentTime;
                    }
                    
                    const direction = velocityX < 0 ? 1 : -1;
                    for (let i = 0; i < 2; i++) {
                        const xOffset = Phaser.Math.Between(-4, 4);
                        const yOffset = Phaser.Math.Between(-2, 2);
                        this.playVFX('object', '0218.png',
                            this.boss.x + (direction * 20) + xOffset,
                            this.boss.y + 14 + yOffset,
                            {
                                scale: 0.8 + Math.random() * 0.4,
                                alpha: 0.6,
                                angle: () => Phaser.Math.Between(-30, 30),
                                duration: 300 + Math.random() * 200,
                                scaleEnd: 0.1,
                                alphaEnd: 0,
                                yOffset: Phaser.Math.Between(-8, -4),
                                xOffset: direction * Phaser.Math.Between(2, 6),
                                tint: 0xffffff
                            }
                        );
                    }
                }
            }
        }

        // 보스 체력바 위치 업데이트
        if (!this.boss.isDefeated) {
            this.updateBossHealthBar();
        }
    }

    update() {
        if (this.isTransitioning) return;

        this.handlePlayerMovement();

        // 보스 업데이트 (보스가 존재하고, 트리거되었으며, 파괴되지 않았을 때만)
        if (this.boss && this.bossTriggered && !this.boss.isDefeated) {
            this.updateBoss();
        }

        // 화염구 발사 (보스가 파괴되지 않았을 때만)
        if (this.fireKey.isDown && (!this.boss || !this.boss.isDefeated)) {
            this.shootFireball();
        }

        // 스네이크 트랩 업데이트
        this.updateSnakeTraps();

        if (this.player && this.player.y > this.map.heightInPixels) {
            this.handlePlayerDeath();
        }

        // 화염구와 지형 충돌 처리 (보스가 파괴되지 않았을 때만)
        if (!this.boss || !this.boss.isDefeated) {
            this.physics.add.collider(this.fireballs, this.groundLayer, (fireball) => {
                fireball.bounceCount++;
                // 3번 튕기면 제거
                if (fireball.bounceCount >= 3) {
                    fireball.destroy();
                }
            });
        }
    }
}
