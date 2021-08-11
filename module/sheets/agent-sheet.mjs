export class AgentSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["secrets", "sheet", "actor"],
            template: "systems/buried-secrets/templates/actor/agent-sheet.html",
            width: 850,
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
        return context;
    }
  /** @override */
	activateListeners(html) {
        super.activateListeners(html);
        html.find(".rollable").click(this._onRoll.bind(this));
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
}
