
export class SecretsActor extends Actor {
    /** @override */
    static async create(data, options={}) {

        data.token = data.token || {};

        // For Crew and Character set the Token to sync with charsheet.
        switch (data.type) {
            case 'character':
            case 'npc':
                //case '\uD83D\uDD5B clock':
                data.token.actorLink = true;
                break;
        }

        return super.create(data, options);
    }

    /**
     * @override
     * Augment the basic actor data with additional dynamic data. Typically,
     * you'll want to handle most of your calculated/derived data in this step.
     * Data calculated in this step should generally not exist in template.json
     * (such as ability modifiers rather than ability scores) and should be
     * available both inside and outside of character sheets (such as if an actor
    * is queried and has a roll executed directly from it).
    */
    prepareDerivedData() {
        const actorData = this.data;
        const data = actorData.data;
        // for type=character: derive attributes (insight, prowess, resolve)
        if(actorData.type === 'character') {
            this.prepareAgentData(data);
        }

    }

    prepareAgentData(data) {
        //console.log("checking playbook");
        //if (data.playbook === '') return;
        //this.setPlaybook(data.playbook);
    }

    async setPlaybook(playbook) {
        let pb = game.items.getName(playbook);
        if (!pb) {
            console.log("no such playbook");
            return;
        }
        await this.addPlaybookAbilities(pb);
        await this.addStandardGear();
        await this.addPlaybookGear(pb);
        let actions = pb.data.data.actions;
        let new_actions = {};
        for (const act in actions)
        {
            new_actions[act] = {"value": actions[act]};
        }
        console.log(new_actions);
        const updates = {_id: this.id, data: { playbook: playbook, xp_trigger: pb.data.data.xp_trigger, actions: new_actions }};
        const updated = await this.update(updates);
    }

    async addPlaybookAbilities(pb) {
        let existing_abilities = this.items
            .filter( a => a.type === 'ability' )
            .map( e => { return e.data.name } );
        let desired_abilities = pb.data.data.abilities.split(',')
            .filter(x => !existing_abilities.includes(x));
            //.reverse(); // seems to reorder items otherwise
        let items_to_add = [];
        for (const ability of desired_abilities)
        {
            let item = game.items.getName(ability);
            if(item)
                items_to_add.push(item.toObject());
        }
        await this.createEmbeddedDocuments( "Item", items_to_add );
    }

    async addPlaybookGear(pb) {
        let existing_gear = this.items
            .filter( a => a.type === 'gear' )
            .map( e => { return e.data.name } );
        let desired_gear = pb.data.data.gear.split(',')
            .filter(x => !existing_gear.includes(x))
            .reverse(); // seems to reorder items otherwise
        let items_to_add = [];
        let sort = 100;
        for (const gearName of desired_gear)
        {
            const item = game.items.getName(gearName);
            if(item) {
                const item_template = item.toObject();
                item_template.sort = sort;
                item_template.data.source = "playbook";
                items_to_add.push(item_template);
            }
            sort = sort + 100;
        }
        await this.createEmbeddedDocuments( "Item", items_to_add );
    }

    async addStandardGear() {
        let folder = await game.folders.find( f => f.name === "Standard Gear");
        if(folder === undefined) {
            console.warn("Could not find standard gear folder!");
            return;
        }
        let existing_gear = this.items
            .filter( a => a.type === 'gear' )
            .map( e => { return e.data.name } );
        let desired_gear = folder.contents
            .filter(x => !existing_gear.includes(x.name));

        let items_to_add = [];
        for (const item of desired_gear) {
            //console.log(`${item.name} - ${item.data.sort}`);
            const item_template = item.toObject();
            items_to_add.push(item_template);
        }
        await this.createEmbeddedDocuments( "Item", items_to_add );
    }

    async toggleGear(itemId) {
        let item = this.items.find(i => i.id === itemId);
        if (item.type !== 'gear'){
            console.error("Cannot equip ${item.name} as gear!");
            return false;
        }
        const itemData = item.data;
        const newVal = !itemData.data.equipped;
        //console.log(`Item ${item.name} is ${itemData.data.equipped}`);
        const toggle = {_id: itemId, data: {equipped: newVal}};
        await item.update(toggle);
        return newVal;
    }


    async toggleAbility(itemId) {
        let item = this.items.find(i => i.id === itemId);
        if (item.type !== 'ability'){
            console.error("Cannot choose ${item.name} as ability!");
            return false;
        }
        const itemData = item.data;
        const newVal = !itemData.data.chosen;
        //console.log(`Item ${item.name} is ${itemData.data.chosen}`);
        const toggle = {_id: itemId, data: {chosen: newVal}};
        await item.update(toggle);
        return newVal;
    }
  /** @override */
   /* _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        if(changed.hasOwnProperty('playbook')) {
            console.log(changed.playbook);
        }
    }*/
}
