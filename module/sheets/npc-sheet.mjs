
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
        let actions = pb.data.data.actions;
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
        const updates = {_id: this.actor.id, data: { playbook: playbook, actions: new_actions, rookies: rookies }};
        const updated = await this.actor.update(updates);
    }
    async _toggleCondition(event) {
        event.preventDefault();
        const condition = $(event.currentTarget).text();
        const newVal = await this.actor.toggleCondition(condition);
    }
    // TODO: refactor commmon roll methods
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
    // TODO: refactor commmon roll methods
    _actionRoll(event) {
        const action = $(event.currentTarget).data("action");
        const data = this.actor.data.data;
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

}