
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
        
        context.projects = context.items.filter(i => i.type === 'project')
            .map(p => { return {id: p._id, name: p.name, size: p.data.size, progress: p.data.progress}; });

        
        const agents = game.actors.filter(s => s.data.type === 'character').map(a => {
            let harm = 0;
            if(a.data.data.harm.level1a || a.data.data.harm.level1b) harm = 1;
            if(a.data.data.harm.level2a || a.data.data.harm.level2b) harm = 2;
            if(a.data.data.harm.level3) harm = 3;
            let status = a.data.data.status || "available";
            return {
                id: a.id,
                name: a.name,
                playbook: a.data.data.playbook,
                stress: a.data.data.stress.value,
                status: status,
                skills: a.items.filter(x => x.type==='skill').map(s => s.name).join(', '),
                harm: harm
            }
        });
        context.agents = agents;
        const squads = game.actors.filter(s => s.data.type === 'squad').map(a => {
            let status = a.data.data.status || "available";
            let skills = Object.keys(a.data.data.actions)
                .filter(x => a.data.data.actions[x].value > 0)
                .map(x => x.capitalize());
            return {
                id: a.id,
                name: a.name,
                playbook: a.data.data.playbook,
                stress: a.data.data.stress.value,
                status: status,
                skills: skills.join(', '),
                rookies: a.data.data.rookies.length
            }
        });
        context.squads = squads;
        context.crew = game.crew;

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        // select role
        html.find(".select-role").click(this._setRole.bind(this));
        html.find(".agent-status button").click(this._setAgentStatus.bind(this));
        html.find(".projects .clock input[type='radio']").change(this._updateProjectProgress.bind(this));
        html.find(".create-project button").click(this._addProject.bind(this));
        html.find(".remove-project").click(this._removeProject.bind(this));
    }

    async _updateProjectProgress(event) {
        event.preventDefault();
        const progress = event.currentTarget.value;
        const project = $(event.currentTarget).parents(".clock").data("id");
        let item = this.actor.items.find(i => i.id === project);
        const updates = {_id: project, data: { progress: progress }};
        await item.update(updates);
    }

    async _setRole(event) {
        event.preventDefault();
        const role = $(event.currentTarget).data("role");
        const updates = {_id: this.actor.id, data: { role: role }};
        const updated = await this.actor.update(updates);
    }

    async _setAgentStatus(event) {
        event.preventDefault();
        const status = event.currentTarget.value;
        const agent = $(event.currentTarget).parents("tr").data("agent");
        const actor = game.actors.get(agent);
        const updates = {_id: actor.id, data: { status: status }};
        console.log(updates);
        const updated = await actor.update(updates);
        const group = event.currentTarget.parentElement;
        $(group.children).removeClass("active");
        event.currentTarget.classList.add("active");
    }
    async _removeProject(event) {
        event.preventDefault();
        const dl = $(event.currentTarget).parents(".project-card");
        const itemId = $(event.currentTarget).data("project");
        this.actor.deleteItem(itemId);
        dl.slideUp(200, () => this.render(false));
    }
    async _addProject(event) {
        event.preventDefault();
        const segments = $('.create-project select').val();
        const name = $('.create-project input').val();
        if(!name) return;
        await this.actor.createEmbeddedDocuments("Item", [{type:"project", name: name, data: {size: segments, progress: 0}}]);
    }

}