export class ClockSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/clock-sheet.html",
            width: 320,
            height: 320,
        });
    }
    getData() {
        // Retrieve the data structure from the base sheet. You can inspect or log
        // the context variable to see the structure, but some key properties for
        // sheets are the actor object, the data object, whether or not it's
        // editable, the items array, and the effects array.
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = context.actor;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.system;
        context.flags = actorData.flags;

        return context;
    }
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find("input[type='radio']").change(this._onUpdate.bind(this));
    }

    async _onUpdate(event) {
        const newVal = event.currentTarget.value;
        console.log(newVal);
        this.updateToken(newVal);
    }

    async updateToken(progress) {
        let actor = this.document;
        const data = actor.system;
        const image = `systems/buried-secrets/assets/dog_blink_blue/${data.size}clock_${progress}.png`;
        // update associated tokens
        const tokens = actor.getActiveTokens();
        let update = [];
        let tokenObj = {};
        for (const t of tokens) {
        tokenObj = {
            _id: t.id,
            name: actor.name,
            img: image,
            actorLink: true
        };
        update.push(tokenObj);
        }
        await TokenDocument.updateDocuments(update, {parent: game.scenes.current});
        await actor.update( {
            img: image,
            token:{
                img: image,
                scale: 1,
                disposition: 0,
                displayName: 50,
                actorLink: true
            }
        } );
    }
}
