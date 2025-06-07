import BaseScene from './BaseScene';

export default class Level2 extends BaseScene {
    constructor() {
        super({ key: 'Level2' });
    }

    preload() {
        this.preloadAssets();
        this.load.tilemapTiledJSON('map2', 'assets/level1-2.tmj');
        this.load.atlas('object', 'assets/object.png', 'assets/object.json');
    }

    init() {
        super.init();
        this.isTransitioning = false;
    }

    create() {
        this.setupGame('map2');

        const returnData = this.registry.get('returnToLevel2');
        if (returnData) {
            this.player.setPosition(returnData.x, returnData.y);
            this.registry.remove('returnToLevel2');
        }

        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.physics.add.collider(this.player, this.groundLayer);
        this.physics.add.collider(this.player, this.landLayer);

        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.setupMovingPlatforms();
        this.setupVerticalPlatforms();
        this.setupCollisions();
        this.createNextLevelPoints();
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

        platform.body.checkCollision.up = true;
        platform.body.checkCollision.down = false;
        platform.body.checkCollision.left = false;
        platform.body.checkCollision.right = false;

        this.movingPlatforms.add(platform);
        return platform;
    }

    setupMovingPlatforms() {
        const layer = this.map.getObjectLayer('movingland');
        if (!layer) return;

        const p1 = layer.objects.find(o => o.name === 'landmovepoint1');
        const p2 = layer.objects.find(o => o.name === 'landmovepoint2');
        if (p1 && p2) {
            const platform = this.createPlatform(p1.x, p1.y);
            platform.startPoint = p1;
            platform.endPoint = p2;
            platform.direction = 1;
            platform.moveSpeed = 0.5;
        }
    }

    setupVerticalPlatforms() {
        const layer = this.map.getObjectLayer('movinglandup');
        if (!layer) return;

        const pUp = layer.objects.find(o => o.name === 'landmovepointup');
        const pDown = layer.objects.find(o => o.name === 'landmovepointdown');
        if (pUp && pDown) {
            const platform = this.createPlatform(pDown.x, pDown.y);
            platform.startPoint = pDown;
            platform.endPoint = pUp;
            platform.direction = 1;
            platform.moveSpeed = 0.5;
            platform.isVertical = true;
        }
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.movingPlatforms, (player, platform) => {
            const isLanding = player.body.velocity.y >= 0 &&
                              player.body.bottom <= platform.y &&
                              platform.body.touching.up && player.body.touching.down;

            if (isLanding) {
                player.y = platform.y - (platform.body.height / 2) - (player.height / 2);
                player.body.velocity.y = 0;
                player.isOnPlatform = true;
                player.currentPlatform = platform;
                player.lastPlatformX = platform.x;
            }
        });

        // 코인 충돌 설정
        this.physics.add.collider(this.coins, this.groundLayer);
        this.physics.add.collider(this.coins, this.landLayer);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    }

    createNextLevelPoints() {
        const layer = this.map.getObjectLayer('nextlevel');
        if (!layer) return;

        // 1-3 (↑)
        const portal1_3 = layer.objects.find(o => o.name === '1-3');
        if (portal1_3) {
            const trigger = this.add.rectangle(portal1_3.x, portal1_3.y, portal1_3.width, portal1_3.height);
            this.physics.add.existing(trigger, true);
            this.physics.add.overlap(this.player, trigger, () => {
                if (this.cursors.up.isDown && !this.isTransitioning) {
                    this.startLevelTransition();
                }
            });
        }

        // 1-4 (↓)
        const portal1_4 = layer.objects.find(o => o.name === '1-4');
        if (portal1_4) {
            const trigger = this.add.rectangle(portal1_4.x, portal1_4.y, portal1_4.width, portal1_4.height);
            this.physics.add.existing(trigger, true);
            this.physics.add.overlap(this.player, trigger, () => {
                if (this.cursors.down.isDown && !this.isTransitioning) {
                    this.startLevelTransitionToLevel4();
                }
            });
        }
    }

    startLevelTransition() {
        this.isTransitioning = true;
        this.player.body.enable = false;
        this.player.setDepth(-1);

        this.registry.set('returnToLevel3', true);

        this.tweens.add({
            targets: this.player,
            y: this.player.y - 32,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.scene.start('Level3');
            }
        });
    }

    startLevelTransitionToLevel4() {
        this.isTransitioning = true;
        this.player.body.enable = false;
        this.player.setDepth(-1);

        this.registry.set('returnToLevel4', { x: this.player.x, y: this.player.y });

        this.tweens.add({
            targets: this.player,
            y: this.player.y + 32,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.scene.start('Level4');
            }
        });
    }

    update() {
        if (this.isTransitioning) {
            this.player.y += 1;
            return;
        }

        super.update();

        this.movingPlatforms.children.iterate(platform => {
            if (!platform.startPoint || !platform.endPoint) return;

            if (platform.isVertical) {
                if (platform.direction > 0 && platform.y <= platform.endPoint.y) platform.direction = -1;
                else if (platform.direction < 0 && platform.y >= platform.startPoint.y) platform.direction = 1;

                platform.y -= platform.moveSpeed * platform.direction;
                platform.x = platform.startPoint.x;
                platform.body.velocity.y = -platform.moveSpeed * platform.direction * 60;
            } else {
                if (platform.direction > 0 && platform.x >= platform.endPoint.x) platform.direction = -1;
                else if (platform.direction < 0 && platform.x <= platform.startPoint.x) platform.direction = 1;

                platform.x += platform.moveSpeed * platform.direction;
                platform.y = platform.startPoint.y;
                platform.body.velocity.x = platform.moveSpeed * platform.direction * 60;
            }

            platform.body.updateFromGameObject();
        });

        if (this.player.isOnPlatform) {
            const platform = this.player.currentPlatform;

            const isStillOnPlatform = platform &&
                this.player.body.bottom <= platform.body.bottom + 2 &&
                this.player.body.bottom >= platform.body.top - 2 &&
                Math.abs(this.player.x - platform.x) < 32;

            if (isStillOnPlatform) {
                this.player.y = platform.y - (platform.body.height / 2) - (this.player.height / 2);

                if (!platform.isVertical) {
                    const deltaX = platform.x - this.player.lastPlatformX;
                    this.player.x += deltaX;
                    this.player.lastPlatformX = platform.x;
                }
            } else {
                this.player.isOnPlatform = false;
                this.player.currentPlatform = null;
            }
        }

        if (this.player && this.player.y > this.map.heightInPixels) {
            this.handlePlayerDeath();
        }
    }

    handleNextLevel(player, point) {
        const hasKey2 = this.registry.get('hasKey2');
        if (point.name === '1-4' && hasKey2 && this.cursors.down.isDown) {
            if (!this.isTransitioning) {
                this.isTransitioning = true;
                this.startLevelTransition();
                
                // 1초 후에 Level4로 전환
                this.time.delayedCall(1000, () => {
                    this.scene.start('Level4');
                });
            }
        }
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
}
