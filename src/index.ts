import {EventType, LoginCredentials, MinecraftClient} from "@webpejs/network";
import {RenderEngine} from "./RenderEngine";

let client = new MinecraftClient(undefined, 19133);

client.on(EventType.PlayerLoginRequest, (cred: LoginCredentials) => {
    cred.displayName = 'WebNoaClient';
});
client.connect();


client.on(EventType.LocalPlayerSpawn, () => {
    setTimeout(function () {
        console.log('PlayerSpawn!');
        new RenderEngine(client).startEngine();
    }, 1000);

});
