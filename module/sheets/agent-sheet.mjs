import { DicePool } from "../rolls.mjs";

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

    async getData() {
        // Retrieve the data structure from the base sheet. You can inspect or log
        // the context variable to see the structure, but some key properties for
        // sheets are the actor object, the data object, whether or not it's
        // editable, the items array, and the effects array.
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actor = context.actor;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.system = actor.system;
        context.flags = actor.flags;

        if(actor.type == 'character') {
            this._prepareCharacterItems(context);
            if(context.system.playbook === '') {
                context.playbooks = game.items.filter(x => x.type === 'playbook');
            }
            const existing_skills = context.skills.map(s => s.name);
            context.skill_list = game.items.filter(x => x.type === 'skill' && !existing_skills.includes(x.system.name));
        
            context.conditionsA = ["Cold", "Haunted", "Obsessed", "Paranoid"];
            context.conditionsB = ["Reckless", "Soft", "Unstable", "Vicious"];
        }

        context.descMarkup = await TextEditor.enrichHTML(context.system.description, {async: true});

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
        html.find(".toggleList").click(this._toggleCondition.bind(this));
        html.find(".r-and-r").click(this._recuperate.bind(this));
    }
    async _selectLoad(event) {
        event.preventDefault();
        const newLoad = event.currentTarget.value;
        const updates = {_id: this.actor.id, system: { load: {selected: newLoad} }};
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
    
    async _toggleCondition(event) {
        event.preventDefault();
        const condition = $(event.currentTarget).text();
        const newVal = await this.actor.toggleCondition(condition);
    }

    async _setPlaybook(event) {
        event.preventDefault();
        const playbook = $(event.currentTarget).data("playbook");
        await this.actor.setPlaybook(playbook);
    }

    async stabilityRoll(pool) {
        const data = this.actor.system;
        const stability_dice = Math.min(data.derived.insight, data.derived.prowess, data.derived.resolve);
        const [rolls, zeromode, roll_status, r] = await pool.actionRoll(stability_dice);
        const [roll, critical] = pool.rollValue(rolls, zeromode);
        const results = {
            original_roll: r,
            rolls: rolls,
            roll_status: "success",
            resist_status: `Clear ${roll} stress`,
            zeromode: zeromode,
            action: 'stability'
        };
        await pool.displayResult(this.actor, results);
    }
    async _onRoll(event) {
        event.preventDefault();
        const pool = new DicePool();

        const action = $(event.currentTarget).data("action");
        if(action === 'stability') {
            await this.stabilityRoll(pool);
            return;
        }

        const is_resistance = ["resolve", "insight", "prowess"].includes(action);

        const data = this.actor.system;
        let dice_amount = 0;
        if(is_resistance){
            dice_amount = data.derived[action];
        }
        else{
            dice_amount = data.actions[action].value;
        }
        let [rolls, zeromode, roll_status, r] = await pool.actionRoll(dice_amount);
        let resist_status = "";
        if(is_resistance){
            [roll_status, resist_status] = pool.getResistanceRollStatus(rolls, zeromode);
        }
        const results = {
            original_roll: r,
            rolls: rolls,
            roll_status: roll_status,
            resist_status: resist_status,
            zeromode: zeromode,
            action: action
        };
        await pool.displayResult(this.actor, results);
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
                        const pool = new DicePool();
                        let [rolls, zeromode, roll_status, original_roll] = await pool.actionRoll(dice_amount);
                        const results = {
                            original_roll: original_roll,
                            rolls: rolls,
                            roll_status: roll_status,
                            resist_status: "",
                            zeromode: zeromode,
                            action: action
                        };
                        await pool.displayResult(this.actor, results);
                    }}
            },
            default: "confirm"
        });
        d.render(true);
    }

    _actionRoll(event) {
        const action = $(event.currentTarget).data("action");
        const data = this.actor.system;
        const base_dice = Number.parseInt(data.actions[action].value);
        const d = new Dialog({
            title: `${action} Roll`,
            content: `<form style='padding: 1em;'>
            <h1>Starting Dice: ${base_dice}</h1>
            <ul class="dice-mods">
            <li>Is someone taking 1 stress to aid you? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Does a playbook ability give +1d? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Are you pushing yourself (2 stress)? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
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
            <p ${data.derived.hurt ? "" : "hidden"}>Your level 1 harm reduces the effect level.</p>
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
                        const pool = new DicePool();
                        let [rolls, zeromode, roll_status, original_roll] = await pool.actionRoll(base_dice + extra_dice);
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
                        await pool.displayResult(this.actor, results);
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

    _prepareCharacterItems(context) {
        const gear = [];
        const playbook_gear = [];
        const abilities = [];
        const skills = [];
        const projects = [];

        for (let i of context.items) {
            switch (i.type) {
                case 'gear':
                    if(i.system.source === 'playbook') {
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
        await this.actor.createEmbeddedDocuments("Item", [{type:"project", name: name, system: {size: segments, progress: 0}}]);
    }

    async _recuperate(event) {
        event.preventDefault();
        let stress = this.actor.system.stress.value;
        stress = Math.max(0, stress - 2);
        // do we need healing?
        // tick the clock
        // move it down when it fills up
        const updates = {_id: this.actor.id, system: { stress: {value: stress }}};
        const updated = await this.actor.update(updates);
    }

}
