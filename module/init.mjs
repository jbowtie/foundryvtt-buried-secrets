import {SecretsActor} from "./documents/actor.mjs";
import {SecretsItem} from "./documents/item.mjs";
import {AgentSheet} from "./sheets/agent-sheet.mjs";
import {GenericItemSheet} from "./sheets/item-sheet.mjs";
import { RoleSheet } from "./sheets/role-sheet.mjs";
import { CrewSheet } from "./sheets/crew-sheet.mjs";
import { ClockSheet } from "./sheets/clock-sheet.mjs";
import { SquadSheet, ExpertSheet } from "./sheets/npc-sheet.mjs";

/*
 * Init Hook
 */

Hooks.once('init', function() {
    console.log(`Initializing system Buried Secrets`);
    // add properties to the global "game" object so you can find things easily
    // playbook objects (name, xptrigger, abilities, custom gear)
    // standard gear list (maybe)
    //create custom classes
    CONFIG.Actor.documentClass = SecretsActor;
    CONFIG.Item.documentClass = SecretsItem;
    //register custom sheets
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("buried-secrets", AgentSheet, {types: ["character"], makeDefault: true});
    Actors.registerSheet("buried-secrets", RoleSheet, {types: ["role"], makeDefault: true});
    Actors.registerSheet("buried-secrets", CrewSheet, {types: ["crew"], makeDefault: true});
    Actors.registerSheet("buried-secrets", SquadSheet, {types: ["squad"], makeDefault: true});
    Actors.registerSheet("buried-secrets", ExpertSheet, {types: ["expert"], makeDefault: true});
    Actors.registerSheet("buried-secrets", ClockSheet, {types: ["clock"], makeDefault: true});
    Actors.registerSheet("buried-secrets", ActorSheet, {types: ["npc"], makeDefault: true});

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("buried-secrets", GenericItemSheet, { makeDefault: true });
    //(maybe) preload templates
    //handlebars helpers
    Handlebars.registerHelper('checked2', function(value, test) {
        if (value == undefined) return '';
        return value==test ? 'checked' : '';
    });


    Handlebars.registerHelper('inventory', function(item, options) {
        let ret = "";
        const itemClass = item.system.equipped ? "fas" : "far";
        switch(item.system.load) {
            case 0:
                ret += `<i class="${itemClass} fa-square"></i> <i>${item.name}</i>`;
                break;
            case 1:
                ret += `<i class="${itemClass} fa-square"></i> ${item.name}`;
                break;
            case 2:
                ret += `<span class="connect"><i class="${itemClass} fa-square"></i>&#8211;<i class="${itemClass} fa-square"></i></span> ${item.name}`;
                break;
            case 3:
                ret += `<span class="connect"><i class="${itemClass} fa-square"></i>&#8211;<i class="${itemClass} fa-square"></i>&#8211;<i class="${itemClass} fa-square"></i></span> ${item.name}`;
                break;
        }
        return ret;
    });

    Handlebars.registerHelper('track', function(size, options) {
        let ret = "";

        for(var i = size; i > 0; i--) {
            ret += options.fn(this, {data: {index: i}});
        }
        return ret;
    });

    Handlebars.registerHelper('inList', function(items, list, options) {
        let ret = list.map(x =>
            {
                const itemClass = items.includes(x) ? "active" : "";
                return `<a class="${itemClass} toggleList">${x}</a>`;
            }
        ).join(" - ");
        return ret;
    });
});

/*
 * Ready Hook
 */

Hooks.once('ready', async function () {
    // after fully loaded
    if (!game.user.isGM) return;
    const crew = game.actors.filter(a => a.type === 'crew');
    if(crew.length > 0) {
        game.crew = crew[0];
    }
    else {
        game.crew = null;
    }
});
    // TODO: migration
/*    const gearUpdate = {data: {equipped: false}};
    //const abilityUpdate = {data: {chosen: false}};
    for (let i of game.items) {
        if(i.type == 'ability') {
            console.log(i);
            //const r = await _updateItem(i, gearUpdate);
        }
    }
    console.warn('MIGRATE EMBEDDED');
    for (let a of game.actors) {
        for (let i of a.getEmbeddedCollection("Item")) {
            if(i.type == 'ability') {
                console.log(i);
                //const r = await _updateItem(i, gearUpdate);
            }
        }
    }
});

async function _updateItem(item, updateData) {
    try {
        let result = await item.update(updateData);
        if (result.name) {
            console.log(`MIGRATION |  ${result.name} with result ${typeof (result) === "object"}`);
        } else {
            console.log(`MIGRATION |  No data migration needed with result ${typeof (result) === "object"}`);
        }
        return true;
    } catch (e) {
        ui.notifications.error(`MIGRATION |  Error during the migration of ${item.name} ! `);
        console.error(`MIGRATION |  Error ${e} during the migration of ${item.name} ! `);
        return false;
    }
}
*/
