export class CrewSheet extends ActorSheet {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/crew-sheet.html",
            width: 900,
            height: 600,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "mission"}]
        });
    }
    getData() {
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = context.actor;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.system;
        context.flags = actorData.flags;
        this._prepareCharacterItems(context);

        context.reputationsA = ["Ambitious", "Brutal", "Daring", "Honorable"];
        context.reputationsB = ["Professional", "Savvy", "Subtle", "Strange"];
        return context;
    }
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".agent-powers span[data-ability]").click(this._toggleAbility.bind(this));
        html.find(".upgrades input[type='checkbox']").click(this._toggleUpgrade.bind(this))
        html.find(".toggleList").click(this._toggleReputation.bind(this));
    }
    _prepareCharacterItems(context) {
        const gear = [];
        const playbook_gear = [];
        const abilities = [];
        const skills = [];

        for (let i of context.items) {
            switch (i.type) {
                case 'gear':
                    if(i.data.source === 'playbook') {
                        playbook_gear.push(i);
                    } else {
                        gear.push(i);
                    }
                    break;
                case 'ability':
                    abilities.push(i);
                    break;
                case 'skill':
                    skills.push(i);
                    break;
            }
        }

        context.gear = gear;
        context.playbook_gear = playbook_gear;
        context.abilities = abilities;
        context.skills = skills;
    }
    async _toggleAbility(event) {
        event.preventDefault();
        const itemId = $(event.currentTarget).data("ability");
        const newVal = await this.actor.toggleAbility(itemId);
    }
    
    async _toggleReputation(event) {
        event.preventDefault();
        const condition = $(event.currentTarget).text();
        const newVal = await this.actor.toggleReputation(condition);
    }

    async _toggleUpgrade(event) {
        const item = event.currentTarget.name;
        const val = event.currentTarget.checked;
        console.log(`${item} is ${val}`);

        game.actors.map(a => {
            a.toggleCrewUpgrade(item, val);
        });
    }
}