import BaseScene from './BaseScene';

export default class Level3 extends BaseScene {
    constructor() {
        super({ key: 'Level3' });
    }

    preload() {
        this.preloadAssets();
        this.load.tilemapTiledJSON('map3', 'assets/level1-3.tmj');
        this.load.atlas('object', 'assets/object.png', 'assets/object.json');
    }

    init() {
        super.init();
        this.isTransitioning = false;
    }

    create() {
        this.setupGame('map3');
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        const playerLayer = this.map.getObjectLayer('player');
        const spawn = playerLayer.objects.find(o => o.name === 'spawn');
        const spawnX = spawn?.x ?? 0;
        const spawnY = spawn?.y ?? 0;

        const fromPortal = this.registry.get('returnToLevel3');
        if (fromPortal) {
            this.registry.remove('returnToLevel3');
            this.isTransitioning = true;

            this.player.setAlpha(0);
            this.player.setY(spawnY + 32);
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
        this.createKey();
    }

    createKey() {
        const keyLayer = this.map.getObjectLayer('key');
        if (!keyLayer) return;

        keyLayer.objects.forEach(obj => {
            if (obj.name === 'item') {
                const key2 = this.physics.add.sprite(obj.x + 8, obj.y - 8, 'object', '0573.png');
                key2.setScale(1);
                key2.setBounce(0);
                key2.setCollideWorldBounds(true);
                
                // 키와 지형 충돌 설정
                this.physics.add.collider(key2, this.groundLayer);
                this.physics.add.collider(key2, this.landLayer);
                
                // 키 수집 설정
                this.physics.add.overlap(this.player, key2, () => {
                    key2.destroy();
                    this.registry.set('hasKey2', true);
                });
            }
        });
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

    checkSceneTransition() {
        const playerLayer = this.map.getObjectLayer('player');
        const spawn = playerLayer.objects.find(o => o.name === 'spawn');
        if (!spawn) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, spawn.x + 8, spawn.y);
        if (dist < 32 && this.cursors.down.isDown && !this.isTransitioning) {
            this.startLevelTransition();
        }
    }

    startLevelTransition() {
        this.isTransitioning = true;
        this.player.body.enable = false;
        this.player.setDepth(-1);

        this.tweens.add({
            targets: this.player,
            y: this.player.y + 32,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.registry.set('returnToLevel2', { x: 1038, y: 64 });
                this.scene.start('Level2');
            }
        });
    }

    update() {
        if (this.isTransitioning) return;

        super.update();
        this.checkSceneTransition();

        this.movingPlatforms.children.iterate(platform => {
            if (!platform.startPoint || !platform.endPoint) return;

            if (platform.isVertical) {
                if (platform.direction > 0 && platform.y <= platform.endPoint.y) platform.direction = -1;
                else if (platform.direction < 0 && platform.y >= platform.startPoint.y) platform.direction = 1;

                platform.y -= platform.moveSpeed * platform.direction;
                platform.x = platform.startPoint.x;
                platform.body.velocity.y = -platform.moveSpeed * platform.direction * 60;
            }

            platform.body.updateFromGameObject();
        });

        // 플랫폼에 계속 있는지 확인
        if (this.player.isOnPlatform) {
            const platform = this.player.currentPlatform;

            const isStillOnPlatform = platform &&
                this.player.body.bottom <= platform.body.bottom + 2 &&
                this.player.body.bottom >= platform.body.top - 2 &&
                Math.abs(this.player.x - platform.x) < 32;

            if (isStillOnPlatform && platform.isVertical) {
                this.player.y = platform.y - (platform.body.height / 2) - (this.player.height / 2);
            } else {
                this.player.isOnPlatform = false;
                this.player.currentPlatform = null;
            }
        }

        if (this.player && this.player.y > this.map.heightInPixels) {
            this.handlePlayerDeath();
        }
    }
}
