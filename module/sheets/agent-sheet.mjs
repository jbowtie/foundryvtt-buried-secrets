export class AgentSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/agent-sheet.html",
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

        if(actorData.type == 'character') {
            this._prepareCharacterItems(context);
            if(context.data.playbook === '') {
                context.playbooks = game.items.filter(x => x.type === 'playbook');
            }
            const existing_skills = context.skills.map(s => s.name);
            context.skill_list = game.items.filter(x => x.type === 'skill' && !existing_skills.includes(x.data.name));
        }

        return context;
    }
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".rollable").click(this._onRoll.bind(this));
        html.find(".agent-gear li").click(this._toggleGear.bind(this));
        html.find(".agent-powers span[data-ability]").click(this._toggleAbility.bind(this));
        // select playbook
        html.find(".select-playbook").click(this._setPlaybook.bind(this));
        // add/remove investigative skills
        html.find(".add-skill").click(this._showSkillSelect.bind(this));
        html.find(".cancel-skill").click(this._cancelSkillSelect.bind(this));
        html.find(".confirm-skill").click(this._confirmSkillSelect.bind(this));
    }

    async _cancelSkillSelect(event) {
        event.preventDefault();
        $('.skill-select').hide();
        $('.add-skill').show();
    }
    async _confirmSkillSelect(event) {
        event.preventDefault();
        const val = $('.skill-select select').val();
        if (val === '') {
            console.log("No skill selected");
            return;
        }
        console.log(`Wanted skill ${val}`);
        const item = game.items.getName(val);
        if(item) {
            const itemTemplate = item.toObject();
            await this.actor.createEmbeddedDocuments("Item", [itemTemplate]);

        } else {console.log('NO SUCH ITEM');}

        $('.skill-select').hide();
        $('.add-skill').show();
    }
    async _showSkillSelect(event) {
        event.preventDefault();
        $('.skill-select').show();
        $(event.currentTarget).hide();
    }

    async _toggleGear(event) {
        event.preventDefault();
        // figure out which item it is
        const itemId = $(event.currentTarget).data("item");
        //const load = $(event.currentTarget).data("load");
        const newVal = await this.actor.toggleGear(itemId);
    }

    async _toggleAbility(event) {
        event.preventDefault();
        const itemId = $(event.currentTarget).data("ability");
        const newVal = await this.actor.toggleAbility(itemId);
    }

    async _setPlaybook(event) {
        event.preventDefault();
        const playbook = $(event.currentTarget).data("playbook");
        await this.actor.setPlaybook(playbook);
    }

    async _onRoll(event) {
        event.preventDefault();

        let speaker = ChatMessage.getSpeaker(this.actor);
        const action = $(event.currentTarget).data("action");
        const data = this.actor.data.data;
        let dice_amount = data.actions[action].value;
        let zeromode = false;
        if (dice_amount < 0) { dice_amount = 0;}
        if (dice_amount <= 0) {
            dice_amount = 2;
            zeromode = true;
        }
        let r = new Roll( `${dice_amount}d6`, {} );

        await r.evaluate({async: true});
        let rolls = (r.terms)[0].results;
        let roll_status = this.getActionRollStatus(rolls, zeromode);
        let result = await renderTemplate("systems/buried-secrets/templates/secrets-roll.html", {
            rolls: rolls, 
            roll_status: roll_status, 
            zeromode: zeromode, 
            action: action});

        let messageData = {
            speaker: speaker,
            content: result,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            roll: r
        }

        await CONFIG.ChatMessage.documentClass.create(messageData, {});
    }

    getActionRollStatus(rolls, zeromode = false) {

        let sorted_rolls = rolls.map(i => i.result).sort();
        let roll_status;
        let use_die;
        let prev_use_die;

        if (zeromode) {
            use_die = sorted_rolls[0];
        } else {
            use_die = sorted_rolls[sorted_rolls.length - 1];
            if (sorted_rolls.length - 2 >= 0) {
                prev_use_die = sorted_rolls[sorted_rolls.length - 2]
            }
        }

        // 1,2,3 = failure
        if (use_die <= 3) {
            roll_status = "failure";
        } else if (use_die === 6) {
            // if 6 - check the prev highest one.
            // 6,6 = critical success
            if (prev_use_die && prev_use_die === 6) {
                roll_status = "critical-success";
            } else {
                // 6 = success
                roll_status = "success";
            }
        } else {
            // else (4,5) = partial success
            roll_status = "partial-success";
        }

        return roll_status;
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
}
