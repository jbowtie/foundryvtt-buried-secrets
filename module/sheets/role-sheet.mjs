
export class RoleSheet extends ActorSheet {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/role-sheet.html",
            width: 900,
            height: 600,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "mission"}]
        });
    }
    getData() {
        // Retrieve the data structure from the base sheet. You can inspect or log
        // the context variable to see the structure, but some key properties for
        // sheets are the actor object, the data object, whether or not it's
        // editable, the items array, and the effects array.
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = context.actor.data;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.data;
        context.flags = actorData.flags;
        
        const agents = game.actors.filter(s => s.data.type === 'character').map(a => {
            let harm = 0;
            if(a.data.data.harm.level1a || a.data.data.harm.level1b) harm = 1;
            if(a.data.data.harm.level2a || a.data.data.harm.level2b) harm = 2;
            if(a.data.data.harm.level3) harm = 3;
            return {
                name: a.name,
                playbook: a.data.data.playbook,
                stress: a.data.data.stress.value,
                status: a.data.data.status,
                skills: a.items.filter(x => x.type==='skill').map(s => s.name).join(', '),
                harm: harm
            }
        });
        context.agents = agents;

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        // select role
        html.find(".select-role").click(this._setRole.bind(this));
    }

    async _setRole(event) {
        event.preventDefault();
        const role = $(event.currentTarget).data("role");
        const updates = {_id: this.actor.id, data: { role: role }};
        const updated = await this.actor.update(updates);
    }

}