import {SecretsActor} from "./documents/actor.mjs";
import {SecretsItem} from "./documents/item.mjs";
import {AgentSheet} from "./sheets/agent-sheet.mjs";
import {GenericItemSheet} from "./sheets/item-sheet.mjs";

/*
 * Init Hook
 */

Hooks.once('init', function() {
    console.log(`Initializing system Buried Secrets`);
    // add properties to the global "game" object so you can find things easily
    // playbook objects (name, xptrigger, abilities, custom gear)
    // standard gear list (maybe)
    game.secrets = {SecretsActor};
    //create custom classes
    CONFIG.Actor.documentClass = SecretsActor;
    CONFIG.Item.documentClass = SecretsItem;
    //register custom sheets
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("buried-secrets", AgentSheet, {types: ["character"], makeDefault: true});
    Actors.registerSheet("buried-secrets", ActorSheet, {types: ["role"], makeDefault: true});
    Actors.registerSheet("buried-secrets", ActorSheet, {types: ["crew"], makeDefault: true});
    Actors.registerSheet("buried-secrets", ActorSheet, {types: ["npc"], makeDefault: true});

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("buried-secrets", GenericItemSheet, { makeDefault: true });
    //(maybe) preload templates
    //handlebars helpers
    Handlebars.registerHelper('checked', function(value, test) {
        if (value == undefined) return '';
        return value==test ? 'checked' : '';
    });

    //Less than comparison
    Handlebars.registerHelper('lteq', (a, b) => {
        return (a <= b);
    });

    Handlebars.registerHelper('gteq', (a, b) => {
        return (a >= b);
    });

    Handlebars.registerHelper('equal', (a, b) => {
        return (a === b);
    });
});

/*
 * Ready Hook
 */

Hooks.once('ready', function() {
    // after fully loaded
});
