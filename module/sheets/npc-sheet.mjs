import { DicePool } from "../rolls.mjs";

export class SquadSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/squad-sheet.html",
            width: 900,
            height: 600,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "mission"}]
        });
    }
    getData() {
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = context.actor.data;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.data;
        context.flags = actorData.flags;

        if(context.data.playbook === '') {
            context.playbooks = game.items.filter(x => x.type === 'squadbook');
        }

        context.edges = ["Fearsome", "Independent", "Loyal", "Tenacious"];
        context.flaws = ["Cruel", "Principled", "Unreliable", "Wild"];

        return context;
    }
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".select-playbook").click(this._setPlaybook.bind(this));
        html.find(".toggleList").click(this._toggleCondition.bind(this));
        html.find(".action-roll").click(this._actionRoll.bind(this));
        html.find(".kill-rookie").click(this._killRookie.bind(this));
        html.find(".promote-rookie").click(this._promoteRookie.bind(this));
        html.find(".r-and-r").click(this._recuperate.bind(this));
        html.find(".add-xp").click(this._addXP.bind(this));
        html.find(".add-harm").click(this._addHarm.bind(this));
    }
    async _setPlaybook(event) {
        event.preventDefault();
        const playbook = $(event.currentTarget).data("playbook");
        let pb = game.items.getName(playbook);
        if (!pb) {
            console.log("no such playbook");
            return;
        }
        // set the actions
        let actions = pb.system.actions;
        let new_actions = {};
        for (const act in actions)
        {
            new_actions[act] = {"value": actions[act]};
        }
        console.log(new_actions);
        // create rookies
        let rookies = [];
        for(let i = 0; i < 6; i++)
        {
            let rookie = {
                name: `${this.actor.name} ${i + 1}`,
                xp: {min: 0, value: 0, max: 6},
                harm: {min: 0, value: 0, max: 3},
            };
            rookies.push(rookie);
        }
        const updates = {_id: this.actor.id, system: { playbook: playbook, actions: new_actions, rookies: rookies }};
        const updated = await this.actor.update(updates);
    }
    async _addXP(event) {
        let rookies = this.actor.system.rookies;
        let newRookies = rookies.map(r =>{
            let rookie = {name: r.name, xp: r.xp, harm: r.harm};
            if (rookie.xp.value < rookie.xp.max) {
                rookie.xp.value = rookie.xp.value + 1;
            }
            return rookie;
        });
        const updates = {_id: this.actor.id, system: { rookies: newRookies }};
        const updated = await this.actor.update(updates);
    }
    async _addHarm(event) {
        let rookies = this.actor.system.rookies;
        let newRookies = rookies.map(r =>{
            let rookie = {name: r.name, xp: r.xp, harm: r.harm};
            if (rookie.harm.value < rookie.harm.max) {
                rookie.harm.value = rookie.harm.value + 1;
            }
            return rookie;
        });
        const updates = {_id: this.actor.id, system: { rookies: newRookies }};
        const updated = await this.actor.update(updates);
    }
    async _recuperate(event) {
        let rookies = this.actor.system.rookies;
        let newRookies = rookies.map(r =>{
            let rookie = {name: r.name, xp: r.xp, harm: r.harm};
            if (rookie.harm.value > rookie.harm.min) {
                rookie.harm.value = rookie.harm.value - 1;
            }
            return rookie;
        });
        let stress = this.actor.system.stress.value;
        stress = Math.max(0, stress - 2);
        const updates = {_id: this.actor.id, system: { rookies: newRookies, stress: {value: stress }}};
        const updated = await this.actor.update(updates);
    }
    async _promoteRookie(event) {
        const index = $(event.currentTarget).parents("tr").data("agent");
        console.log(`promoting rookie ${index}`)
        const actorData = this.actor.system;
        let rookies = actorData.rookies;
        const rookie = rookies[Number(index)];
        // dialog: select a skill
        // on confirm, create a new expert, delete the rookie
      let data = {
        name: rookie.name,
        img: "systems/band-of-blades/styles/assets/icons/rookie.svg",
        type: "expert",
        token: {
          img: "systems/band-of-blades/styles/assets/icons/rookie.svg",
          actorLink: true,
          name: rookie.name,
          displayName: 50
        },
        data: {
          conditions: actorData.conditions,
          actions: actorData.actions,
        }
      }
      // TODO: add selected skill!
      data.items = [];
      await Actor.createDocuments([data]);
      await this._removeRookie(Number(index));
    }
    async _killRookie(event) {
        const index = $(event.currentTarget).parents("tr").data("agent");
        console.log(`killing rookie ${index}`)
        await this._removeRookie(Number(index));
    }
    async _removeRookie(index) {
        let rookies = this.actor.system.rookies;
        rookies.splice(index, 1);
        const updates = {_id: this.actor.id, system: { rookies: rookies }};
        const updated = await this.actor.update(updates);
    }
    async _toggleCondition(event) {
        event.preventDefault();
        const condition = $(event.currentTarget).text();
        const newVal = await this.actor.toggleCondition(condition);
    }

    _actionRoll(event) {
        const action = $(event.currentTarget).data("action");
        const data = this.actor.system;
        let base_dice = 0;
        if(action !== 'other')
            base_dice = data.elite ? 2 : 1;
        const d = new Dialog({
            title: `${action} Roll`,
            content: `<form style='padding: 1em;'>
            <h1>Starting Dice: ${base_dice}</h1>
            <ul class="dice-mods">
            <li>Is someone aiding you? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Does a crew ability give +1d? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
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
                        // todo: toggle button for EACH rookie
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

}
export class ExpertSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/expert-sheet.html",
            width: 900,
            height: 600,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "mission"}]
        });
    }
    getData() {
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = context.actor.data;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.data;
        context.flags = actorData.flags;

        context.edges = ["Fearsome", "Independent", "Loyal", "Tenacious"];
        context.flaws = ["Cruel", "Principled", "Unreliable", "Wild"];
        this._prepareCharacterItems(context);
        const existing_skills = context.skills.map(s => s.name);
        context.skill_list = game.items.filter(x => x.type === 'skill' && !existing_skills.includes(x.data.name));

        return context;
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
    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".toggleList").click(this._toggleCondition.bind(this));
        html.find(".action-roll").click(this._actionRoll.bind(this));
        html.find(".add-skill").click(this._showSkillSelect.bind(this));
        html.find(".cancel-skill").click(this._cancelSkillSelect.bind(this));
        html.find(".remove-skill").click(this._removeSkill.bind(this));
        html.find(".confirm-skill").click(this._confirmSkillSelect.bind(this));
    }
    async _toggleCondition(event) {
        event.preventDefault();
        const condition = $(event.currentTarget).text();
        const newVal = await this.actor.toggleCondition(condition);
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
    _actionRoll(event) {
        const action = $(event.currentTarget).data("action");
        const data = this.actor.system;
        let base_dice = 0;
        if(action !== 'other')
            base_dice = data.elite ? 2 : 1;
        const d = new Dialog({
            title: `${action} Roll`,
            content: `<form style='padding: 1em;'>
            <h1>Starting Dice: ${base_dice}</h1>
            <ul class="dice-mods">
            <li>Is someone aiding you? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Are you pushing yourself? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Does a crew ability give +1d? <button role="switch" aria-checked="false"><span>yes</span><span>no</span></button></li>
            <li>Do you have Level 2 harm? <button role="switch" aria-checked="${data.harm.level2}" data-mod="-1" disabled="true"><span>yes</span><span>no</span></button></li>
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
                        // todo: toggle button for EACH rookie
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

}