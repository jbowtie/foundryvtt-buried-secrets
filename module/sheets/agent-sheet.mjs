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
        html.find(".action-roll").click(this._actionRoll.bind(this));
        html.find(".simple-roll").click(this._simpleRoll.bind(this));
        html.find(".agent-gear li").click(this._toggleGear.bind(this));
        html.find(".agent-powers span[data-ability]").click(this._toggleAbility.bind(this));
        // select playbook
        html.find(".select-playbook").click(this._setPlaybook.bind(this));
        // add/remove investigative skills
        html.find(".add-skill").click(this._showSkillSelect.bind(this));
        html.find(".cancel-skill").click(this._cancelSkillSelect.bind(this));
        html.find(".remove-skill").click(this._removeSkill.bind(this));
        html.find(".confirm-skill").click(this._confirmSkillSelect.bind(this));
        //select load
        html.find(".agent-gear .button-group button").click(this._selectLoad.bind(this));
        // add/remove/update projects
        html.find(".segment").click(this._updateProjectProgress.bind(this));
        html.find(".create-project button").click(this._addProject.bind(this));
        html.find(".remove-project").click(this._removeProject.bind(this));
    }
    async _selectLoad(event) {
        event.preventDefault();
        const newLoad = event.currentTarget.value;
        const updates = {_id: this.actor.id, data: { load: {selected: newLoad} }};
        const updated = await this.actor.update(updates);
        const group = event.currentTarget.parentElement;
        $(group.children).removeClass("active");
        event.currentTarget.classList.add("active");
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

    async _removeSkill(event) {
        event.preventDefault();
        const dl = $(event.currentTarget).parents("dl");
        const itemId = $(event.currentTarget).data("skill");
        this.actor.deleteItem(itemId);
        dl.slideUp(200, () => this.render(false));
        $('.add-skill').show();
    }

    async _toggleGear(event) {
        event.preventDefault();
        // figure out which item it is
        const itemId = $(event.currentTarget).data("item");
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

    async stabilityRoll() {
        const data = this.actor.data.data;
        const stability_dice = Math.min(data.derived.insight, data.derived.prowess, data.derived.resolve);
        const [rolls, zeromode, roll_status, r] = await this._performRoll(stability_dice);
        const [roll, critical] = this.rollValue(rolls, zeromode);
        const results = {
            original_roll: r,
            rolls: rolls,
            roll_status: "success",
            resist_status: `Clear ${roll} stress`,
            zeromode: zeromode,
            action: 'stability'
        };
        await this._displayRollResult(results);
    }
    async _onRoll(event) {
        event.preventDefault();

        const action = $(event.currentTarget).data("action");
        if(action === 'stability') {
            await this.stabilityRoll();
            return;
        }

        const is_resistance = ["resolve", "insight", "prowess"].includes(action);

        const data = this.actor.data.data;
        let dice_amount = 0;
        if(is_resistance){
            dice_amount = data.derived[action];
        }
        else{
            dice_amount = data.actions[action].value;
        }
        let [rolls, zeromode, roll_status, r] = await this._performRoll(dice_amount);
        let resist_status = "";
        if(is_resistance){
            [roll_status, resist_status] = this.getResistanceRollStatus(rolls, zeromode);
        }
        const results = {
            original_roll: r,
            rolls: rolls,
            roll_status: roll_status,
            resist_status: resist_status,
            zeromode: zeromode,
            action: action
        };
        await this._displayRollResult(results);
    }
    async _displayRollResult(results) {
        let speaker = ChatMessage.getSpeaker(this.actor);
        let message = await renderTemplate("systems/buried-secrets/templates/secrets-roll.html", {
            rolls: results.rolls, 
            roll_status: results.roll_status, 
            resist_status: results.resist_status,
            zeromode: results.zeromode, 
            action: results.action,
            position: results.position,
            effect: results.effect
        });

        let messageData = {
            speaker: speaker,
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            roll: results.original_roll
        }

        await CONFIG.ChatMessage.documentClass.create(messageData, {});
    }

    async _performRoll(dice_amount) {
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
        return [rolls, zeromode, roll_status, r];
    }

    _simpleRoll(event) {
        const action = $(event.currentTarget).data("action");

        const d = new Dialog({
            title: `${action} Roll`,
            content: `<form style='padding: 1em;'>
            <label style='display:block;'>How many dice?</label>
            <select name="dice_amount">
                ${[0,1,2,3,4,5].map(n => `<option value='${n}'>${n}</option>`)}
            </select>
            </form>`,
            buttons: {
                cancel: {icon:"<i class='fas fa-times'></i>", label: "Cancel"},
                confirm: {
                    icon:"<i class='fas fa-dice'></i>",
                    label: "Roll!",
                    callback: async (html) => {
                        const dice_amount = parseInt(html.find('[name="dice_amount"]')[0].value);
                        let [rolls, zeromode, roll_status, original_roll] = await this._performRoll(dice_amount);
                        const results = {
                            original_roll: original_roll,
                            rolls: rolls,
                            roll_status: roll_status,
                            resist_status: "",
                            zeromode: zeromode,
                            action: action
                        };
                        await this._displayRollResult(results);
                    }}
            },
            default: "confirm"
        });
        d.render(true);
    }

    _actionRoll(event) {
        const action = $(event.currentTarget).data("action");
        const data = this.actor.data.data;
        const base_dice = Number.parseInt(data.actions[action].value);
        const d = new Dialog({
            title: `${action} Roll`,
            content: `<form style='padding: 1em;'>
            <h1>Starting Dice: ${base_dice}</h1>
            <ul class="dice-mods">
            <li>Is someone aiding you? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Does a playbook ability give +1d? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Are you pushing yourself? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Did you take a Devil's Bargain? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Do you have Level 2 harm? <button role="switch" aria-checked="${data.derived.wounded}" data-mod="-1" disabled="true"><span>yes</span><span>no</span></button></li>
            </ul>
            <h3>Position</h3>
            <div class="button-group position" role="group" aria-label="Position">
            <button value="controlled">Controlled</button>
            <button class="active" value="risky">Risky</button>
            <button value="desperate">Desperate</button>
            </div>
            <h3>Effect</h3>
            <div class="button-group effect" role="group" aria-label="Effect">
            <button value="none">No Effect</button>
            <button value="limited">Limited</button>
            <button value="standard" class="active">Standard</button>
            <button value="great">Great</button>
            </div>
            </form>`,
            buttons: {
                cancel: {icon:"<i class='fas fa-times'></i>", label: "Cancel"},
                confirm: {
                    icon:"<i class='fas fa-dice'></i>",
                    label: "Roll!",
                    callback: async (html) => {
                        const mods = html.find('button[aria-checked="true"]');
                        let extra_dice = 0;
                        mods.each(e => {
                            const el = mods[e];
                            if('mod' in el.dataset)
                            {
                                const val = Number.parseInt(el.dataset.mod);
                                extra_dice += val;
                            }
                            else
                            {
                                extra_dice += 1;
                            }
                        });
                        let [rolls, zeromode, roll_status, original_roll] = await this._performRoll(base_dice + extra_dice);
                        const position = html.find('.position button.active')[0].value;
                        const effect = html.find('.effect button.active')[0].value;
                        const results = {
                            original_roll: original_roll,
                            rolls: rolls,
                            roll_status: roll_status,
                            resist_status: "",
                            zeromode: zeromode,
                            action: action,
                            position: position,
                            effect: effect
                        };
                        await this._displayRollResult(results);
                    }}
            },
            render: html => {
                $(".dice-mods button").on("click", e => {
                    let el = e.currentTarget;

                    if (el.getAttribute("aria-checked") == "true") {
                        el.setAttribute("aria-checked", "false");
                    } else {
                        el.setAttribute("aria-checked", "true");
                    }
                });
                $(".button-group").on("click", "button", e => {
                    const group = e.currentTarget.parentElement;
                    $(group.children).removeClass("active");
                    e.currentTarget.classList.add("active");
                });
            },
            default: "confirm"
        });
        d.render(true);
    }

    rollValue(rolls, zeromode = false) {
        let sorted_rolls = rolls.map(i => i.result).sort();
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

        let critical = false;

        if (use_die === 6) {
            // if 6 - check the prev highest one.
            // 6,6 = critical success
            if (prev_use_die && prev_use_die === 6) {
                critical = true;
            }
        }
        return [use_die, critical];
    }

    getResistanceRollStatus(rolls, zeromode = false) {
        let [use_die, critical] = this.rollValue(rolls, zeromode);
        let stress = 6 - use_die;
        let roll_status = "success";
        let resist_status = `Take ${stress} stress`;
        if (critical) {
            roll_status = "critical-success";
            resist_status = "Clear 1 stress";
        }

        return [roll_status, resist_status];
    }

    getActionRollStatus(rolls, zeromode = false) {

        let [use_die, critical] = this.rollValue(rolls, zeromode);
        let roll_status;

        // 1,2,3 = failure
        if (use_die <= 3) {
            roll_status = "failure";
        } else if (use_die === 6) {
            // if 6 - check the prev highest one.
            // 6,6 = critical success
            if (critical) {
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
        const projects = [];

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
                case 'project':
                    projects.push(i);
                    break;
            }
        }

        context.gear = gear;
        context.playbook_gear = playbook_gear;
        context.abilities = abilities;
        context.skills = skills;
        context.projects = projects;
    }

    async _updateProjectProgress(event) {
        event.preventDefault();
        const progress = $(event.currentTarget).data("value");
        const project = $(event.currentTarget).parents(".clock").data("id");
        await this.actor.updateProjectProgress(project, progress);
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
