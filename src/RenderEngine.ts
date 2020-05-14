import * as BABYLON from "@babylonjs/core";
import Player from "./player/Player";
import {EventType, MinecraftClient} from "@webpejs/network";
import noa_engine from "noa-engine";

export class RenderEngine {

    private readonly client: MinecraftClient;

    private noaEngine;      // noaEngine

    constructor(client: MinecraftClient) {
        this.client = client;
    }

    public startEngine() {

        const opts = {
            babylon: BABYLON,
            debug: true,
            showFPS: true,
            silent: true,
            // chunkSize: 16,
            // chunkAddDistance: 6,
            chunkSize: 24,
            chunkAddDistance: 3,
            // chunkRemoveDistance: 3,
            // blockTestDistance: 20,
            // texturePath: 'textures/',
            playerStart: [128.5, 65, 128.5],        // change to spawn point
            // playerStart: [0, 4, 0],        // change to spawn point
            // playerHeight: 1.4,
            // playerWidth: 1.0,
            playerHeight: 1.6,
            // playerAutoStep: true,
            // useAO: true,
            // AOmultipliers: [ 0.93, 0.8, 0.5 ],
            // reverseAOmultiplier: 1.0,
        };

        this.noaEngine = noa_engine(opts);
        this.noaEngine.setPaused(!this.client.hasSpawned);     // pause the game until we are spawned

        this.registerBlocks();
        this.registerListeners();

        let noa = this.noaEngine;

        noa.rendering.getScene().getCameraByName('camera').fov = 1.25;

        const eid = noa.playerEntity;
        const dat = noa.entities.getPositionData(eid);
        const w = dat.width;
        const h = dat.height;

        const scene = noa.rendering.getScene();
        // const mesh = noa.BABYLON.Mesh.CreateBox('player', 1, scene);
        this.loadPlayer(scene, (mesh) => {

            let player = new Player({
                scene: scene,
                // Pass it the initial player color
                player_color: new BABYLON.Color4(0.0274, 0.4313, 0.4392, 0.99),
                // Pass it mesh height
                player_height: 1.6,

                BABYLON: BABYLON
            });

            let player_mesh = player.get_player_mesh();
            player_mesh.scaling.x = 0.45;
            player_mesh.scaling.y = 0.45;
            player_mesh.scaling.z = 0.45;

            // Add a player component to the player entity
            noa.entities.addComponent(noa.playerEntity, noa.entities.names.mesh, {
                mesh: player_mesh,
                offset: [0, 1, 0],
            });

            // Rotate player with camera
            scene.registerBeforeRender(function () {
                noa.entities.getMeshData(noa.playerEntity).mesh.rotation.y = noa.camera.heading;
                player.update_particles();
            });

            // Add Player movement animation
            document.onkeyup = function (e) {
                if (['87', '65', '83', '68', '37', '38', '39', '40'].indexOf(e.keyCode.toString()) > -1) {
                    if (player.is_walking()) {
                        player.stop_walking();
                    }
                }
            };

            document.onkeydown = function (e) {
                if (['87', '65', '83', '68', '37', '38', '39', '40'].indexOf(e.keyCode.toString()) > -1) {
                    if (!player.is_walking()) {
                        player.start_walking();
                    }
                }
            };

            // mesh.scaling.x = mesh.scaling.z = w;
            // mesh.scaling.y = h;

            // console.log(mesh.material);
            // (window as any).mat = mesh.material;

            // const offset = [0, h - 0.5, 0];

            // noa.entities.addComponent(eid, noa.entities.names.mesh, {
            //     mesh: mesh,
            //     // offset: offset
            // });

            noa.inputs.down.on('fire', function () {
                if (noa.targetedBlock) noa.setBlock(0, noa.targetedBlock.position)
            });

            noa.inputs.down.on('alt-fire', function () {
                if (noa.targetedBlock) {
                    noa.addBlock(2, noa.targetedBlock.adjacent)
                }
            });

            noa.inputs.bind('alt-fire', 'E');


            let zoom = 0;
            noa.on('tick', function (dt) {
                const scroll = noa.inputs.state.scrolly;
                if (scroll === 0) return;

                zoom += (scroll > 0) ? 1 : -1;
                if (zoom < 0) zoom = 0;
                if (zoom > 10) zoom = 10;
                noa.camera.zoomDistance = zoom;
            });


        })
    }

    private loadPlayer(scene, callback: (mesh) => void) {

        callback(null);

        // const mesh = this.noaEngine.BABYLON.Mesh.CreateBox('player', 1, scene);
        // if (callback) callback(mesh);

        // this.noaEngine.BABYLON.SceneLoader.ImportMesh("", "models/", "untitled.babylon", scene,
        //     (newMeshes, particleSystems, skeletons) => {
        //
        //         if (callback) callback(newMeshes[0]);
        //     });
    }

    private registerBlocks() {

        let textureURL = null;
        let brownish = [0.45, 0.36, 0.22];
        let greenish = [0.1, 0.8, 0.2];
        let black = [0.3, 0.3, 0.3];
        let gray = [0.45, 0.5, 0.45];
        let white = [0.95, 0.95, 0.95];
        this.noaEngine.registry.registerMaterial('dirt', brownish, textureURL);
        this.noaEngine.registry.registerMaterial('grass', greenish, textureURL);
        this.noaEngine.registry.registerMaterial('unknown', gray, textureURL);
        this.noaEngine.registry.registerMaterial('bedrock', gray, textureURL);
        this.noaEngine.registry.registerMaterial('snow', white, textureURL);

        this.noaEngine.registry.registerBlock(1, {material: 'dirt'});
        this.noaEngine.registry.registerBlock(2, {material: 'grass'});
        this.noaEngine.registry.registerBlock(3, {material: 'unknown'});
        this.noaEngine.registry.registerBlock(4, {material: 'bedrock'});
        this.noaEngine.registry.registerBlock(5, {material: 'snow'});

    }

    private registerListeners() {

        this.client.on(EventType.LocalPlayerSpawn, () => {

            this.noaEngine.setPaused(false);
        });

        let noa = this.noaEngine;
        let client = this.client;
        let map = {
            // blockId: noaId
            2: 2,       // grass
            3: 1,       // dirt
            7: 4,       // bedrock
            80: 5,      // snow

        };

        noa.world.on('worldDataNeeded', function (id, data, x, y, z) {

            let world = client.world;
            let spawnX = world.worldInfo.spawn.x;       // use for flipping blocks on the x-axis

            for (let i = 0; i < data.shape[0]; ++i) {
                for (let j = 0; j < data.shape[1]; ++j) {
                    for (let k = 0; k < data.shape[2]; ++k) {

                        // if (y + j == 1) data.set(i, j, k, 2);

                        // flip the x-axis across the spawn point
                        // (2 * originX) - x
                        let ax = 2 * spawnX - (x + i);

                        // if (ax == 130 && (y + j) == 63 && (z + k) == 130) {
                        //     data.set(i, j, k, 3);
                        //     continue;
                        // }

                        let blockId = world.getBlock(ax, y + j, z + k);
                        // It'd be cool if we use the same ID system

                        let id = blockId == 0 ? 0 : map[blockId];
                        if (id == undefined) id = 3;        // unknown

                        data.set(i, j, k, id);
                    }
                }
            }

            noa.world.setChunkData(id, data)
        });
    }

}
